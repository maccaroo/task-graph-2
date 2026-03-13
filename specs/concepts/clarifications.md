# Clarifications

## Due date
Due date is useful but not required.  Tasks may simply be added as chronologically after another task, but without their own due date.  These tasks may in turn be dependencies for further tasks which themselves do have due dates.  In such cases, the task in the middle has implied due dates.

## Open-ended tasks
Open-ended tasks (no timing) are displayed inline with other tasks on the graph.

Layout positioning rules (implied position only — not stored as a fixed date):
- Has predecessor with end date → suggested flexible start = predecessor's end date.
- No restricting relationships → placed in the present time block.

## Graph layout
Task nodes are auto-positioned based on due dates and dependencies.  Users may pin/override individual node positions; pinned positions are persisted per task.


## Notifications
Two notification types are supported:
- **Task reminders** - user-set reminder on a task; fires at the specified time.
- **Assignment alerts** - automatic; fires when another user assigns a task to you.

Notifications are in-app only (no email).  Once read, the notification is fulfilled.


## Shared tasks
Tasks are shared across all users in a single workspace.
