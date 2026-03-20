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
[x] T2 - Create Tasks table (id, title, description, assignee_id, status, priority, tags, start_type, start_date, end_type, end_date, duration)
[x] T3 - Create TaskRelationships table (task_id, predecessor_id)
[x] T4 - Create Notifications table (id, user_id, type, task_id, message, is_read, created_at)

## P3 - Authentication API
[x] T1 - Implement POST /auth/register (validate fields, hash password, create user)
[x] T2 - Implement POST /auth/login (validate credentials, return JWT)
[x] T3 - Implement POST /auth/logout
[x] T4 - Implement POST /auth/password-reset-request (validate user exists, send reset email)
[x] T5 - Implement POST /auth/password-reset (validate token, update password)
[x] T6 - Add JWT middleware for protected routes

## P4 - Users API
[x] T1 - Implement GET /users (list all users with task count summary by status)
[x] T2 - Implement GET /users/{id}
[x] T3 - Implement PUT /users/{id} (update profile fields)
[x] T4 - Implement PUT /users/{id}/avatar (upload avatar, max 10MB, crop support)

## P5 - Tasks API
[x] T1 - Implement GET /tasks (list tasks with filters: assignee, priority, tags, status, due status, date range)
[x] T2 - Implement POST /tasks (create task)
[x] T3 - Implement GET /tasks/{id}
[x] T4 - Implement PUT /tasks/{id} (update task fields)
[x] T5 - Implement DELETE /tasks/{id}
[x] T6 - Implement POST /tasks/{id}/predecessors/{predecessorId} (add dependency)
[x] T7 - Implement DELETE /tasks/{id}/predecessors/{predecessorId} (remove dependency)
[x] T9 - Add dependency constraint validation (predecessor end < task start)
[x] T10 - Add RelationshipType to dependency model (Exclusive, HaveStarted, HaveCompleted, HandOff) with per-type validation

## P6 - Notifications API & WebSockets
[x] T1 - Implement GET /notifications (list notifications for current user)
[x] T2 - Implement PUT /notifications/{id}/read (mark notification as read)
[x] T3 - Set up WebSocket server and connection management
[x] T4 - Emit `notification` event to connected clients in real time
[x] T5 - Implement automatic assignment notification on task assignee change

## P7 - UI Foundation
[x] T1 - Configure central styling system (theme, colours, typography)
[x] T2 - Define reusable base components (Button, Input, Modal, Panel, etc.)
[x] T3 - Set up React Router with route definitions
[x] T4 - Set up API client (axios/fetch with JWT header injection)
[x] T5 - Set up WebSocket client with reconnection handling

## P8 - Authentication UI
[x] T1 - Build Login view (logo, username, password, links to register/forgot)
[x] T2 - Build Create Account view (first name, last name, username, email, password with full validation)
[x] T3 - Build Password Reset Request view (username or email input, validate exists)
[x] T4 - Build Password Reset view (new password + confirm, validate match + length + token validity)
[x] T5 - Add auth guard — redirect to login when unauthenticated

## P9 - Statusbar Component
[x] T1 - Build Statusbar showing logged-in user (avatar, first/last name)
[x] T2 - Add notifications counter (icon + unread count badge)
[x] T3 - User click → dropdown with "Open user profile" and "Logout"
[x] T4 - Notifications click → open Notification List popup

## P10 - User Profile Component
[x] T1 - Build User Profile popup (avatar, username read-only, first/last name, email)
[x] T2 - Avatar upload (square crop, max 10MB)
[x] T3 - Editable first name, last name, email fields with save
[x] T4 - Reset password button (triggers password-reset-request flow)

## P11 - Notifications Component
[x] T1 - Build Notification List popup (type, task title hyperlink, timestamp)
[x] T2 - Subscribe to WebSocket `notification` events to update list in real time
[x] T3 - Click notification → mark as read and navigate to task

## P12 - Task List View
[x] T1 - Build Task List component (columns: title, priority, tags, assignee, start, end, duration, status)
[x] T2 - Default sort by due date; click-to-sort by other columns
[x] T3 - Add filter panel (text, assignee, priority, tags, completion, due status, date range)
[x] T4 - Apply task status colours matching due-status spec (blue/green/orange/red/maroon/gold)
[x] T5 - Add current time block band (when sorted by due date)
[x] T6 - Add "Add Task" button
[x] T7 - Toggle open-ended task display position (before/after dated tasks)

## P13 - Task Graph View
[x] T1 - Build time axis component (configurable position: top/bottom/left/right, semi-transparent float)
[x] T2 - Time axis tick marks adapt to zoom level (hours/days → months/years)
[x] T3 - Render task items on graph canvas positioned by due date and dependencies
[x] T4 - Draw dependency arrows between task items
[x] T5 - Render current moment indicator line
[x] T6 - Render current time block band
[x] T7 - Show dashed lines for missing/gap graph sections
[x] T8 - Auto-position tasks based on due dates and dependencies
[x] T9 - Support user pinning of task positions (drag to override auto-position)
[x] T10 - Drag task to new position while respecting dependency constraints
[x] T11 - Add filter panel (text, assignee, priority, tags, completion, due status, dates)
[x] T12 - Toggle open-ended tasks visibility
[x] T13 - Show time period bands on time axis (coloured background + period name label)
[x] T14 - Only show date labels on major ticks (reduce tick label crowding)

## P14 - Task Item Component (Graph)
[x] T1 - Build task item card (title, status colour, time remaining/overdue)
[x] T2 - Show upstream dependency count + expandable list
[x] T3 - Show downstream dependent count + expandable list
[x] T4 - Predecessor drag widget — drag to create predecessor relationship
[x] T5 - Successor drag widget — drag to create successor relationship
[x] T6 - Apply hybrid gradient colour for tasks spanning multiple due-status periods
[x] T7 - Display constrained/unconstrained sides with solid/soft buffer styling
[x] T8 - Position task items by time constraints (start-only, end-only, both, neither)
[x] T9 - Span both-constrained tasks from start to end date with centred content
[x] T10 - Reduced display for narrow both-constrained tasks with hover-expand (500 ms)
[x] T11 - Replace predecessor/successor widgets with start/end anchor widgets (both draggable)
[x] T12 - Infer relationship type and predecessor/successor from dragged anchor pair and dates
[x] T13 - Update arrow rendering to connect correct anchors per relationship type

## P15 - Task Detail Panel
[x] T1 - Build collapsible Task Detail panel (right edge of graph view)
[x] T2 - Editable title (required), description (optional)
[x] T3 - Assignee picker (optional)
[x] T4 - Completion status toggle (Complete | Incomplete)
[x] T5 - Timing section: start type (None | Fixed | Flexible) + date/time picker
[x] T6 - Timing section: end type (None | Fixed | Flexible) + date/time picker
[x] T7 - Duration field (auto-locked when both start and end are fixed)
[x] T8 - Predecessor list with hyperlinks; button to add/remove predecessors
[x] T9 - Successor list with hyperlinks
[x] T10 - Auto-save with configurable delay (user config: 0–10 s, default 2 s)

## P16 - Dashboard View
[x] T1 - Build Dashboard as application entry view
[x] T2 - Render default task view (Graph or List) based on user configuration
[x] T3 - Layout: Statusbar top + task view fills remaining area

## P17 - User Configuration
[x] T1 - Persist user config (defaultTasksView, timeAxisDirection, timeAxisPosition, autoSaveDelaySeconds)
[x] T2 - Settings UI accessible from user profile or dedicated settings panel
[x] T3 - Fix: changing defaultTasksView must not change the current view mid-session
[x] T4 - Fix: changing timeAxisDirection must update the current graph view
[x] T5 - Fix: changing timeAxisPosition must update the current graph view

## P18 - User Management View
[x] T1 - Build User Management view (list users with task count summary by status)

## P19 - Delete Task UI
[x] T1 - Add delete button to Task Detail panel with inline confirmation

## P20 - Notification Task Selection
[x] T1 - Clicking a notification selects the task in the active view (graph: opens detail panel; list: scrolls to and highlights row), navigating to the dashboard first if needed

## P21 - Clear Read Notifications
[x] T1 - Add DELETE /notifications/read API endpoint to delete all read notifications for the current user
[x] T2 - Add "Clear Read" button to notification list popup (visible only when read notifications exist)

## P22 - Documentation Views
[x] T1 - Build About view (application description, developer info)
[x] T2 - Build FAQ view
[x] T3 - Build User Guide view (step-by-step instructions with screenshots)

## P23 - Avatar Persistence
[x] T1 - Mount Docker volume for avatar storage so uploads persist across redeployments

## P24 - End-to-End Testing
[x] T1 - E2E: user registration and login flow
[x] T2 - E2E: create, edit, and delete a task
[x] T3 - E2E: add and remove task dependencies with constraint validation
[x] T4 - E2E: task graph drag-and-drop repositioning
[x] T5 - E2E: real-time notification delivery via WebSocket

## P25 - Task Date Manipulation via Drag
[x] T1 - Snap utility: given a pixel position, resolve nearest snap target (time axis tick or other task's start/end date)
[x] T2 - Constraint bounds utility: given a task and operation (move/resize-start/resize-end), compute the valid movement corridor from all relationship constraints
[x] T3 - Full card drag to move task: drag card body shifts both dates by the same delta
[x] T4 - Move visual feedback: ghost card + dual alignment lines at projected start/end + corridor band with hard limit lines
[x] T5 - Edge handle (start/end) drag to resize: drag constrained-side handle adjusts that date only
[x] T6 - Resize visual feedback: single alignment line at projected date + corridor band for the dragged anchor
[x] T7 - Enforce corridor: task/handle cannot be dragged past corridor bounds; snaps to boundary if approaching
[x] T8 - Snap integration: snap to tick and to other tasks' dates during move and resize (snap targets outside corridor are ignored)
[x] T9 - Fix: corridor band for move drags spans full task extent (earliest leading-edge to latest trailing-edge position)
[x] T10 - Fix: separate resize handles and anchor widgets spatially so edge handles are independently clickable
[x] T11 - Fix: PUT /tasks/{id} validates all existing relationship constraints; returns 422 on violation
[x] T12 - Fix: end-only task move-drag clamping was off by CARD_WIDTH; extract clampMoveDelta and add enforcement tests for all relationship types

## P26 - Free Anchor Cascade During Drag
[x] T1 - Add naturalAnchorPx utility: compute implied pixel position for a free (null) anchor based on card rendering
[x] T2 - Add computeCascadeUpdates: for given new task position, return map of related task IDs → cascaded free anchor pixel positions
[x] T3 - Consolidate all constraint logic into dragConstraints.ts (remove inline clamping from TaskGraph.tsx)
[x] T4 - Render cascaded task cards in real time during drag (re-render related task at cascade position)
[x] T5 - On drop, save cascaded anchor dates via API for each affected task
[x] T6 - Tests: naturalAnchorPx for all anchor/task combinations
[x] T7 - Tests: computeCascadeUpdates for all four relationship types × fixed/free anchor combinations

## P27 - Graph Zoom Controls
[x] T1 - Add zoom in/out buttons and a slider to the graph view toolbar
[x] T2 - Support mouse-wheel zoom on the graph canvas
[x] T3 - Restrict zoom-out to at most 20% beyond the end-to-end span of the graph

## P28 - Graph Mini-Map
[x] T1 - Build mini-map overlay showing the full graph extent at reduced scale
[x] T2 - Highlight the currently visible viewport region on the mini-map
[x] T3 - Click/drag on the mini-map to pan the graph viewport

## P29 - Undo / Redo
[x] T1 - Define command interface (execute / undo) and session-scoped command-history stacks
[x] T3 - Implement commands for task-position drag
[x] T4 - Implement commands for task-detail modifications (title, dates, assignee, etc.)
[x] T5 - Add undo/redo keyboard shortcuts (Ctrl+Z / Ctrl+Y) and toolbar buttons
[x] T6 - Unit tests: command-stack behaviour and all command types

## P30 - Task Graph Layout Fixes
[x] T1 - Fix relationship widget placement: widgets must always point forwards or backwards relative to the time axis
[x] T2 - Fix vertical layout task width: match the aspect ratio of tasks in horizontal layout
[x] T3 - Fix relationship widget interaction: add a gap between widget and task edge; remove grow-on-hover behaviour

## P31 - Vertical View Fixes
[x] T1 - Increase vertical task minor-axis (card width) to 2× standard minor-axis (104 px); expand lanes to fill available viewport width
[x] T2 - Show info section in vertical mode as two rows: due status label on row 1, relationship counters on row 2
[x] T3 - Fix constrained/unconstrained border styling in vertical mode: start → top edge, end → bottom edge
[x] T4 - Fix time axis tick labels in vertical mode: always horizontal, wrap long text, must not affect axis width

## P32 - Task Item Info Layout
[x] T1 - Title always at top; info section (due status + pred/succ counts) always at bottom
[x] T2 - Horizontal: info bar absolutely positioned spanning full card width so pred/succ reach the physical card edges
[x] T3 - Vertical: info section as two rows (due status row 1; pred left + succ right row 2)
[x] T4 - Vertical reduced display: hide info section when both-constrained card height < 2 × standard minor-axis (104 px); hover-expand to full height after 500 ms

## P33 - Graph Layout Direction Toggle
[x] T1 - Add horizontal/vertical layout direction toggle button to the action panel
[x] T2 - Toggle updates the graph immediately and persists the choice to user configuration

## P34 - Mini-Map Visual Polish
[x] T1 - Add styled frame to mini-map (border, rounded corners, semi-transparent background)
[x] T2 - Render period bands as faint coloured strips in the mini-map background
[x] T3 - Render current-time indicator line on the mini-map

## P35 - Settings UI Layout
[x] T1 - Add 'General' section (Default Tasks View, Auto-Save Delay) and align all settings sections at the same indentation level

## P36 - Task Item Open-End Fade-Out
[ ] T1 - Replace dashed border on unconstrained sides with a gradient fade-out overlay
[ ] T2 - Ensure fade-out does not obscure task title or info section
