# Configuration

## Overview

Task Graph provides configuration options allowing users to customize the application behavior and appearance. Configuration is stored per-user in the database as JSON.

## User Configuration Structure

Configuration is stored as a JSON object:

```json
{
  "defaultTasksView": "Graph",
  "timeAxisDirection": "Horizontal",
  "timeAxisPosition": "Top",
  "autoSaveDelaySeconds": 2,
}
```

## Configuration Categories

### Appearance Settings

#### Default Tasks View

**Type**: Enum (Graph | List)
**Default**: Graph
**Description**: Which view to show when user logs in or navigates to main page.

**Values:**
- `Graph`: Show tasks in visual graph format with timeline
- `List`: Show tasks in tabular list format

#### Time Axis Direction

**Type**: Enum (Horizontal | Vertical)
**Default**: Horizontal
**Description**: Orientation of the timeline in graph view.

**Values:**
- `Horizontal`: Timeline runs left-to-right
- `Vertical`: Timeline runs top-to-bottom

**UI Control**: Radio buttons with visual preview

#### Time Axis Position

**Type**: Enum (Top | Bottom | Left | Right)
**Default**: Top
**Description**: Where to position the timeline relative to the task graph.

**Values:**
- `Top`: Timeline at top (only for Horizontal)
- `Bottom`: Timeline at bottom (only for Horizontal)
- `Left`: Timeline at left (only for Vertical)
- `Right`: Timeline at right (only for Vertical)

**Validation**: Position must match direction:
- Horizontal → Top or Bottom only
- Vertical → Left or Right only

**UI Control**: Radio buttons, disabled options grayed out based on direction

### Behavior Settings

#### Auto-Save Delay

**Type**: Integer (seconds)
**Default**: 2
**Range**: 0 - 10
**Description**: How long to wait after user stops typing before auto-saving changes.

**Values:**
- `0`: Save immediately (no debounce)
- `1-10`: Wait N seconds after last keystroke

**UI Control**: Number input with slider
