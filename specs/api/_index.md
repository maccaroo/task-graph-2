# API

REST API with JWT authentication.  All endpoints require a valid Bearer token unless noted.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Login; returns JWT |
| POST | /auth/logout | Invalidate token |
| POST | /auth/password-reset-request | Request password reset email |
| POST | /auth/password-reset | Submit new password via reset token |

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | /users | List all users (with task count summary) |
| GET | /users/{id} | Get user |
| PUT | /users/{id} | Update user profile |
| PUT | /users/{id}/avatar | Upload/replace profile picture |

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | /tasks | List tasks (supports filtering/sorting) |
| POST | /tasks | Create task |
| GET | /tasks/{id} | Get task |
| PUT | /tasks/{id} | Update task |
| DELETE | /tasks/{id} | Delete task |
| PUT | /tasks/{id}/position | Update pinned graph position |

## Task Relationships

| Method | Path | Description |
|--------|------|-------------|
| POST | /tasks/{id}/predecessors/{predecessorId} | Add predecessor |
| DELETE | /tasks/{id}/predecessors/{predecessorId} | Remove predecessor |

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | /notifications | List notifications for current user |
| PUT | /notifications/{id}/read | Mark notification as read |

## WebSocket

| Event | Direction | Description |
|-------|-----------|-------------|
| `notification` | Server → Client | New notification pushed to user |

Connection: `ws://.../ws` with JWT in query param or header.
