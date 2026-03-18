# Task Graph
A component which displays the user's tasks in a graph format, showing the relationships between tasks and their due dates.  This is intended to give the user a visual overview of their tasks and how they are related to each other, as well as how they are distributed over time.

It contains the following features:
- A graph component of all tasks
- The time axis shows a timeline from the future to the past
- The user may filter the displayed tasks by some attribute
    - Missing sections of the graph are displayed as dashed sections
- A line across the timeline indicates the present moment.
- A band across the timeline indicates the current time block.


## Graph Panel
The graph panel displays the graph of tasks and their relationships.  It also contains the following componenents:
- Time axis - Along the edge of the graph panel (as configured).
- Filter panel - At the top of the graph panel.
- Task detail panel - On the right edge of the graph panel, only when a task is selected.
- Action panel - At the bottom of the graph panel.


### Task items
Each task item in the graph provides a succinct view of a task.  It provides enough information to be useful without overwhelming the user.  The task item is coloured according its status.

Open-ended tasks (those with no start date and no end date — i.e., no timing constraints on either end) are positioned at the end of the Present time period on the graph.

**Ordering**: In horizontal mode, tasks are arranged left-to-right by their anchor date (start date if set, otherwise end date).  In vertical mode, tasks are arranged top-to-bottom by anchor date.  Open-ended tasks appear last.  This order is stable and does not change when relationships are added or removed.

#### Layout Modes

**Horizontal** (default): Time runs left-to-right.  Tasks are placed in vertical columns; each column holds tasks that share the same anchor-date slot.  Column width is fixed.

**Vertical**: Time runs top-to-bottom.  Tasks are placed in horizontal rows; each row holds tasks that share the same anchor-date slot.  Column (lane) width expands dynamically to fill all available viewport width — `effectiveColWidth = max(COL_WIDTH, floor((viewportWidth − axisSize) / numColumns))` — so no large empty gaps appear in wide viewports.  When direction switches to Vertical the view scrolls to centre on the current date automatically.

**Selection**: Clicking a task selects it and opens the task detail panel.  Clicking the canvas background deselects the current task and closes the panel.

For details of task items, see `task-item.md`.

### Time axis
The time axis is displayed along the edge of the graph panel.  It shows a timeline from the past to the future, with ticks at regular intervals indicating the passage of time.  The display of the time axis is configurable by the user.

For details of the time axis, see `time-axis.md`.


### Filter Panel
A floating panel allows the user to filter the displayed tasks by some attribute.  The user may select from:
- Text search (title or description)
- Assignee
- Priority
- Tags
- Completion status
- Due status
- Start date
- End date


### Task Detail Panel
The details panel is displayed on the right edge of the screen, and shows details of the currently selected task.

For details of the task detail panel, see `task-detail.md`.


### Action Panel
An action panel is present at the bottom of the graph panel.

It contains buttons for:
- Add task
- Toggle open-ended tasks (show/hide tasks with no timing constraints)
