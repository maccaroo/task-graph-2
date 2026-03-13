# Time Axis
The time axis is displayed along the edge of the graph panel.  It shows a timeline from the past to the future, with ticks at regular intervals indicating the passage of time.

The display of the time axis is configurable by the user.  It must always align with the flow of time in the graph (i.e. if time flows from left to right, the time axis must be displayed along the top or bottom edge of the graph panel).

The ticks on the time axis must adapt to the zoom level of the graph, showing more or less detail as appropriate.  For example, at a high zoom level, the ticks may show hours or days, while at a low zoom level they may show months or years.

## Time Period Bands
The time axis displays coloured background bands for each time period, using the same colours as task item borders:

| Period       | Colour |
|--------------|--------|
| Long Overdue | Maroon |
| Overdue      | Red    |
| Due Today    | Orange |
| Due Soon     | Green  |
| Long Due     | Blue   |

Each band spans the region of the axis for its time period, and shows the period name as a label.  Period boundaries match the due-status thresholds used for task items.

## Ticks
Only major ticks display date labels to avoid crowding.  Minor ticks are shown as short tick lines only.

## Style
The time axis should be visually distinct from the task items, but within the overall design of the graph.

It should float over the graph panel, and not take up any space within the graph itself.  It should be semi-transparent, so that it does not obscure the tasks in the graph.
