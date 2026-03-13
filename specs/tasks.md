# Tasks

## P1 - Project Foundation
[x] T1 - Initialise .NET solution and project structure under `src/api/`
[x] T2 - Initialise React app under `src/ui/`
[x] T3 - Configure PostgreSQL database and connection
[x] T4 - Configure Docker Compose for local dev (API, UI, PostgreSQL)
[x] T5 - Set up GitHub Actions CI pipeline (build + test on push/PR)
[x] T6 - Set up pre-commit git hook to run unit tests

## P2 - Database Schema & Migrations
[x] T1 - Create Users table (id, username, first_name, last_name, email, password_hash, avatar_url, configuration JSON)
[x] T2 - Create Tasks table (id, title, description, assignee_id, status, priority, tags, start_type, start_date, end_type, end_date, duration, pinned_position JSON)
[x] T3 - Create TaskRelationships table (task_id, predecessor_id)
[x] T4 - Create Notifications table (id, user_id, type, task_id, message, is_read, created_at)

## P3 - Authentication API
[ ] T1 - Implement POST /auth/register (validate fields, hash password, create user)
[ ] T2 - Implement POST /auth/login (validate credentials, return JWT)
[ ] T3 - Implement POST /auth/logout
[ ] T4 - Implement POST /auth/password-reset-request (validate user exists, send reset email)
[ ] T5 - Implement POST /auth/password-reset (validate token, update password)
[ ] T6 - Add JWT middleware for protected routes

## P4 - Users API
[ ] T1 - Implement GET /users (list all users with task count summary by status)
[ ] T2 - Implement GET /users/{id}
[ ] T3 - Implement PUT /users/{id} (update profile fields)
[ ] T4 - Implement PUT /users/{id}/avatar (upload avatar, max 10MB, crop support)

## P5 - Tasks API
[ ] T1 - Implement GET /tasks (list tasks with filters: assignee, priority, tags, status, due status, date range)
[ ] T2 - Implement POST /tasks (create task)
[ ] T3 - Implement GET /tasks/{id}
[ ] T4 - Implement PUT /tasks/{id} (update task fields)
[ ] T5 - Implement DELETE /tasks/{id}
[ ] T6 - Implement PUT /tasks/{id}/position (update pinned graph position)
[ ] T7 - Implement POST /tasks/{id}/predecessors/{predecessorId} (add dependency)
[ ] T8 - Implement DELETE /tasks/{id}/predecessors/{predecessorId} (remove dependency)
[ ] T9 - Add dependency constraint validation (predecessor end < task start)

## P6 - Notifications API & WebSockets
[ ] T1 - Implement GET /notifications (list notifications for current user)
[ ] T2 - Implement PUT /notifications/{id}/read (mark notification as read)
[ ] T3 - Set up WebSocket server and connection management
[ ] T4 - Emit `notification` event to connected clients in real time
[ ] T5 - Implement automatic assignment notification on task assignee change

## P7 - UI Foundation
[ ] T1 - Configure central styling system (theme, colours, typography)
[ ] T2 - Define reusable base components (Button, Input, Modal, Panel, etc.)
[ ] T3 - Set up React Router with route definitions
[ ] T4 - Set up API client (axios/fetch with JWT header injection)
[ ] T5 - Set up WebSocket client with reconnection handling

## P8 - Authentication UI
[ ] T1 - Build Login view (logo, username, password, links to register/forgot)
[ ] T2 - Build Create Account view (first name, last name, username, email, password with full validation)
[ ] T3 - Build Password Reset Request view (username or email input, validate exists)
[ ] T4 - Build Password Reset view (new password + confirm, validate match + length + token validity)
[ ] T5 - Add auth guard — redirect to login when unauthenticated

## P9 - Statusbar Component
[ ] T1 - Build Statusbar showing logged-in user (avatar, first/last name)
[ ] T2 - Add notifications counter (icon + unread count badge)
[ ] T3 - User click → dropdown with "Open user profile" and "Logout"
[ ] T4 - Notifications click → open Notification List popup

## P10 - User Profile Component
[ ] T1 - Build User Profile popup (avatar, username read-only, first/last name, email)
[ ] T2 - Avatar upload (square crop, max 10MB)
[ ] T3 - Editable first name, last name, email fields with save
[ ] T4 - Reset password button (triggers password-reset-request flow)

## P11 - Notifications Component
[ ] T1 - Build Notification List popup (type, task title hyperlink, timestamp)
[ ] T2 - Subscribe to WebSocket `notification` events to update list in real time
[ ] T3 - Click notification → mark as read and navigate to task

## P12 - Task List View
[ ] T1 - Build Task List component (columns: title, priority, tags, assignee, start, end, duration, status)
[ ] T2 - Default sort by due date; click-to-sort by other columns
[ ] T3 - Add filter panel (text, assignee, priority, tags, completion, due status, date range)
[ ] T4 - Apply task status colours matching due-status spec (blue/green/orange/red/maroon/gold)
[ ] T5 - Add current time block band (when sorted by due date)
[ ] T6 - Add "Add Task" button
[ ] T7 - Toggle open-ended task display position (before/after dated tasks)

## P13 - Task Graph View
[ ] T1 - Build time axis component (configurable position: top/bottom/left/right, semi-transparent float)
[ ] T2 - Time axis tick marks adapt to zoom level (hours/days → months/years)
[ ] T3 - Render task items on graph canvas positioned by due date and dependencies
[ ] T4 - Draw dependency arrows between task items
[ ] T5 - Render current moment indicator line
[ ] T6 - Render current time block band
[ ] T7 - Show dashed lines for missing/gap graph sections
[ ] T8 - Auto-position tasks based on due dates and dependencies
[ ] T9 - Support user pinning of task positions (drag to override auto-position)
[ ] T10 - Drag task to new position while respecting dependency constraints
[ ] T11 - Add filter panel (text, assignee, priority, tags, completion, due status, dates)
[ ] T12 - Toggle open-ended tasks visibility

## P14 - Task Item Component (Graph)
[ ] T1 - Build task item card (title, status colour, time remaining/overdue)
[ ] T2 - Show upstream dependency count + expandable list
[ ] T3 - Show downstream dependent count + expandable list
[ ] T4 - Predecessor drag widget — drag to create predecessor relationship
[ ] T5 - Successor drag widget — drag to create successor relationship
[ ] T6 - Apply hybrid gradient colour for tasks spanning multiple due-status periods

## P15 - Task Detail Panel
[ ] T1 - Build collapsible Task Detail panel (right edge of graph view)
[ ] T2 - Editable title (required), description (optional)
[ ] T3 - Assignee picker (optional)
[ ] T4 - Completion status toggle (Complete | Incomplete)
[ ] T5 - Timing section: start type (None | Fixed | Flexible) + date/time picker
[ ] T6 - Timing section: end type (None | Fixed | Flexible) + date/time picker
[ ] T7 - Duration field (auto-locked when both start and end are fixed)
[ ] T8 - Predecessor list with hyperlinks; button to add/remove predecessors
[ ] T9 - Successor list with hyperlinks
[ ] T10 - Auto-save with configurable delay (user config: 0–10 s, default 2 s)

## P16 - Dashboard View
[ ] T1 - Build Dashboard as application entry view
[ ] T2 - Render default task view (Graph or List) based on user configuration
[ ] T3 - Layout: Statusbar top + task view fills remaining area

## P17 - User Configuration
[ ] T1 - Persist user config (defaultTasksView, timeAxisDirection, timeAxisPosition, autoSaveDelaySeconds)
[ ] T2 - Settings UI accessible from user profile or dedicated settings panel

## P18 - User Management View
[ ] T1 - Build User Management view (list users with task count summary by status)

## P19 - Documentation Views
[ ] T1 - Build About view (application description, developer info)
[ ] T2 - Build FAQ view
[ ] T3 - Build User Guide view (step-by-step instructions with screenshots)

## P20 - End-to-End Testing
[ ] T1 - E2E: user registration and login flow
[ ] T2 - E2E: create, edit, and delete a task
[ ] T3 - E2E: add and remove task dependencies with constraint validation
[ ] T4 - E2E: task graph drag-and-drop repositioning
[ ] T5 - E2E: real-time notification delivery via WebSocket
