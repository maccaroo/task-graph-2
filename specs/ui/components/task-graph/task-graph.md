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
- Zoom controls (left side of the panel):
  - Zoom out button (−)
  - Zoom slider (maps the zoom range logarithmically so small and large zoom levels are equally accessible)
  - Zoom in button (+)
  - Reset zoom button (returns to the default zoom level)


### Mini-Map
A floating overlay in the bottom-right corner of the graph canvas shows the entire graph extent at a reduced scale, helping users navigate large graphs.

- **Scale**: The mini-map renders the full time span (viewStart → viewEnd) and full cross-axis extent (all rows/lanes) compressed into a fixed 200 × 120 px thumbnail.
- **Task items**: Each visible task is drawn as a small coloured rectangle at its scaled canvas position, using the same due-status colour as in the main graph.
- **Viewport indicator**: A semi-transparent rectangle highlights the currently visible portion of the graph canvas. It updates in real time as the user scrolls or zooms.
- **Navigation**:
  - Clicking anywhere on the mini-map centres the viewport on that point.
  - Dragging on the mini-map pans the viewport continuously.
- **Position**: Fixed to the bottom-right corner of the canvas container (inside the scrollable area's visible frame, not scrolled with the canvas), with a small margin from the edges.
- **Visibility**: Always visible when the graph is loaded (no toggle required).


### Undo / Redo

Session-scoped undo and redo for user actions. History is held in memory only and cleared on page reload.

**Supported operations:**
- Task-position drag (move and resize), including cascade updates to related tasks
- Task-detail modifications (title, description, assignee, status, dates, duration)

**Keyboard shortcuts:**
- Undo: `Ctrl+Z` (or `Cmd+Z` on macOS)
- Redo: `Ctrl+Y` or `Ctrl+Shift+Z` (or `Cmd+Shift+Z` on macOS)

**Toolbar buttons:**
- Undo and Redo buttons appear in the action panel (left side, alongside zoom controls).
- Each button is disabled when the respective stack is empty.


### Zoom Behaviour
The graph supports two zoom input methods, both adjusting `pixelsPerDay` (pixels per day on the time axis):

- **Buttons / slider**: Zoom in/out buttons step by ×1.5. The slider maps the full zoom range logarithmically.
- **Mouse-wheel**: Scrolling on the canvas zooms in or out by ×1.15 per step, centred on the mouse position.

**Zoom limits**:
- *Maximum zoom-in*: fixed at 200 px/day.
- *Minimum zoom-out*: dynamic — at most 20% of empty space beyond each end of the span of all tasks with dates. Falls back to 0.3 px/day when no tasks have dates.
