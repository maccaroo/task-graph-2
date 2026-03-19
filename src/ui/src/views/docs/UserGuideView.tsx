import { useRef } from 'react'
import styles from './DocsView.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

interface GuideSection {
  id: string
  title: string
  subsections: GuideSubsection[]
}

interface GuideSubsection {
  title: string
  steps: string[]
  screenshot?: boolean
}

// ── Data ─────────────────────────────────────────────────────────────────────

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    subsections: [
      {
        title: 'Logging in / registering',
        steps: [
          'Navigate to the application URL.',
          'If you have an account, enter your username and password and click "Login".',
          'To create an account, click "Create account", fill in all required fields, and submit.',
        ],
        screenshot: true,
      },
      {
        title: 'Navigating the app',
        steps: [
          'The Statusbar at the top provides navigation to Tasks, Graph, Users, and Docs.',
          'Click "Tasks" to view the task list, or "Graph" to open the graph view.',
          'Your user name and notification bell are in the top-right corner.',
        ],
        screenshot: true,
      },
    ],
  },
  {
    id: 'managing-tasks',
    title: 'Managing Tasks',
    subsections: [
      {
        title: 'Creating a task',
        steps: [
          'Open the Task List or Graph view.',
          'Click the "Add Task" button.',
          'Enter a title (required) and optional fields: dates, assignee, priority, tags.',
          'Click "Save" to create the task.',
          'Note: priority and tags can only be set at creation time.',
        ],
        screenshot: true,
      },
      {
        title: 'Editing task details',
        steps: [
          'Click a task in the list or graph to open the Task Detail panel on the right.',
          'Edit title, description, assignee, dates, or completion status — changes are auto-saved after the configured delay.',
          'To change the auto-save delay, open User Profile → Settings.',
        ],
        screenshot: true,
      },
      {
        title: 'Deleting a task',
        steps: [
          'Open the Task Detail panel for the task.',
          'Click "Delete" in the bottom-left of the panel.',
          'Confirm by clicking "Yes" in the inline confirmation prompt.',
        ],
      },
      {
        title: 'Understanding task status colours',
        steps: [
          'Colours follow a linear progression from furthest future to furthest past:',
          'Blue — long due (far ahead in the future).',
          'Green — soon due (approaching the present).',
          'Orange — due now (within the present time block).',
          'Red — overdue.',
          'Maroon — long overdue (far past due).',
          'Gold — open-ended (no end date set).',
        ],
      },
    ],
  },
  {
    id: 'graph-view',
    title: 'Graph View',
    subsections: [
      {
        title: 'Reading the timeline',
        steps: [
          'The horizontal axis represents time. Tick labels show hours, days, months, or years depending on zoom.',
          'A vertical line marks the current moment.',
          'A shaded band highlights the current time period.',
        ],
        screenshot: true,
      },
      {
        title: 'Panning and zooming',
        steps: [
          'Hold Ctrl (or Cmd on Mac) and scroll to zoom in or out.',
          'Click and drag on an empty area of the canvas to pan left or right.',
        ],
      },
      {
        title: 'Using zoom controls',
        steps: [
          'Click the + button in the toolbar to zoom in, or − to zoom out.',
          'Drag the slider between the buttons for continuous zoom adjustment.',
          'Zoom out is limited to 20% beyond the full span of the graph so tasks remain visible.',
        ],
      },
      {
        title: 'Using the mini-map',
        steps: [
          'The mini-map overlay in the graph corner shows the entire graph at a reduced scale.',
          'The highlighted region on the mini-map represents the area currently visible in the main canvas.',
          'Click anywhere on the mini-map to jump the viewport to that location.',
          'Drag on the mini-map to pan the graph viewport continuously.',
        ],
        screenshot: true,
      },
      {
        title: 'Repositioning tasks',
        steps: [
          'Drag the body of a task card to move it — both start and end dates shift by the same amount.',
          'Drag the left edge handle to adjust the start date only.',
          'Drag the right edge handle to adjust the end date only.',
          'A visual corridor shows the valid range during drag based on dependency constraints.',
          'Tasks snap to time-axis tick marks and to other tasks\' dates while dragging.',
        ],
      },
      {
        title: 'Adjusting task dates by dragging',
        steps: [
          'While dragging, ghost cards and alignment lines preview the projected position.',
          'Related tasks with free (non-fixed) dates cascade automatically as you drag.',
          'Release to confirm; all affected tasks are saved automatically.',
        ],
      },
    ],
  },
  {
    id: 'undo-redo',
    title: 'Undo / Redo',
    subsections: [
      {
        title: 'Undoing and redoing changes',
        steps: [
          'Press Ctrl+Z (Cmd+Z on Mac) to undo the last action.',
          'Press Ctrl+Y (Cmd+Shift+Z on Mac) to redo a previously undone action.',
          'Undo and redo buttons are also available in the graph view toolbar.',
          'Supported actions include task position drags and task detail edits (title, dates, assignee, and more).',
          'History is session-scoped — it resets when you reload the page.',
        ],
      },
    ],
  },
  {
    id: 'dependencies',
    title: 'Dependencies',
    subsections: [
      {
        title: 'Adding a predecessor or successor',
        steps: [
          'In the graph view, hover over a task to reveal its anchor widgets.',
          'Drag from an anchor widget to another task to create a dependency.',
          'Alternatively, open the Task Detail panel and use the predecessor/successor list.',
        ],
        screenshot: true,
      },
      {
        title: 'Relationship types explained',
        steps: [
          'Exclusive — predecessor must end at or before the successor starts (most common).',
          'HaveStarted — predecessor must start before the successor starts.',
          'HaveCompleted — predecessor must complete before the successor completes.',
          'HandOff — predecessor must start before the successor ends; the predecessor will typically appear mostly after the successor (e.g. a task waiting on an output that arrives mid-task).',
        ],
      },
      {
        title: 'Constraint validation',
        steps: [
          'The system prevents you from setting dates that violate dependency constraints.',
          'If a predecessor end date is later than a successor start date, an error is shown.',
        ],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subsections: [
      {
        title: 'What triggers a notification',
        steps: [
          'You receive a notification when a task is assigned to you.',
        ],
      },
      {
        title: 'Viewing and dismissing notifications',
        steps: [
          'Click the bell icon in the top-right to open the notification list.',
          'Click a notification to mark it as read and navigate to the task.',
          'Unread notifications are shown with a badge count on the bell icon.',
        ],
        screenshot: true,
      },
    ],
  },
  {
    id: 'profile-settings',
    title: 'User Profile & Settings',
    subsections: [
      {
        title: 'Updating profile info and avatar',
        steps: [
          'Click your name in the top-right and select "Open user profile".',
          'Edit your first name, last name, or email, then click "Save".',
          'To upload an avatar, click the avatar area and select an image (max 10 MB).',
          'Drag to crop the image, then confirm.',
        ],
        screenshot: true,
      },
      {
        title: 'Configuring default view, time axis, auto-save delay',
        steps: [
          'Open your user profile and go to the Settings tab.',
          'Choose your default tasks view (Graph or List).',
          'Set the time axis direction (horizontal or vertical) and position.',
          'Adjust the auto-save delay (0–10 seconds; 0 saves immediately).',
        ],
        screenshot: true,
      },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function UserGuideView() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  function scrollTo(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.root}>
      <div className={styles.guideLayout}>
        {/* Sidebar */}
        <nav className={styles.guideSidebar} aria-label="Guide sections">
          <ul className={styles.sidebarList}>
            {GUIDE_SECTIONS.map(section => (
              <li key={section.id}>
                <button
                  className={styles.sidebarLink}
                  onClick={() => scrollTo(section.id)}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className={styles.guideContent}>
          {GUIDE_SECTIONS.map(section => (
            <section
              key={section.id}
              id={section.id}
              ref={el => { sectionRefs.current[section.id] = el }}
              className={styles.section}
            >
              <h2 className={styles.sectionTitle}>{section.title}</h2>

              {section.subsections.map(sub => (
                <div key={sub.title} className={styles.subsection}>
                  <h3 className={styles.subsectionTitle}>{sub.title}</h3>
                  <ol className={styles.stepList}>
                    {sub.steps.map((step, i) => (
                      <li key={i} className={styles.stepItem}>{step}</li>
                    ))}
                  </ol>
                  {sub.screenshot && (
                    <div className={styles.screenshotPlaceholder} aria-label="Screenshot placeholder">
                      Screenshot coming soon
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
