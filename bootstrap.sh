#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

K8S_NAMESPACE="order-event-platform"
STORAGE_NAMESPACE="storage"
OBSERVABILITY_NAMESPACE="observability"
GRAFANA_DASHBOARDS_DIR="${SCRIPT_DIR}/infra/k8s/observability/grafana/dashboards"

MONGO_HOST="${MONGO_HOST:-127.0.0.1}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_RS_NAME="${MONGO_RS_NAME:-rs0}"
MONGO_RS_HOST="${MONGO_RS_HOST:-}"

NATS_HOST="${NATS_HOST:-127.0.0.1}"
NATS_PORT="${NATS_PORT:-4222}"

SECRETS_DIR="${SCRIPT_DIR}/.bootstrap-secrets"

AUTH_DB="auth_db"
AUTH_DB_USER="auth_svc"
AUTH_DB_K8S_SECRET="auth-service-db-secret"

INVENTORY_DB="inventory_db"
INVENTORY_DB_USER="inventory_svc"
INVENTORY_DB_K8S_SECRET="inventory-service-db-secret"

JWT_PRIVATE_KEY_NAME="private.pem"
JWT_K8S_SECRET="auth-service-jwt-private-key-secret"

JWT_PUBLIC_KEY_NAME="public.pem"
JWT_PUBLIC_CONFIGMAP="jwt-public-key"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
    echo
    echo "==> $*"
}

error() {
    echo
    echo "ERROR: $*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || \
        error "'$1' is required but was not found."
}

# ---------------------------------------------------------------------------
# Configuration validation
# ---------------------------------------------------------------------------

MONGO_ADMIN_USER="${MONGO_ADMIN_USER:-}"
MONGO_ADMIN_PASSWORD="${MONGO_ADMIN_PASSWORD:-}"

if [[ -z "$MONGO_ADMIN_USER" ]]; then
    error "MONGO_ADMIN_USER is required."
fi

if [[ -z "$MONGO_ADMIN_PASSWORD" ]]; then
    error "MONGO_ADMIN_PASSWORD is required."
fi

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------

mongo_uri() {
    echo "mongodb://${MONGO_ADMIN_USER}:${MONGO_ADMIN_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/admin?directConnection=true"
}

mongo_shell() {
    mongosh "$(mongo_uri)" --quiet "$@"
}

wait_for_mongo() {
    log "Waiting for MongoDB..."

    for _ in $(seq 1 30); do
        if mongo_shell \
            --eval "db.adminCommand({ ping: 1 }).ok" \
            >/dev/null 2>&1; then

            log "MongoDB is reachable."
            return
        fi

        sleep 1
    done

    error "MongoDB is not reachable at ${MONGO_HOST}:${MONGO_PORT}."
}

replica_set_status() {
    mongo_shell \
        --eval '
            try {
                const status = db.adminCommand({
                    replSetGetStatus: 1
                });

                if (status.ok !== 1) {
                    print("invalid");
                } else if (status.set !== "'"${MONGO_RS_NAME}"'") {
                    print("wrong-set");
                } else if (
                    status.members.some(m => m.stateStr === "PRIMARY")
                ) {
                    print("ready");
                } else {
                    print("no-primary");
                }
            } catch (e) {
                print("not-initialized");
            }
        '
}

initialize_replica_set() {
    if [[ -z "$MONGO_RS_HOST" ]]; then
        error "MONGO_RS_HOST is required to initialize the MongoDB replica set."
    fi

    log "Initializing MongoDB replica set '${MONGO_RS_NAME}'..."

    mongo_shell \
        --eval "
            rs.initiate({
                _id: '${MONGO_RS_NAME}',
                members: [
                    {
                        _id: 0,
                        host: '${MONGO_RS_HOST}'
                    }
                ]
            });
        "
}

ensure_replica_set() {
    log "Checking MongoDB replica set '${MONGO_RS_NAME}'..."

    local status

    status="$(replica_set_status)"

    case "$status" in

        ready)
            log "Replica set '${MONGO_RS_NAME}' is already ready."
            ;;

        no-primary)
            error "Replica set '${MONGO_RS_NAME}' is initialized but has no PRIMARY."

            ;;

        wrong-set)
            error "MongoDB is using a different replica set name."

            ;;

        not-initialized)
            initialize_replica_set
            ;;

        *)
            error "Unable to determine MongoDB replica set status."
            ;;
    esac
}

wait_for_primary() {
    log "Waiting for MongoDB PRIMARY..."

    for _ in $(seq 1 30); do
        if [[ "$(replica_set_status)" == "ready" ]]; then
            log "MongoDB PRIMARY is ready."
            return
        fi

        sleep 1
    done

    error "MongoDB replica set did not elect a PRIMARY."
}

mongo_user_exists() {
    local database="$1"
    local username="$2"

    mongo_shell \
        --eval "
            print(
                db.getSiblingDB('${database}').getUser('${username}') !== null
            );
        " |
        grep -qx "true"
}

create_mongo_user() {
    local database="$1"
    local username="$2"
    local password="$3"

    log "Checking MongoDB user '${username}'..."

    if mongo_user_exists "$database" "$username"; then
        log "MongoDB user '${username}' already exists."
        return
    fi

    log "Creating MongoDB user '${username}'..."

    mongo_shell \
        --eval "
            db.getSiblingDB('${database}').createUser({
                user: '${username}',
                pwd: '${password}',
                roles: [
                    {
                        role: 'readWrite',
                        db: '${database}'
                    }
                ]
            });
        "

    log "MongoDB user '${username}' created."
}

# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------

generate_password() {
    openssl rand -hex 16
}

get_k8s_secret_value() {
    local secret="$1"
    local key="$2"

    if ! kubectl get secret "$secret" \
        -n "$K8S_NAMESPACE" \
        >/dev/null 2>&1; then

        return 1
    fi

    kubectl get secret "$secret" \
        -n "$K8S_NAMESPACE" \
        -o "jsonpath={.data.${key}}" |
        base64 --decode
}

load_or_generate_password() {
    local secret="$1"
    local key="$2"
    local file="$3"
    local username="$4"
    local database="$5"

    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"

    # Reuse the password already stored in Kubernetes.
    if value="$(
        get_k8s_secret_value "$secret" "$key" 2>/dev/null
    )"; then
        printf '%s' "$value"
        return
    fi

    # Reuse the locally persisted password.
    if [[ -f "$file" ]]; then
        cat "$file"
        return
    fi

    # The MongoDB user exists, but its password is no longer available.
    if mongo_user_exists "$database" "$username"; then
        error "MongoDB user '${username}' already exists, but its password could not be recovered.

Restore either:
  - Kubernetes Secret '${secret}', or
  - local credential file '${file}'."
    fi

    # Generate credentials for a new MongoDB user.
    value="$(generate_password)"

    printf '%s' "$value" > "$file"
    chmod 600 "$file"

    printf '%s' "$value"
}

# ---------------------------------------------------------------------------
# Kubernetes MongoDB Secrets
# ---------------------------------------------------------------------------

apply_mongo_secret() {
    local secret="$1"
    local username="$2"
    local password="$3"

    log "Applying Kubernetes Secret '${secret}'..."

    kubectl create secret generic "$secret" \
        -n "$K8S_NAMESPACE" \
        --from-literal="MONGO_USERNAME=${username}" \
        --from-literal="MONGO_PASSWORD=${password}" \
        --dry-run=client \
        -o yaml |
        kubectl apply -f -
}

# ---------------------------------------------------------------------------
# JWT keys
# ---------------------------------------------------------------------------

ensure_jwt_keys() {
    local private_key_file="${SECRETS_DIR}/jwt-private.pem"
    local public_key_file="${SECRETS_DIR}/jwt-public.pem"

    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"

    # Reuse the private key already stored in Kubernetes.
    if private_key="$(
        get_k8s_secret_value \
            "$JWT_K8S_SECRET" \
            "$JWT_PRIVATE_KEY_NAME" \
            2>/dev/null
    )"; then

        printf '%s\n' "$private_key" > "$private_key_file"
        chmod 600 "$private_key_file"

        log "Using existing JWT private key."

    elif [[ -f "$private_key_file" ]]; then

        log "Using existing local JWT private key."

    else

        log "Generating JWT RSA private key..."

        openssl genrsa \
            -out "$private_key_file" \
            2048 \
            >/dev/null 2>&1

        chmod 600 "$private_key_file"
    fi

    log "Generating JWT public key..."

    openssl rsa \
        -in "$private_key_file" \
        -pubout \
        -out "$public_key_file" \
        >/dev/null 2>&1

    log "Applying Kubernetes JWT private key Secret..."

    kubectl create secret generic "$JWT_K8S_SECRET" \
        -n "$K8S_NAMESPACE" \
        --from-file="${JWT_PRIVATE_KEY_NAME}=${private_key_file}" \
        --dry-run=client \
        -o yaml |
        kubectl apply -f -

    log "Applying Kubernetes JWT public key ConfigMap..."

    kubectl create configmap "$JWT_PUBLIC_CONFIGMAP" \
        -n "$K8S_NAMESPACE" \
        --from-file="${JWT_PUBLIC_KEY_NAME}=${public_key_file}" \
        --dry-run=client \
        -o yaml |
        kubectl apply -f -
}

# ---------------------------------------------------------------------------
# NATS
# ---------------------------------------------------------------------------

check_nats() {
    log "Checking NATS..."

    if ! timeout 3 bash -c \
        "</dev/tcp/${NATS_HOST}/${NATS_PORT}" \
        >/dev/null 2>&1; then

        error "NATS is not reachable at ${NATS_HOST}:${NATS_PORT}."
    fi

    log "NATS is reachable."
}

# ---------------------------------------------------------------------------
# Application secrets
# ---------------------------------------------------------------------------

create_grafana_secret() {
    local namespace="$OBSERVABILITY_NAMESPACE"
    local name="grafana-admin"

    if kubectl get secret "$name" \
        -n "$namespace" \
        >/dev/null 2>&1; then

        echo "Secret $namespace/$name already exists. Skipping."
        return
    fi

    local password
    password="$(openssl rand -base64 32)"

    kubectl create secret generic "$name" \
        --namespace "$namespace" \
        --from-literal=admin-user=admin \
        --from-literal=admin-password="$password"

    echo
    echo "Created Grafana admin secret."
    echo "Grafana username: admin"
    echo "Grafana password: $password"
    echo
}

create_minio_secret() {
    local namespace="$STORAGE_NAMESPACE"
    local name="minio-credentials"

    if kubectl get secret "$name" \
        -n "$namespace" \
        >/dev/null 2>&1; then

        echo "Secret $namespace/$name already exists. Skipping."
        return
    fi

    local password
    password="$(openssl rand -base64 32)"

    kubectl create secret generic "$name" \
        --namespace "$namespace" \
        --from-literal=rootUser=minioadmin \
        --from-literal=rootPassword="$password"

    echo
    echo "Created MinIO credentials secret."
    echo "MinIO root user: minioadmin"
    echo "MinIO root password: $password"
    echo
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

require_command kubectl
require_command mongosh
require_command openssl
require_command base64
require_command timeout

kubectl cluster-info >/dev/null 2>&1 || \
    error "Unable to connect to the Kubernetes cluster."

if [[ -z "$MONGO_ADMIN_PASSWORD" ]]; then
    error "MONGO_ADMIN_PASSWORD is required."
fi

log "Creating namespaces..."
for namespace in \
    "$K8S_NAMESPACE" \
    "$OBSERVABILITY_NAMESPACE" \
    "$STORAGE_NAMESPACE"
do
    kubectl get namespace "$namespace" \
      >/dev/null 2>&1 ||
      kubectl create namespace "$namespace"
done
log "Using Kubernetes namespace '${K8S_NAMESPACE}'."

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------

wait_for_mongo
ensure_replica_set
wait_for_primary

AUTH_DB_PASSWORD="$(
    load_or_generate_password \
        "$AUTH_DB_K8S_SECRET" \
        "MONGO_PASSWORD" \
        "${SECRETS_DIR}/auth-service-db-password" \
        "$AUTH_DB_USER" \
        "$AUTH_DB"
)"

INVENTORY_DB_PASSWORD="$(
    load_or_generate_password \
        "$INVENTORY_DB_K8S_SECRET" \
        "MONGO_PASSWORD" \
        "${SECRETS_DIR}/inventory-service-db-password" \
        "$INVENTORY_DB_USER" \
        "$INVENTORY_DB"
)"

create_mongo_user \
    "$AUTH_DB" \
    "$AUTH_DB_USER" \
    "$AUTH_DB_PASSWORD"

create_mongo_user \
    "$INVENTORY_DB" \
    "$INVENTORY_DB_USER" \
    "$INVENTORY_DB_PASSWORD"

# ---------------------------------------------------------------------------
# Kubernetes application credentials
# ---------------------------------------------------------------------------

apply_mongo_secret \
    "$AUTH_DB_K8S_SECRET" \
    "$AUTH_DB_USER" \
    "$AUTH_DB_PASSWORD"

apply_mongo_secret \
    "$INVENTORY_DB_K8S_SECRET" \
    "$INVENTORY_DB_USER" \
    "$INVENTORY_DB_PASSWORD"

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

ensure_jwt_keys

# ---------------------------------------------------------------------------
# Application secrets
# ---------------------------------------------------------------------------

create_grafana_secret
create_minio_secret

# ---------------------------------------------------------------------------
# NATS
# ---------------------------------------------------------------------------

check_nats

# ---------------------------------------------------------------------------
# Grafana dashboards
# ---------------------------------------------------------------------------

log "Applying Grafana dashboards..."

kubectl apply -k "$GRAFANA_DASHBOARDS_DIR"

log "Bootstrap completed successfully."
