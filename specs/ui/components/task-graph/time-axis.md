# Time Axis
The time axis is displayed along the edge of the graph panel.  It shows a timeline from the past to the future, with ticks at regular intervals indicating the passage of time.

The display of the time axis is configurable by the user.  It must always align with the flow of time in the graph (i.e. if time flows from left to right, the time axis must be along the top or bottom edge; if time flows top-to-bottom, it must be along the left or right edge).

The ticks on the time axis must adapt to the zoom level of the graph, showing more or less detail as appropriate.  For example, at a high zoom level, the ticks may show hours or days, while at a low zoom level they may show months or years.

## Direction and Position

### Horizontal (default)
Time runs left-to-right.  The axis is a horizontal bar rendered at the **top** or **bottom** of the canvas.  It uses `position: sticky` so it stays visible while the user scrolls horizontally.

### Vertical
Time runs top-to-bottom.  The axis is a vertical bar rendered at the **left** or **right** of the canvas.  The **left** variant uses `position: sticky` (stays visible during horizontal scroll).  The **right** variant uses `position: absolute` anchored to the right edge of the canvas (within the canvas right-padding reserved for it).

### Bottom / Right positioning
`position: sticky; bottom: 0` has no effect when the axis is the only flow element in the canvas (it always renders at y=0).  Bottom and right axes therefore use `position: absolute; bottom: 0` / `position: absolute; right: 0` to anchor them to the canvas edge.  The canvas always reserves padding equal to the axis thickness (56 px horizontal, 72 px vertical) so task cards are not obscured.

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

Tick labels are always rendered horizontally (never rotated), in both horizontal and vertical axis orientations. Long labels wrap rather than overflow the axis. Labels must not affect the axis width or height — the axis size is fixed regardless of label content.

## Style
The time axis should be visually distinct from the task items, but within the overall design of the graph.

It should float over the graph panel, and not take up any space within the graph itself.  It should be semi-transparent, so that it does not obscure the tasks in the graph.
