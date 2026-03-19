# About View

A static view describing the application and its developer.

## Route
`/docs/about`

## Layout
Rendered inside AppShell (Statusbar + main area). No sidebar.

## Sections

### Application
- App name: **TaskGraph**
- Short description: A task tracking application for visualising and managing interdependent tasks on a timeline graph.
- Key feature highlights (bullet list):
  - Graph and list views for tasks
  - Dependency relationships between tasks
  - Real-time notifications
  - Configurable time axis and display
  - Zoom controls and mini-map for graph navigation
  - Undo/redo for task position and detail changes

### Technology
- Frontend: React + TypeScript + Vite
- Backend: .NET / ASP.NET Core
- Database: PostgreSQL
- Real-time: WebSockets

### Developer
- Name / organisation placeholder (e.g. "TaskGraph Team")
- GitHub repo link (placeholder href)

## Navigation
Accessible via a **Docs** nav item in the Statusbar, linking to `/docs/about` as the default documentation landing page.

A secondary navigation bar is rendered at the top of the docs content area (below the toolbar), with tabs linking to **About**, **FAQ**, and **User Guide**. The active tab is highlighted. Shared across all three doc views via a `DocsLayout` wrapper component.
