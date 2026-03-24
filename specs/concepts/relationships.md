# Task Relationships
A relationship connects two tasks as **predecessor → successor**.  The predecessor must be completed (or at least started) before the successor can begin.


## Directionality
- Each relationship has exactly one **predecessor** and one **successor**.
- A task may have multiple predecessors and/or multiple successors.
- Relationships are directional: predecessor → successor (never bidirectional).


## Anchors
The start and end dates of a task are the anchors for relationships.  A relationship is defined through these anchors.


## Relationship Types
Relationships can be of different types, which determine the ordering constraints between the predecessor and successor tasks.  The most common type is "exclusive", where the successor cannot start until the predecessor has completed.  However, other types allow for more flexible relationships.

| Type           | Predecessor < Successor | Description |
| -------------- | ----------------------- | ----------- |
| Exclusive      | End < Start             | Successor cannot start until predecessor completes (most common) |
| Have started   | Start < Start           | Successor cannot start until predecessor starts |
| Have completed | End < End               | Successor cannot complete until predecessor completes  |
| Hand-off       | Start < End             | Successor cannot complete until predecessor starts (e.g., a task which is waiting on the output of another task, but can be started before that task is complete) |

## Constraints

### No cycles
The dependency graph must be a directed acyclic graph (DAG).  Adding a relationship that would create a cycle is rejected.

### Ordering
The ordering must conform to the rules of the relationship type.  For example, an "exclusive" relationship requires that the predecessor's end date is before the successor's start date.  An attempt to add a relationship which violates these constraints is rejected.

---

## Implied dates

A task with no explicit date may still carry an implied position derived from its relationships:

- **Implied start** — if the task has an exclusive predecessor with an end date, its flexible start is that predecessor's end date.
- **Implied end** — if the task has an exclusive successor with a start date, its flexible end is that successor's start date.
- Implied positions are used for graph layout only; they are not stored on the task.

---

## Graph visualisation

- Relationships are drawn as direct arrows from a predecessor's anchor to a successor's anchor.
- Routing should prefer the shortest valid path; only a small bend is allowed when needed for readability.
- For nearby tasks, arrows must not use large detours or sweeping loops.
- Arrow routing should be deterministic and stable: unchanged task positions produce unchanged arrow paths.
- Each arrow's arrowhead aligns with the curve's arrival direction (not perpendicular to the card surface).
- Arrows always arrive at the target anchor from the backward side relative to the time axis, so direction always reads forward in time.
- Arrows involving a task outside the current filter set are shown as dashed lines.
- Arrows connected to the selected task are highlighted.
- Layering rules (z-order):
  - Default: task cards render above relationship arrows.
  - Task selected: arrows connected to the selected task render above task cards for the duration of that selection.
  - Relationship selected: the selected relationship renders above all task cards and all other arrows.
- Clicking a relationship line selects it: the line and its two anchor tasks are highlighted, and relationship actions become available.
- Relationship type is encoded on every arrow using a combined style system:
  - **Icon + badge (primary)**
    - A compact midpoint badge is rendered on each arrow.
    - The badge includes a type icon and short token:
      - Exclusive: lock + `EX`
      - Have started: play + `HS`
      - Have completed: check + `HC`
      - Hand-off: handoff/exchange + `HO`
    - Badge orientation follows arrow direction and remains legible in both horizontal and vertical graph modes.
  - **Colour support (secondary)**
    - Relationship arrows use distinct type colours:
      - Exclusive: Slate `#475569`
      - Have started: Blue `#2563EB`
      - Have completed: Green `#16A34A`
      - Hand-off: Amber `#D97706`
    - The arrow stroke and midpoint badge border/background use the mapped type colour.
    - Meaning must remain unambiguous without colour.
    - Colour contrast must remain readable on light and dark task-graph backgrounds.
    - Selected and hover states must preserve type distinction (icon + token always visible).
  - **Tooltip (tertiary)**
    - Hovering or focusing the badge shows the full relationship type name.
- Midpoint interaction and action placement:
  - The relationship type badge owns the exact visual midpoint of the arrow.
  - The delete action is shown only when that relationship is selected.
  - The delete button is rendered adjacent to the midpoint badge (not on top of it), offset from the arrow by a fixed gap.
  - If the default side overlaps a task card or exits the viewport, the delete button flips to the opposite side.
  - If both sides are constrained, the delete button shifts along the arrow away from the nearest task until visible.
  - The badge remains visible while the delete button is shown.
- A new relationship can be created by dragging an anchor widget of a task onto an anchor widget of another task.
  - Dragging is only permitted when the resulting relationship would be valid.
