## Kubernetes installation

The repository provides an `install.sh` script to install the complete Kubernetes environment using Helm.

The installation includes:

* Order Event Platform services;
* Prometheus;
* Grafana;
* Loki;
* Grafana Alloy;
* MinIO.

The components are installed as separate Helm releases in the following namespaces:

* `order-event-platform` — application services;
* `observability` — Prometheus, Grafana, Loki and Alloy;
* `storage` — MinIO.

### 1. Configure environment variables

Copy the example environment file:

```bash
cp infra/local/.env.example infra/local/.env
```

Edit `infra/local/.env` if necessary.

### 2. Generate the MongoDB keyfile

Generate the MongoDB internal authentication keyfile:

./infra/local/mongo/keyfile-generator.sh

The script generates the keyfile only if it does not already exist.

The keyfile is required by MongoDB replica-set internal authentication and is intentionally excluded from Git. MongoDB requires the keyfile to have restricted permissions and to be accessible by the user running mongod.

The generated keyfile is ignored by Git.

### 3. Start MongoDB and NATS

For a local installation, start MongoDB and NATS using Docker Compose:

```bash
docker compose \
  -f infra/local/compose.yaml \
  up -d
```

Check their status:

```bash
docker compose \
  -f infra/local/compose.yaml \
  ps
```

If MongoDB and NATS are already available in an external environment, this step is not required. Configure the corresponding connection parameters before running the bootstrap.

### 4. Bootstrap the platform

Before installing the Helm releases, run `bootstrap.sh` to prepare the Kubernetes environment and configure the external infrastructure.

Export the variables from `.env`:

```bash
set -a
source infra/local/.env
set +a
```

Then run:

```bash
./bootstrap.sh
```

The bootstrap script:

* initializes the MongoDB replica set if necessary;
* waits for a MongoDB PRIMARY;
* creates the application MongoDB users;
* creates the required Kubernetes Secrets;
* generates or restores the JWT key pair;
* creates the JWT public-key ConfigMap;
* verifies NATS connectivity.

The bootstrap script is idempotent and can safely be executed again.

### 5. Install the Kubernetes environment

Once the bootstrap has completed successfully, run:

```bash
./install.sh
```

The installer:

1. configures the required Helm repositories;
2. creates the required Kubernetes namespaces;
3. installs MinIO;
4. installs Loki;
5. installs Grafana Alloy;
6. installs Grafana;
7. installs the kube-prometheus-stack;
8. installs the Order Event Platform Helm chart.

All Helm chart versions are explicitly pinned by the installer.

The default `values.yaml` files already included in the project are used by the installer, so no additional values file is required for a standard installation.

### 6. Verify the installation

Check the application workloads:

```bash
kubectl get pods \
  -n order-event-platform
```

Check the observability stack:

```bash
kubectl get pods \
  -n observability
```

Check MinIO:

```bash
kubectl get pods \
  -n storage
```

Check all Helm releases:

```bash
helm list -A
```

The installation is complete when the deployed workloads have reached their expected ready state.


## Tests

### Unit tests

```bash
npm run test
```

### Integration tests

Integration tests use Docker and Testcontainers to provision the required dependencies.

```bash
npm run test:integration
```

### End-to-end tests

```bash
npm run test:e2e
```

## Architecture

The platform is composed of the following components:

- **auth-service** — authentication and authorization
- **inventory-service** — inventory management
- **MongoDB** — persistence
- **NATS** — event-driven messaging
- **Kubernetes** — container orchestration
- **Helm** — Kubernetes package management
- **Prometheus** — metrics collection
- **Grafana** — monitoring and visualization

### High-level architecture

```text
                              ┌──────────────┐
                              │    Client    │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   Ingress    │
                              └──────┬───────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                         ▼                       ▼
                  ┌──────────────┐       ┌──────────────┐
                  │ auth-service │       │ inventory-   │
                  │              │       │   service    │
                  └──────┬───────┘       └───────┬──────┘
                         │                       │
                         │                       │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
             ┌────────────┐   ┌────────────┐   ┌─────────────┐
             │   MongoDB  │   │    NATS    │   │ Prometheus  │
             │            │   │            │   │             │
             └────────────┘   └────────────┘   └──────┬──────┘
                                                      │
                                                      ▼
                                              ┌─────────────┐
                                              │   Grafana   │
                                              └─────────────┘

                        
```

## Observability

The platform exposes application and infrastructure metrics through Prometheus and Grafana.

The observability stack covers:

- HTTP request metrics
- Application metrics
- NATS metrics
- Service health and readiness
- Kubernetes resource metrics
- Log collector/aggregator

## Development

Install dependencies:

```bash
npm ci
```

Run unit tests:

```bash
npm run test
```

Run integration tests:

```bash
npm run test:integration
```

Run end-to-end tests:

```bash
npm run test:e2e
```
