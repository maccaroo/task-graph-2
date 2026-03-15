
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