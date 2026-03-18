# User Management View

Displays a list of all users with a task count summary by status.

## Route
`/users`

## Layout
- Statusbar (shared)
- User table filling remaining area

## User Table
Columns:
- **Avatar** — user avatar image, or initials fallback if no avatar set
- **Name** — first name + last name (sortable)
- **Username** — read-only handle (sortable)
- **Incomplete Tasks** — count of tasks with status `Incomplete` (sortable)
- **Complete Tasks** — count of tasks with status `Complete` (sortable)
- **Total Tasks** — sum of incomplete + complete (sortable)

Default sort: by name ascending. Click column headers to sort; click again to toggle direction.

Data is sourced from `GET /users` which already returns `completeTasks` and `incompleteTasks` per user.
Task counts default to `0` if absent or null in the API response.

## Navigation
A **Users** link is added to the Statusbar main nav, navigating to `/users`.
The link is highlighted (active) when the current route is `/users`.
