# Task List
A component that shows a list of all tasks in a list view.

It contains the following features:
- A list of all tasks
- Columns: Title, Priority, Tags, Assignee, Start, End, Duration, Status
- The tasks are sorted naturally according to due date
- The user may sort the tasks by another attribute
- The user may filter the tasks by: text, assignee, priority, tags, completion status, due status, date range
- (When sorted by due date) A band across the list shows the current time block
- Task list items are coloured according to their status (as in graph component)
- The user may add a new task by clicking the `Add Task` button
- A toggle controls whether open-ended tasks appear before or after dated tasks in the list
- Clicking a task row opens the Task Detail side panel (same component as the graph view) on the right, allowing the user to view and edit task details without navigating away. Clicking the selected row again, clicking empty space in the list, or closing the panel deselects the task.