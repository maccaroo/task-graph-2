# Task Graph

A task tracking application for interdependent tasks.  Tasks can have thier own due dates, but also inherit constraints from dependent tasks.


# Graph Visualisation
The application presents tasks in an easy to understand graph format.  The graph view shows tasks on a timeline as well as their relative dependencies.  Users can add new tasks and dependencies via an intuitive interface.

```mockup
 Long overdue        Overdue             Present            Soon Due           Long Due
|-------------------|------------------|[================]|------------------|-------------------|
      ┌──────┐           ┌──────┐       ┌──────┐  ┌──────┐     ┌──────┐       ┌──────┐ 
      │  T1  │---------->│  T3  │---┬-->│  T5  │->│  T7  │---->│  T8  │---┬-->|  T10 │-┐
      └──────┘           └──────┘   |   └──────┘  └──────┘     └──────┘   |   └──────┘ |
                                    |                                     |            |
         ┌──────┐        ┌──────┐   |        ┌──────┐          ┌──────┐   |            |  ┌──────┐ 
         │  T2  │        │  T4  │---┘        │  T6  │--------->│  T9  │   └------------┴->│  T12 │ 
         └──────┘        └──────┘            └──────┘          └──────┘                   └──────┘ 
```

Ideas like 'Present', 'Soon Due' and 'Long Due' are visual guides to help users understand tasks relative to the timeline.  Tasks in each time period are styled differently to make it clear where they are in time.

Tasks with dependencies are connected by arrows, with the direction of the arrow indicating the direction of the dependency.  The graph is interactive, allowing users to click on tasks to view details, edit them, or add new tasks and dependencies.

Dragging a task to a new position on the timeline will update its due date accordingly (if appropriate), while maintaining any constraints from dependencies.  Tasks can not be dragged to a position that violates their dependencies (e.g. a task cannot be dragged to a position before its predecessor tasks).
