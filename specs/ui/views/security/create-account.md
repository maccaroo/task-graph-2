# Create Account view
Asks for user's personal details to create their profile.

Contains:
- First Name (required)
- Last Name (required)
- Username (required)
	- Username requirements clearly shown
- Email (required)
- Password (required)
	- Password complexity requirements clearly shown

Validates:
- All required fields present
- First Name and Last Name valid 
	- Allow alpha, numbers, dashes, underscores, spaces, apostrophes
- Username is not already in system
- Username valid
	Allow alpha, numbers, dashes, underscores
- Email valid
- Password complexity achieved
	Len >= 8
