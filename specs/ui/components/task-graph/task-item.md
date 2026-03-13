# Task Item
Shows a succint view of a task within the graph.

Contains the following:
- Title
- Status
    - Task status affects the colour of the task title and border 
- Details
- Summaries:
    - Time remaining (or time overdue)
    - Downstream dependent tasks
        - Count
        - List of titles (with hyperlinks)
    - Upstream task dependencies
        - Count
        - List of titles (with hyperlinks)

## Predecessor/successor widgets
The task item is rendered with predecessor/successor widgets at the front and back.  These can be used create a relationship between one task and another by dragging a predecessor/successor widget from one task to another.  The widgets are only active if the relationship is valid (i.e., the predecessor/successor task is not already a predecessor/successor of the other task, and the relationship does not create a cycle in the graph).

Validation:
- Start date: Predecessor < this task < Successor
- Completion date: Predecessor < this task < Successor

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
