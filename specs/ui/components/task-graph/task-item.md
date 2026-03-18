# Task Item
Shows a succint view of a task within the graph.

Contains the following:
- Title
- Status
    - Task status affects the colour of the task title and border
- A bottom info row with three slots:
    - Left: predecessor count (e.g. `← 3`)
    - Centre: due status label (e.g. `2d overdue`, `due today`, `5d left`)
    - Right: successor count (e.g. `2 →`)

Example bottom row: `← 3   2d overdue   2 →`

## Anchor widgets
The task item is rendered with anchor widgets at the front and back.  These can be used create a relationship between one task and another by dragging an anchor widget from one task to the anchor widget of another.  Once a widget starts being dragged, only target widgets for valid relationships are visible.

When dragging an anchor widget to form a relationship, the earlier widget is always the predecessor, and the later widget is always the successor.  If the anchor widgets have the same date, then only an end to start relationship is valid, and the predecessor is always the end anchor's task, and the successor is always the start anchor's task. 

For example, dragging the end anchor of Task A to the start anchor of Task B creates a the following relationship:
- If end(A) < start(B), then predecessor=Task A, successor=Task B
- If start(B) < end(A), then predecessor=Task B, successor=Task A
- If end(A) = start(B), then predecessor=Task A, successor=Task B (only end to start relationship is valid)

Validation:
- Relationship anchor sequence: The predecessor anchor date cannot be after the successor anchor date.
- No cycles: A task cannot be an predecessor or successor of itself

## Time Constraint Display

Task items are positioned and sized based on their timing constraints.

### Standard Content Width
Task items have a standard content width, large enough to display all content elements succinctly.

### Constrained/Unconstrained Sides
Each side (start side and end side) indicates whether it is constrained:
- **Constrained side** (has a date): displayed with a solid buffer (sharp, solid edge cap)
- **Unconstrained side** (no date): displayed with a soft buffer (gradient fade-out edge)

### Placement Rules
**One side constrained** — card uses the standard content width:
- Only end date set: end side of card aligns to the end date
- Only start date set: start side of card aligns to the start date

**Both sides constrained** — card spans from start date to end date:
- If the span ≥ standard content width:
  - Content is displayed at the standard width, centred within the span
  - If the card is partially scrolled out of the viewport, the content remains in view
- If the span < standard content width (reduced display):
  - Only the task title is shown
  - Hovering for >500 ms temporarily expands the card to standard content width
  - The expanded card may overlap nearby cards and is rendered on top

## Date Manipulation via Drag

### Relationship-Aware Movement Bounds

Each relationship type constrains which anchors must remain in order relative to each other. Before and during any drag operation, the valid movement corridor for the task is computed from all its relationships:

| Relationship type | Constraint |
|---|---|
| **Exclusive** | pred.end ≤ succ.start |
| **HaveStarted** | pred.start ≤ succ.start |
| **HaveCompleted** | pred.end ≤ succ.end |
| **HandOff** | pred.start ≤ succ.end |

When moving a **predecessor**, the constraint places an upper bound on how far right it can move.
When moving a **successor**, the constraint places a lower bound on how far left it can move.
When multiple relationships apply, the effective corridor is the intersection of all individual bounds (tightest lower bound and tightest upper bound).

#### Fixed vs Free Anchors

An anchor date involved in a relationship constraint is either **fixed** (the date is set on that task) or **free** (the date is null/unset). Each free anchor has a **natural position** — the position it occupies visually based on the task's card rendering:

- Free **start** (no startDate): natural position = endDate position − card width
- Free **end** (no endDate): natural position = startDate position + card width

Constraints involving a fixed anchor on the related task generate corridor bounds as normal (the dragged task is clamped). Constraints involving a **free** anchor on the related task do not clamp the dragged task — instead, the free anchor **follows** the dragged anchor in real time.

#### Free Anchor Cascade During Drag

When a drag operation moves an anchor past the **critical point** — the natural position of a related task's free anchor — that free anchor begins following the dragged anchor to visually maintain the constraint:

- As the dragged anchor moves further past the critical point, the related free anchor tracks it exactly.
- If the dragged anchor moves back within the critical point, the free anchor returns to its natural position.
- This cascade propagates transitively: if a cascaded anchor itself crosses another task's free anchor critical point, that anchor also follows.

The related task card is re-rendered in real time to reflect the cascaded anchor position during the drag.

#### On Commit

When the drag is released:
- Free anchors that were pulled past their critical point are saved with their cascaded date values.
- Free anchors that were not past their critical point at drop time remain null (unset).

#### Visual Corridor
When a drag begins, the valid movement corridor is rendered as a semi-transparent highlighted band across the graph. Hard limit lines mark the anchor constraint boundaries. The corridor is derived from fixed anchors only; free anchors do not contribute corridor bounds.

- For **move drags**, the band spans the full range the task can occupy — from the earliest possible leading-edge position to the latest possible trailing-edge position.
- For **resize drags**, the band spans the valid range of the dragged anchor only.

**The drag is clamped at these limits; it is not possible to commit a date that violates a relationship constraint via drag.** If no relationships constrain movement, no corridor band is shown.

### Moving a Task (Full Card Drag)

Dragging the card body (not an anchor widget or edge handle) moves the task in time.

- A ghost card follows the cursor while dragging
- Two alignment lines span the graph at the projected start and end positions
- The relationship-aware movement corridor is shown (see above)
- The task cannot be dragged outside the corridor
- Snapping applies (see **Snapping** below)
- On drop: both start and end dates shift by the same delta
- Tasks with only one date set: only that date shifts; the unconstrained side remains unconstrained
- Open-ended tasks (no dates): cannot be moved this way

### Resizing a Task (Edge Handle Drag)

Constrained sides (those with a set date) show a thin drag handle on hover.

- Dragging the start-side handle adjusts the start date
- Dragging the end-side handle adjusts the end date
- A single alignment line spans the graph at the projected new date
- The movement corridor for the dragged anchor is computed from all relationships involving that anchor and shown as a highlighted band; the handle cannot be dragged outside it
- Snapping applies (see **Snapping** below)
- On drop: the dragged date is updated

### Snapping

During any drag that adjusts a date, the projected date snaps to:

- The nearest time axis tick (interval matches the current zoom level)
- The start or end date of any other visible task (within a pixel proximity threshold)

Snap targets are visually highlighted when active. Snapping never overrides the movement corridor — a snap target outside the corridor is ignored.

## Due Status
The task's due status is determined by its timing and the current time.  Tasks which sit entirely within a time period (i.e., 'Soon Due') are given that status.  Tasks which overlap more than one time period (i.e., Start in 'Present' but End in 'Due Soon') are given a hybrid status (i.e., 'Present/Soon Due').

The task's border are coloured according to their status:
- Blue - Long Due
- Green - Soon Due
- Orange - Due in present time block
- Red - Overdue
- Maroon - Long Overdue
- Gold - Open-ended

Hybrid statuses are coloured with a gradient between the two colours.  For example, a task which is 'Present/Soon Due' would have a gradient from orange to green.
