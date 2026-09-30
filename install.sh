#!/usr/bin/env bash

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

PLATFORM_DIR="${SCRIPT_DIR}/infra/k8s/platform"
OBSERVABILITY_DIR="${SCRIPT_DIR}/infra/k8s/observability"
STORAGE_DIR="${SCRIPT_DIR}/infra/k8s/storage"

# Namespaces
PLATFORM_NAMESPACE="order-event-platform"
OBSERVABILITY_NAMESPACE="observability"
STORAGE_NAMESPACE="storage"

# Official Helm Chart Grafana
GRAFANA_REPO_NAME="grafana-community"
GRAFANA_REPO_URL="https://grafana-community.github.io/helm-charts"
GRAFANA_CHART="grafana"
GRAFANA_CHART_VERSION="13.0.0"

# Official Helm Chart Prometheus
PROMETHEUS_REPO_NAME="prometheus-community"
PROMETHEUS_REPO_URL="https://prometheus-community.github.io/helm-charts"
PROMETHEUS_CHART="kube-prometheus-stack"
PROMETHEUS_CHART_VERSION="88.6.1"

# Official Helm Chart Minio
MINIO_REPO_NAME="minio"
MINIO_REPO_URL="https://charts.min.io/"
MINIO_CHART="minio"
MINIO_CHART_VERSION="5.4.0"

# Official Helm Chart Loki
LOKI_REPO_NAME="grafana-community"
LOKI_REPO_URL="https://grafana-community.github.io/helm-charts"
LOKI_CHART="loki"
LOKI_CHART_VERSION="7.3.0"

# Official Helm Chart Alloy
ALLOY_REPO_NAME="grafana-community"
ALLOY_REPO_URL="https://grafana-community.github.io/helm-charts"
ALLOY_CHART="alloy"
ALLOY_CHART_VERSION="1.11.1"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

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
    command -v "$1" >/dev/null 2>&1 || error "'$1' is required but was not found."
}

require_file() {
    [[ -f "$1" ]] || error "Required file not found: $1"
}

add_helm_repo() {
    local name="$1"
    local url="$2"

    if helm repo list 2>/dev/null | awk 'NR > 1 {print $1}' | grep -Fxq "$name"; then
        log "Helm repository '$name' already exists"
    else
        log "Adding Helm repository '$name'"
        helm repo add "$name" "$url"
    fi
}

create_namespace() {
    local namespace="$1"

    kubectl create namespace "$namespace" \
        --dry-run=client \
        -o yaml |
        kubectl apply -f -
}

# -----------------------------------------------------------------------------
# Prerequisites
# -----------------------------------------------------------------------------

log "Checking prerequisites"

require_command kubectl
require_command helm

kubectl cluster-info >/dev/null 2>&1 ||
    error "Unable to connect to the Kubernetes cluster."

require_file "${PLATFORM_DIR}/Chart.yaml"
require_file "${PLATFORM_DIR}/values.yaml"

require_file "${OBSERVABILITY_DIR}/prometheus/values.yaml"
require_file "${OBSERVABILITY_DIR}/grafana/values.yaml"
require_file "${OBSERVABILITY_DIR}/loki/values.yaml"
require_file "${OBSERVABILITY_DIR}/alloy/values.yaml"

require_file "${STORAGE_DIR}/minio/values.yaml"

# -----------------------------------------------------------------------------
# Helm repositories
# -----------------------------------------------------------------------------

log "Configuring Helm repositories"

add_helm_repo "$PROMETHEUS_REPO_NAME" "$PROMETHEUS_REPO_URL"
add_helm_repo "$GRAFANA_REPO_NAME" "$GRAFANA_REPO_URL"
add_helm_repo "$MINIO_REPO_NAME" "$MINIO_REPO_URL"
add_helm_repo "$ALLOY_REPO_NAME" "$ALLOY_REPO_URL"
add_helm_repo "$LOKI_REPO_NAME" "$LOKI_REPO_URL"

helm repo update

# -----------------------------------------------------------------------------
# Namespaces
# -----------------------------------------------------------------------------

log "Creating namespaces"

create_namespace "$PLATFORM_NAMESPACE"
create_namespace "$OBSERVABILITY_NAMESPACE"
create_namespace "$STORAGE_NAMESPACE"

# -----------------------------------------------------------------------------
# MinIO
# -----------------------------------------------------------------------------

log "Installing MinIO"

helm upgrade --install minio \
    "${MINIO_REPO_NAME}/${MINIO_CHART}" \
    --namespace "$STORAGE_NAMESPACE" \
    --version "$MINIO_CHART_VERSION" \
    --values "${STORAGE_DIR}/minio/values.yaml" \
    --wait

# -----------------------------------------------------------------------------
# Loki
# -----------------------------------------------------------------------------

log "Installing Loki"

helm upgrade --install loki \
    "${LOKI_REPO_NAME}/${LOKI_CHART}" \
    --namespace "$OBSERVABILITY_NAMESPACE" \
    --version "$LOKI_CHART_VERSION" \
    --values "${OBSERVABILITY_DIR}/loki/values.yaml" \
    --wait

# -----------------------------------------------------------------------------
# Alloy
# -----------------------------------------------------------------------------

log "Installing Grafana Alloy"

helm upgrade --install alloy \
    "${ALLOY_REPO_NAME}/${ALLOY_CHART}" \
    --namespace "$OBSERVABILITY_NAMESPACE" \
    --version "$ALLOY_CHART_VERSION" \
    --values "${OBSERVABILITY_DIR}/alloy/values.yaml" \
    --wait

# -----------------------------------------------------------------------------
# Grafana
# -----------------------------------------------------------------------------

log "Installing Grafana"

helm upgrade --install grafana \
    "${GRAFANA_REPO_NAME}/${GRAFANA_CHART}" \
    --namespace "$OBSERVABILITY_NAMESPACE" \
    --version "$GRAFANA_CHART_VERSION" \
    --values "${OBSERVABILITY_DIR}/grafana/values.yaml" \
    --wait

# -----------------------------------------------------------------------------
# Prometheus
# -----------------------------------------------------------------------------

log "Installing kube-prometheus-stack"

helm upgrade --install prometheus \
    "${PROMETHEUS_REPO_NAME}/${PROMETHEUS_CHART}" \
    --namespace "$OBSERVABILITY_NAMESPACE" \
    --version "$PROMETHEUS_CHART_VERSION" \
    --values "${OBSERVABILITY_DIR}/prometheus/values.yaml" \
    --wait

# -----------------------------------------------------------------------------
# Order Event Platform
# -----------------------------------------------------------------------------

log "Installing Order Event Platform"

helm upgrade --install order-event-platform \
    "$PLATFORM_DIR" \
    --namespace "$PLATFORM_NAMESPACE" \
    --values "${PLATFORM_DIR}/values.yaml" \
    --wait

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

log "Installation completed"

echo
echo "Releases:"
helm list -n "$STORAGE_NAMESPACE"
helm list -n "$OBSERVABILITY_NAMESPACE"
helm list -n "$PLATFORM_NAMESPACE"

echo
echo "Namespaces:"
echo "  - $STORAGE_NAMESPACE"
echo "  - $OBSERVABILITY_NAMESPACE"
echo "  - $PLATFORM_NAMESPACE"
echo
