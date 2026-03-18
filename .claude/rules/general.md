# General Rules

## Spec-First (Non-Negotiable)
For EVERY user request, before writing any code:
1. Identify and update the relevant spec document(s)
2. Show the spec change to the user and wait for explicit confirmation
3. Only then implement in code

No exceptions — including small changes, CSS tweaks, or bug fixes.

## Code Verification
Ensure the application build is successful and tests pass after code changes are complete - NO EXCEPTIONS!:
- Run all builds
  - `dotnet build`
  - `npm run build`
- Run all unit tests
  - `dotnet test`
  - `npm run test`
- No linting failures
- `npm run lint`
