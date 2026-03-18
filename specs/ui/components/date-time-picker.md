# DateTimePicker

A custom date/time picker component replacing the native `datetime-local` input for task start and end dates.

## Behaviour

### Date-first
The user selects a date first. A time field appears beneath it once a date is chosen, but is optional — the user may leave it blank to accept the default time.

### Smart defaults
When a date is selected and no time has been explicitly entered:
- **Start dates** → `00:00` (beginning of day)
- **End dates** → `23:59` (end of day)

### Confirm button
A **Confirm** button explicitly commits the selected value and closes the picker. The picker does not close on blur or click-away — only on Confirm or Clear.

### Clear
A **Clear** button removes the current value. It is only shown when a value is already set.

## Display
The trigger button shows the current date and time in a human-readable format (e.g. `Jan 1, 2026 · 00:00`), or a `Select date…` placeholder when no value is set.

## Usage
Used in:
- Task Detail panel — start and end date fields
- Add Task modal — start and end date fields
