# Components

## Key view components:



## Ancillary view components

### Login
- Redirect to login if the user does not have a valid token
- Requires user to login
- Once logged


### User Profile - popup
Display the current user's personal details, followed by configuration overrides

This component appears as a popup over the application.
**User Settings**:
It contains the following:
- Profile picture 
    - Displays with a fixed size and square aspect
    - Allow user to upload a new image (up to 10MB)
    - Allow user to select a fixed-aspect section from their uploaded image to be used as their profile picture
    - Persist only the cropped image
- Username (read only)
- First Name
- Last Name
- Email

- Reset password button
    - Opens the `Password Reset Request` view



### (General) User Management
- Shows users
- Shows task count summary by status for each user


### Statusbar
The statusbar appears across the top of the application at all times.

It shows the following:
- The logged in user
    - A profile pic icon
    - The user's First Name and Last Name
- A notifications counter
    - A notificatin icon
    - An indicator of the number of unread notifications
- Filters
    - (TODO: Add feature description)
- A search bar 
    - (TODO: Add feature description)

**Behaviour**:
- **When** the user clicks on the logged in user
    **Then** the following list of options appears:
        - "Open user profile" - Opens the current user's Profile component when clicked
        - "Logout" - Logs out the current user when clicked
- **When** the user clicks on the notifications counter
    **Then** the notications component is displayed


### Notification list - popup
A list of notifications for the user.

This component appears as a popup over the application.