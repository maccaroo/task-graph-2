# Task item visualisation
Task item graph visualisation need updates
- The sides of a task item must indicate whether they are constrained
	- A constrained side must be displayed with a solid buffer
	- An unconstrained side must be displayed with a soft buffer
- Task items should have a standard display width for their *content*
	- The width must be sufficient to succinctly display the task item elements
- A task item's placement on the graph must indicate its time constraints
	- Task items with only one side constrained must display with the standard content width
		- If only an end date is set, the end of the task must line up with its end date
		- If only a start date is set, the start of the task must line up with its start date
	- Task items with both sides constrained must span from start to end date
		- If the content display width is wider than the standard width
			- Display the content centred in the task item
			- If the task is partially out of the graph viewport, ensure the content is in view
		- If the content display width is narrower than the standard width, display a reduced task item 
			- Display only the task name as content
			- When hovering over  task for more than 500ms, temporarily expand the task to the standard content size
				- The may overlap nearby tasks in the view
				- Ensure the expanded task is on top

# De-selecting
Clicking off a task should de-select it

# Task ordering
The task items must not immediately reorder when a new relationship is added - That is disorienting for the user.
Don't use the topological method.  Pick tasks using the order of their start when arranging them.  

# Creating relationships
Dragging the widget to form a relationship often doesn't work.  There's no explanation, it just doesn't get created.  Since only valid endpoints should be visible, this doesn't make sense.

# Removing relationships
I should be able to select a relationship by clicking on the line
It should show the details of the relationship: type, pred/succ anchors

# Visualising relationships
Relationship arrows are sometimes hidden behind the task (esp when the target is the end date).

# Dragging tasks
The task isn't rendered when being dragged.  The task and all its relationships should be shown as it's dragged around.

# Task item visualisation
- The bottom row should display the predecessors and successors at the sides, with the due status in the middle.  Use this layout:
	```
	<- 3   2d overdue   2->
	```