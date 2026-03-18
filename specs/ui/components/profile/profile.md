# Profile
A component which displays the current user's profile information, followed by configuration settings.

This component appears as a scrollable modal popup over the application.  If the modal content is taller than the viewport it scrolls internally so all fields remain reachable.

**User Settings**:
- Profile picture
    - Displays with a fixed size and square aspect ratio
    - Allows the user to upload a new image (up to 10 MB)
    - Allows the user to select a fixed-aspect crop of the uploaded image to use as their profile picture
    - Only the cropped image is persisted
- Username (read only)
- First Name
- Last Name
- Email
- Reset password button — opens the `Password Reset Request` view

**Application Settings**:
See `configuration.md` for user-configurable settings.

**Save behaviour**:
- A single **Save** button at the bottom of the form persists all profile and application settings together.
- **Exception**: Time Axis Direction and Time Axis Position take effect **immediately** when their radio button is changed — the API is called at that point and the graph view updates instantly.  These changes do not wait for Save.  They are still included in the Save call so they remain consistent with other settings.

