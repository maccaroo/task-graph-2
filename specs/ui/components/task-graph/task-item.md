# Task Item
Shows a succint view of a task within the graph.

Contains the following:
- **Title** — always displayed at the **top** of the task item
- **Due status label** — always displayed at the **bottom** of the task item
- **Predecessor count indicator** (e.g. `← 3`) — at the **start (backward) edge** of the card
- **Successor count indicator** (e.g. `3 →`) — at the **end (forward) edge** of the card

### Horizontal mode layout
The info section is absolutely positioned at the bottom of the card and spans the full physical card width:
- Predecessor count at the left (start) edge
- Due status label centred
- Successor count at the right (end) edge

For both-constrained cards wider than the standard major-axis size, the title is displayed in a sticky content box that remains in view when the card is scrolled horizontally. The info bar still spans the full physical card width.

### Vertical mode layout
The info section is displayed as two rows at the bottom of the card:
- Row 1: due status label (centred)
- Row 2: predecessor count on the left, successor count on the right

## Anchor widgets
The task item is rendered with anchor widgets at the backward and forward ends relative to the time axis. In horizontal mode they sit near the left and right edges; in vertical mode they sit near the top and bottom edges.

Widget placement rules:
- Widgets are positioned inside the task card boundary, in a dedicated edge margin between the card border and content area.
- Widgets must never protrude outside the card box.
- Widget placement must not overlap title or info content.
- Widgets are highlighted on hover but do not grow in size.

Overlap and interaction rules:
- When tasks are visually close, each widget remains visually attached to its own task and does not drift between cards.
- Widgets must keep a minimum hit-target size of 24 x 24 px.
- If two widget hit areas intersect, pointer targeting is resolved by nearest widget centre; ties resolve to the top-most rendered task.
- During anchor drag, valid targets are emphasized and invalid targets are suppressed to reduce accidental selection.

These can be used create a relationship between one task and another by dragging an anchor widget from one task to the anchor widget of another.  Once a widget starts being dragged, only target widgets for valid relationships are visible.

When dragging an anchor widget to form a relationship, the earlier widget is always the predecessor, and the later widget is always the successor.  If the anchor widgets have the same date, then only an end to start relationship is valid, and the predecessor is always the end anchor's task, and the successor is always the start anchor's task. 

For example, dragging the end anchor of Task A to the start anchor of Task B creates a the following relationship:
- If end(A) < start(B), then predecessor=Task A, successor=Task B
- If start(B) < end(A), then predecessor=Task B, successor=Task A
- If end(A) = start(B), then predecessor=Task A, successor=Task B (only end to start relationship is valid)

Validation:
- Relationship anchor sequence: The predecessor anchor date cannot be after the successor anchor date.
- No cycles: A task cannot be an predecessor or successor of itself

## Dimensions

Each task card has a **major axis** (aligned with the time axis) and a **minor axis** (perpendicular to it). In horizontal mode the major axis is horizontal; in vertical mode it is vertical.

- **Standard major-axis size**: 180 px — used as the default card extent along the time axis for non-spanned tasks, and as the minimum height for spanned vertical tasks.
- **Standard minor-axis size**: 52 px in horizontal mode; 104 px (2×) in vertical mode, to accommodate left-to-right readable text.

## Time Constraint Display

Task items are positioned and sized based on their timing constraints.

### Constrained/Unconstrained Sides
Each side (start side and end side) indicates whether it is constrained. "Start" and "end" refer to the backward and forward ends along the time axis respectively — in horizontal mode these are left/right; in vertical mode these are top/bottom.

- **Constrained side** (has a date): displayed with a solid coloured border cap on that edge
- **Unconstrained side** (no date): displayed with a fade-out effect — a gradient overlay on that edge blends the card into the background. The gradient must not obscure the task title or info section; it is confined to the edge region of the card away from the content.

### Placement Rules
**One side constrained** — card uses the standard major-axis size:
- Only end date set: end side of card aligns to the end date
- Only start date set: start side of card aligns to the start date

**Both sides constrained** — card spans from start date to end date along the major axis:
- If the span ≥ standard major-axis size:
  - Content is displayed at the standard size, centred within the span
  - If the card is partially scrolled out of the viewport, the content remains in view
- If the span < standard major-axis size (reduced display):
  - The info section is omitted when there is insufficient space to display it alongside the title without overlap
  - Hovering for >500 ms temporarily expands the card to the standard major-axis size (180 px), revealing the info section
  - The expanded card may overlap nearby cards and is rendered on top
  - **Vertical mode threshold**: insufficient space is determined when the span height is less than 2 × standard minor-axis size (104 px)

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
