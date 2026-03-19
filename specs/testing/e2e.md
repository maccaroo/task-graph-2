# End-to-End Testing

Playwright is used for all E2E tests. Tests run against the full Docker Compose stack
(db + api + ui).

## Setup

- Playwright project lives in `src/e2e/`
- `playwright.config.ts` targets `http://localhost:3000` (UI_PORT)
- `infrastructure/docker-compose.e2e.yml` is a standalone compose file for E2E runs;
  it uses an ephemeral (non-persistent) database so every run starts from a clean state
- Each test suite seeds its own data via the REST API and is self-contained

## Test Suites

### T1 — User Registration & Login
1. Navigate to `/register`; fill first name, last name, username, email, password
2. Submit → redirected to dashboard (`/`)
3. Logout via user-menu dropdown → redirected to `/login`
4. Login with the same credentials → redirected to dashboard
5. Login with wrong password → error alert shown

### T2 — Create, Edit, Delete Task
1. Seed a user via API; log in via UI
2. Navigate to Task List view; click "+ Add Task"
3. Fill title, set end-type Fixed with an end date one week from now → save
4. Task appears in Task List with correct title
5. Click task row → Task Detail panel opens; edit title → wait for auto-save
6. Reload page → confirm updated title persists
7. Delete task via Detail panel → confirm ("Yes") → task removed from list

### T3 — Task Dependencies with Constraint Validation
1. Seed two users and two tasks (Task A ends today, Task B starts tomorrow) via API
2. Log in as seeded user; navigate to Task List
3. Select Task B → add Task A as predecessor via Detail panel
4. Attempt to set Task B's start date before Task A's end date → API returns 422;
   UI shows an error
5. Remove the Task A predecessor → constraint lifted; date change now succeeds

### T4 — Task Graph Drag-and-Drop
1. Seed a user and a task with a fixed end date via API
2. Log in; navigate to Graph view
3. Locate the task card by its aria-label (task title)
4. Drag the card body horizontally to a new position
5. Verify the task's end date updates after the drop
6. Reload page → task persists at the new date position

### T5 — Real-Time Notification via WebSocket
1. Seed User A (receiver) and User B (assigner) plus a shared task via API
2. Log in as User A in the primary browser context; note the notification badge count
3. In a second browser context, log in as User B and re-assign the task to User A
4. Primary context receives a notification badge increment without page reload
5. Open notification list → new "TaskAssigned" notification is present and unread

## CI Integration

An `e2e` job in `.github/workflows/ci.yml`:
- Runs after `api` and `ui` jobs pass (`needs: [api, ui]`)
- Starts the E2E stack with `docker compose -f infrastructure/docker-compose.e2e.yml up -d --build`
- Waits for the UI to become available (`curl --retry` loop on `http://localhost:3000`)
- Runs `npx playwright test` inside `src/e2e/`
- Uploads the Playwright HTML report as a CI artifact on failure
