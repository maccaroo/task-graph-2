# Login View
Users must be logged in to use the application.  Redirect to this view if they are not logged in.

## Session expiry
A user's session expires when their JWT token is no longer valid.  The application detects this in two ways:
- **API 401 response**: any request that returns HTTP 401 immediately logs the user out and redirects to this view.
- **Tab visibility**: when the user returns to the application tab, the token expiry is checked proactively.  If the token has expired, the user is logged out and redirected here before any request is made.

## Layout
The main part of the view contains:
- A logo
- Username field
- Password field

Links to:
- Create account
- Forgot password
