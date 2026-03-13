# Task Detail
The task details component is displayed on the right edge of the screen, and shows details of the currently selected task.  

The fields in the task details component are editable, and changes are persisted immediately.  This allows the user to quickly update their tasks without having to navigate to a separate edit view.  The user can also update the task's completion status by clicking a checkbox, which is also persisted immediately.

It contains the following features:
- Title
- Description
- Assignee
- Completion status [Complete | Incomplete]
- Timing
    - Start
        - Type [None | Fixed | Flexible]
        - Date/Time
    - End
        - Type [None | Fixed | Flexible]
        - Date/Time
    - Duration
- Relationships
    - Predecessors
        - Count
        - List of titles (with hyperlinks)
    - Successors
        - Count
        - List of titles (with hyperlinks)

## Title
The title is a short, descriptive name for the task.  It should be concise and informative.

This is a required field.

## Description
The description is a longer, more detailed explanation of the task.  It should provide enough information for the user to understand what the task is and how to complete it.

This is an optional field.

## Assignee
The assignee is the user who is responsible for completing the task.  This may be the current user, or it may be another user.

This is an optional field.

## Completion Status
A task's completion status is either complete or incomplete.  A task is complete when it has been marked as complete by the user.

This defaults to incomplete, and is updated manually by the user when they complete the task.

## Timing
The task's timing describes when the task is expected to be performed.  These fields are optional, meaning that a task can be open-ended.

### No Timing
When a task has no timing, it is open-ended.  This means that there is no expected start or end date for the task, and it can be performed at any time.  This is useful for tasks which are not time-sensitive, or for tasks which are waiting on some other task to be completed before they can be started.

These tasks should be displayed in a way which indicates that they are open-ended, such as by using a dashed border or a different colour.

### Fixed Timing
When a task needs to start or end by a certain date, the timing is fixed.  

I.e., an exam is a task with a fixed start (and usually) end time, as the user must take the exam within that time window.

### Flexible Timing
When a task needs to start or end by a certain date, but that date is not yet known, the timing is flexible.  In this case, the task may have a 'no earlier than' or 'no later than' date, which indicates the earliest or latest possible start or end date for the task.  This date, on which the task is dependent, may explicitly entered by the user, or may be implied by the task's dependencies.

I.e., submitting an annual tax return is a task with a flexible start time (you may be waiting on receipt of a document before you can start the task), but a fixed end time (the tax return must be submitted by a certain date).

### Duration
A task's duration is the amount of time it is expected to take to complete. This is locked if both start and end times are fixed.  Otherwise,  if the timing is flexible, it can be manually entered by the user, or automatically calculated based on the task's dependencies.  This is useful for tasks which are expected to take a certain amount of time, but which may not have a fixed start or end date.


## Relationships
The task's relationships describe how the task is related to other tasks.  Tasks which must be completed before the selected task may proceed are called predecessors, and tasks which are unblocked once the select task completes are called successors.  These relationships are used to determine the task's position in the graph, and to provide context for the task.  They are also used to determine the task's timing, as a task cannot start until all of its predecessors are complete, and must end before any of its successors can start.
