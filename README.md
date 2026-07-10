# app-fiap-videos-api

Microsserviço de borda HTTP (Express): autenticação, upload, listagem de status e download do zip.

## Endpoints

| Método | Rota | Auth |
|--------|------|------|
| POST | `/auth/register` | Não |
| POST | `/auth/login` | Não |
| POST | `/videos` | Bearer JWT (multipart `video`) |
| GET | `/videos` | Bearer JWT |
| GET | `/videos/:id/download` | Bearer JWT |
| GET | `/health/live` | Não |
| GET | `/metrics` | Não |

## Mensageria

Publica `VideoProcessingRequested` via **outbox** + relay RabbitMQ.
