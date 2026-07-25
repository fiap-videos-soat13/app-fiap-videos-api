# app-fiap-videos-api

HTTP edge service (Express): authentication, video upload, status listing, and zip download.

## Responsibilities

- Register users (admin-only) and authenticate via JWT (API Bearer or web cookie)
- Accept single or multi-file video uploads (up to 10 per request)
- Persist jobs and publish `VideoProcessingRequested` via transactional outbox
- Consume processor events to update job status
- Cache user video lists in Redis (30s TTL)

## Development server (`yarn start:dev`)

Use this when you want **hot reload** while coding. The Node process runs on your machine; databases and messaging run in Docker.

### Prerequisites

- **Node.js 22+**
- **Yarn**
- **Docker** (for Postgres, Redis, RabbitMQ)

### Step 1 — Start infrastructure (dependencies only)

Pick **one** option below. Leave this terminal running (or use `-d` to run in the background).

**Option A — API dependencies** (Postgres, Redis) + **shared RabbitMQ from infra**:

```bash
cd app-fiap-videos-infra/docker
docker compose up rabbitmq -d

cd ../../app-fiap-videos-api
docker compose up postgres redis -d
```

**Option B — Full platform dependencies** (Postgres with all 3 DBs, Redis, RabbitMQ, MailHog):

```bash
cd app-fiap-videos-infra/docker
docker compose up postgres redis rabbitmq mailhog -d
```

Wait until containers are healthy:

```bash
docker compose ps
```

| Dependency | Host port | Used by API |
|------------|-----------|-------------|
| PostgreSQL | `5432` | `DATABASE_URL` |
| Redis | `6380` | `REDIS_URL` |
| RabbitMQ | `5673` (UI: `15673`) | `RABBITMQ_URL` — **single shared broker** (infra) |

RabbitMQ UI: http://localhost:15673 — user `fiap` / password `fiap`.

### Step 2 — Configure environment

```bash
cd app-fiap-videos-api
cp .env.example .env
```

The defaults in `.env.example` already target `localhost` on the ports above. Change them only if you mapped different host ports.

Required variables: `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `JWT_SECRET`.

### Step 3 — Install dependencies, migrate, seed

```bash
yarn install
yarn db:migrate
yarn db:seed    # creates admin + demo users (first run only)
```

Migrations run automatically on `yarn start` / Docker startup too, but running them once before dev avoids race conditions.

**Seed credentials** (from `.env.example`):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fiap-videos.local` | `admin12345` |
| User | `demo@fiap-videos.local` | `demo12345` |

### Step 4 — Start the dev server

```bash
yarn start:dev
```

Expected output:

```
API FIAP Videos rodando em http://0.0.0.0:3000
Swagger em http://0.0.0.0:3000/api/docs
Login em http://0.0.0.0:3000/login
Status em http://0.0.0.0:3000/status
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000/login | Web login |
| http://localhost:3000/status | Upload & job status |
| http://localhost:3000/api/docs | Swagger |

### Step 5 — End-to-end flow (optional)

Uploads only complete if the **processor** and **notifier** are also running.

In separate terminals, with the **same** RabbitMQ broker (`localhost:5673`):

```bash
# Terminal 2 — processor
cd app-fiap-videos-processor
cp .env.example .env
# Point storage at the API folder so both services share uploaded videos:
# STORAGE_PATH=../app-fiap-videos-api/storage
yarn install && yarn db:migrate && yarn start:dev

# Terminal 3 — notifier
cd app-fiap-videos-notifier
cp .env.example .env
yarn install && yarn db:migrate && yarn start:dev
```

E-mails appear in MailHog if you started it (Option B): http://localhost:8025

### Stop infrastructure

```bash
# If you used API compose:
cd app-fiap-videos-api && docker compose down

# If you used infra compose:
cd app-fiap-videos-infra/docker && docker compose down
```

Add `-v` to remove database volumes and start fresh.

---

## Run locally (Docker — no hot reload)

### Full stack (API + processor + notifier in containers)

```bash
cd ../app-fiap-videos-infra/docker
docker compose up --build
```

### This service only (API container + deps)

```bash
docker compose up --build
```

Starts API + Postgres (`:5432`) + Redis (`:6380`). Requires shared RabbitMQ from infra (`docker compose up rabbitmq -d` in `app-fiap-videos-infra/docker`).

## Endpoints

| Method | Route | Auth |
|--------|------|------|
| `POST` | `/auth/register` | Admin JWT |
| `POST` | `/auth/login` | — |
| `POST` | `/auth/login/web` | — (sets cookie) |
| `POST` | `/auth/logout/web` | — |
| `POST` | `/videos` | Bearer JWT (multipart `video` or `videos`) |
| `GET` | `/videos` | Bearer JWT |
| `GET` | `/videos/:id` | Bearer JWT |
| `GET` | `/videos/:id/download` | Bearer JWT |
| `GET` | `/login`, `/status`, `/status/:id` | Cookie (web UI) |
| `GET` | `/health/live`, `/health/ready` | — |
| `GET` | `/metrics` | — |
| `GET` | `/api/docs` | Swagger |

## Messaging

Publishes `VideoProcessingRequested` via **outbox** + RabbitMQ relay.  
Subscribes to `VideoProcessingStarted`, `VideoProcessingCompleted`, `VideoProcessingFailed`.

## Environment

See [`.env.example`](./.env.example). Required: `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `JWT_SECRET`.

## Tests & CI

```bash
yarn lint:ci
yarn format:check
yarn typecheck
yarn test:unit
yarn test:cov
yarn test:integration       # requires Postgres (see script below)
yarn build
```

Run integration tests with a temporary Postgres container:

```bash
./scripts/run-integration-tests.sh
```

Or with your own database:

```bash
export DATABASE_URL=postgresql://fiap:fiap@localhost:5432/fiap_videos_api_test
yarn db:migrate
yarn test:integration
```

GitHub Actions runs `build`, `lint`, `type-check`, `test-unit`, `test-integration`, `security-audit`, and a `ci-success` gate on every push and pull request to `main`.

## Architecture

Hexagonal layout under `src/`:

- `core/domain` — entities, ports, validators
- `core/application` — use cases
- `adapter/driver` — controllers, routes
- `adapter/infra` — Drizzle, RabbitMQ, Redis, JWT, storage

Wiring in `src/adapter/infra/http/composition-root.ts`.
