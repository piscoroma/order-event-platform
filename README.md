# Order Event Platform

Cloud-native, event-driven order management platform based on microservices and Kubernetes.

## Requirements

- Docker
- Node.js / npm
- kubectl
- Helm
- Kubernetes cluster

## Installation

Install the project dependencies:

```bash
npm ci
```

Deploy the platform to Kubernetes:

```bash
helm upgrade --install \
  order-event-platform \
  ./infra/k8s/helm/charts/order-event-platform \
  --namespace order-event-platform \
  --create-namespace
```

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
- **Argo CD** — GitOps continuous delivery
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
                  └──────┬───────┘       └──────┬───────┘
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

                         ┌──────────────────────┐
                         │ Kubernetes + Helm    │
                         │ Argo CD              │
                         └──────────────────────┘
                        
```

## Deployment

The application is packaged and deployed using Helm.

Argo CD provides GitOps-based continuous delivery by synchronizing the Kubernetes cluster with the desired state stored in Git.

## Observability

The platform exposes application and infrastructure metrics through Prometheus and Grafana.

The observability stack covers:

- HTTP request metrics
- Application metrics
- NATS metrics
- Service health and readiness
- Kubernetes resource metrics

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
