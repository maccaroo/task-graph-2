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

- Relationships are drawn as curved arrows from a predecessor's anchor to a successor's anchor.
- Arrows involving a task outside the current filter set are shown as dashed lines.
- Arrows connected to the selected task are highlighted.
- A new relationship can be created by dragging an anchor widget of a task onto an anchor widget of another task.
  - Dragging is only permitted when the resulting relationship would be valid.
