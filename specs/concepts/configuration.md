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
**Description**: Which view to show when user logs in or navigates to the main page.

**Values:**
- `Graph`: Show tasks in visual graph format with timeline
- `List`: Show tasks in tabular list format

**Apply behaviour**: Takes effect on next visit or page refresh. Changing this setting does **not** switch the active view in the current session.

#### Time Axis Direction

**Type**: Enum (Horizontal | Vertical)
**Default**: Horizontal
**Description**: Orientation of the timeline in graph view.

**Values:**
- `Horizontal`: Timeline runs left-to-right; tasks are arranged in columns by date
- `Vertical`: Timeline runs top-to-bottom; tasks are arranged in rows by date

**Apply behaviour**: Takes effect **immediately** when the radio button is changed — the graph view updates without requiring the user to press Save.

**UI Control**: Radio buttons

#### Time Axis Position

**Type**: Enum (Top | Bottom | Left | Right)
**Default**: Top
**Description**: Where to position the timeline axis relative to the task graph.

**Values:**
- `Top`: Timeline at top (Horizontal only)
- `Bottom`: Timeline at bottom (Horizontal only)
- `Left`: Timeline at left (Vertical only)
- `Right`: Timeline at right (Vertical only)

**Validation**: Position must be compatible with direction:
- Horizontal → Top or Bottom only
- Vertical → Left or Right only

When direction is changed, position is automatically reset to a valid value for the new direction if needed.

**Apply behaviour**: Takes effect **immediately** when the radio button is changed — the graph view updates without requiring the user to press Save.

**UI Control**: Radio buttons; incompatible options are disabled based on the current direction

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
