# app-fiap-videos-api

HTTP edge service (Express): authentication, video upload, status listing, and zip download.

## Responsibilities

- Register users (admin-only) and authenticate via JWT (API Bearer or web cookie)
- Accept single or multi-file video uploads (up to 10 per request)
- Persist jobs and publish `VideoProcessingRequested` via transactional outbox
- Consume processor events to update job status
- Cache user video lists in Redis (30s TTL)

## Architecture

### Role in the platform

The API is the **HTTP edge** of FIAP Videos — the only user-facing service. It handles auth, uploads, job status, and zip downloads. Workflow is **choreographed** via RabbitMQ domain events; there is no central orchestrator.

```mermaid
graph LR
    User["User / client"]
    API["API :3000"]
    PG[("fiap_videos_api")]
    Redis[("Redis")]
    Storage["MinIO / S3"]
    RMQ["RabbitMQ"]

    User --> API
    API --> PG
    API --> Redis
    API --> Storage
    API -- "VideoProcessingRequested" --> RMQ
    RMQ -- "Started / Completed / Failed" --> API
```

### Upload flow

1. Authenticated user uploads via `POST /videos` (single or multi-file).
2. Videos are stored at `videos/{jobId}-{file}` in object storage.
3. A `video_jobs` row is created (`pending`) and `VideoProcessingRequested` is written to the **transactional outbox**.
4. The outbox relay publishes to exchange `fiap-videos.events`.
5. Processor events (`Started`, `Completed`, `Failed`) update job status via inbox consumers.

### Hexagonal layout

```
src/
├── core/
│   ├── domain/          # Entities, ports, validators (VideoJob, User, …)
│   └── application/     # Use cases (SubmitVideo, Login, Apply* events, …)
└── adapter/
    ├── driver/          # Express controllers & routes (HTTP + web UI)
    └── infra/           # Drizzle, RabbitMQ, Redis, JWT, S3/MinIO, outbox relay
```

Wiring: `src/adapter/infra/http/composition-root.ts`.

### Database (`fiap_videos_api`)

| Table | Purpose |
|-------|---------|
| `users` | Credentials and roles (`admin` \| `user`) |
| `video_jobs` | Job lifecycle, storage keys, correlation IDs |
| `outbox` / `outbox_dead_letters` | Reliable event publishing |
| `processed_events` | Inbox deduplication |

### Messaging

Exchange: `fiap-videos.events` (topic, durable). DLX: `fiap-videos.events.dlx`. Queue pattern: `fiap-videos.api.{eventType}`.

| Direction | Event |
|-----------|-------|
| Publishes (outbox) | `VideoProcessingRequested` |
| Consumes | `VideoProcessingStarted`, `VideoProcessingCompleted`, `VideoProcessingFailed` |

Failed deliveries route to per-queue DLQs. Every envelope carries a correlation ID.

### Dependencies

| Dependency | Usage |
|------------|-------|
| PostgreSQL | Primary persistence |
| Redis | Video list cache (30s TTL) |
| RabbitMQ | Event bus |
| MinIO / S3 | Uploads (`videos/…`), zip downloads (`zips/…`) |

## User roles

The API has two roles, stored on the user record and embedded in the JWT (`role`: `admin` | `user`).

| Role | Value in JWT | Purpose |
|------|--------------|---------|
| **Admin** | `admin` | Bootstrap and onboard users |
| **User** | `user` | Normal video upload and status workflow |

### What each role can do

| Action | Admin | User |
|--------|-------|------|
| `POST /auth/login`, `/auth/login/web` | ✅ | ✅ |
| `POST /auth/register` | ✅ | ❌ (403) |
| Create another admin via register (`role: "admin"`) | ✅ | ❌ |
| `POST /videos` (upload) | ✅ | ✅ |
| `GET /videos`, `GET /videos/:id` | ✅ (own jobs only) | ✅ (own jobs only) |
| `GET /videos/:id/download` | ✅ (own jobs only) | ✅ (own jobs only) |
| Web UI (`/login`, `/status`) | ✅ | ✅ |

Video endpoints always scope data to the authenticated user (`sub` in the JWT). Admins do **not** get access to other users’ jobs.

### Registering users (admin only)

```http
POST /auth/register
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "email": "newuser@fiap-videos.local",
  "password": "SecurePass123",
  "role": "user"
}
```

`role` is optional and defaults to `user`. Set `"role": "admin"` only when creating another administrator.

### Local seed users

After `yarn db:seed` or `BOOTSTRAP_USERS=true`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fiap-videos.local` | `Admin12345` |
| User | `demo@fiap-videos.local` | `Demo12345` |

Values come from `SEED_*` / `SEED_ADMIN_*` in `.env` (see `.env.example`).

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

Alternatively, set `BOOTSTRAP_USERS=true` in `.env` before `yarn start` or Docker startup — the API creates the admin user (and demo user outside production) on boot. In production, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are required when bootstrap is enabled.

Migrations run automatically on `yarn start` / Docker startup too, but running them once before dev avoids race conditions.

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

In separate terminals, with the **same** RabbitMQ broker (`localhost:5673`) and **MinIO** (`localhost:9000`):

```bash
# Start MinIO if not already running:
cd app-fiap-videos-infra/docker && docker compose up minio minio-init -d

# Terminal 2 — processor
cd app-fiap-videos-processor
cp .env.example .env
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

> See [app-fiap-videos-infra/README-database.md](../app-fiap-videos-infra/README-database.md) for PostgreSQL layout and ports.

GitHub Actions runs `build`, `lint`, `type-check`, `test-unit`, `test-integration`, `security-audit`, and a `ci-success` gate on every push and pull request to `main`.
