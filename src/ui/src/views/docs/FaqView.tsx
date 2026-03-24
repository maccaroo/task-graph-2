import { useState } from 'react'
import styles from './DocsView.module.css'

// ── Types ───────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string
  a: string
}

interface FaqCategory {
  title: string
  items: FaqItem[]
}

// ── Data ────────────────────────────────────────────────────────────────────

const FAQ_DATA: FaqCategory[] = [
  {
    title: 'General',
    items: [
      {
        q: 'What is TaskGraph?',
        a: 'TaskGraph is a task tracking application that visualises tasks and their dependencies on an interactive timeline graph. It helps teams understand how work flows through a project and where bottlenecks exist.',
      },
      {
        q: 'Who is TaskGraph for?',
        a: 'TaskGraph is designed for teams and individuals who need to manage tasks with interdependencies — particularly where the timing of one task affects another.',
      },
    ],
  },
  {
    title: 'Tasks',
    items: [
      {
        q: 'How do I create a task?',
        a: 'Open the Task List or Graph view and click the "Add Task" button. Fill in the title and any optional fields (dates, assignee, priority, tags), then save.',
      },
      {
        q: 'What do the task colours mean?',
        a: 'Task colours indicate due status in a linear progression from furthest future to furthest past: blue = long due (far ahead), green = soon due, orange = due now (present time block), red = overdue, maroon = long overdue. Gold indicates an open-ended task with no end date.',
      },
      {
        q: 'What is the difference between Fixed, Flexible, and None for start/end dates?',
        a: 'Fixed means the date is a hard constraint that cannot shift. Flexible means the date is a target that may move with dependencies. None means no date constraint is set for that side.',
      },
    ],
  },
  {
    title: 'Dependencies',
    items: [
      {
        q: 'What is a predecessor/successor relationship?',
        a: 'A predecessor is a task that must be started or completed before another task (its successor) can begin. Arrows on the graph flow from predecessor to successor.',
      },
      {
        q: 'How do I add a dependency between tasks?',
        a: 'On the graph, drag from the anchor widget of one task to another task to create a dependency. Alternatively, use the predecessor/successor list in the Task Detail panel.',
      },
      {
        q: 'What relationship types are available?',
        a: 'Four types are supported: Exclusive (predecessor must end at or before the successor starts — the most common type), HaveStarted (predecessor must start before the successor starts), HaveCompleted (predecessor must complete before the successor completes), and HandOff (predecessor must start before the successor ends — the predecessor will typically appear mostly after the successor, e.g. waiting on an output that arrives mid-task).',
      },
    ],
  },
  {
    title: 'Graph View',
    items: [
      {
        q: 'How do I navigate the graph (pan/zoom)?',
        a: 'Hold Ctrl (or Cmd on Mac) and scroll to zoom in and out. Click and drag on an empty area of the canvas to pan.',
      },
      {
        q: 'How do I zoom using the toolbar controls?',
        a: 'Use the zoom in (+) and zoom out (−) buttons in the graph toolbar, or drag the slider between them. Zoom out is limited to 20% beyond the full end-to-end span of the graph so tasks stay visible.',
      },
      {
        q: 'What is the mini-map?',
        a: 'The mini-map is a small overlay in the bottom-right corner of the graph showing the full graph at a reduced scale. The currently visible area is highlighted. Click or drag anywhere on the mini-map to jump to that part of the graph. When the Task Detail panel is open, the mini-map automatically slides left so it stays visible.',
      },
      {
        q: 'Can I hide the mini-map?',
        a: 'Yes. Open User Profile → Settings → Graph and uncheck "Show mini-map". The change takes effect immediately.',
      },
      {
        q: 'How do I reposition a task?',
        a: 'Drag the body of a task card to move it on the canvas. Drag a start or end edge handle to resize (adjust) that date. All moves are constrained by the task\'s dependency relationships.',
      },
      {
        q: 'How do I adjust a task\'s dates by dragging?',
        a: 'Drag the main body of a task card to shift both dates by the same amount (move). Drag the left or right edge handle to adjust only the start or end date (resize). Snap targets and a visual corridor show valid positions during the drag.',
      },
      {
        q: 'What is the current-time indicator line?',
        a: 'A vertical line on the graph marks the current moment, making it easy to see which tasks are overdue, active, or upcoming relative to now.',
      },
    ],
  },
  {
    title: 'Undo / Redo',
    items: [
      {
        q: 'How do I undo or redo a change?',
        a: 'Press Ctrl+Z (Cmd+Z on Mac) to undo the last action, or Ctrl+Y (Cmd+Shift+Z on Mac) to redo it. Undo and redo buttons are also available in the graph toolbar. Supported actions include task position drags and task detail edits (title, dates, assignee, etc.).',
      },
    ],
  },
  {
    title: 'Notifications',
    items: [
      {
        q: 'When do I receive notifications?',
        a: 'You receive a notification when a task is assigned to you. More notification types may be added in future releases.',
      },
      {
        q: 'How do I mark a notification as read?',
        a: 'Click on a notification in the notification list. This marks it as read and navigates you to the relevant task.',
      },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export function FaqView() {
  return (
    <div className={styles.root}>
      <div className={styles.content}>
        {FAQ_DATA.map(category => (
          <section key={category.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{category.title}</h2>
            <div className={styles.accordion}>
              {category.items.map(item => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function AccordionItem({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`${styles.accordionItem} ${open ? styles.accordionItemOpen : ''}`}>
      <button
        className={styles.accordionTrigger}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span>{q}</span>
        <ChevronIcon open={open} />
      </button>
      {open && <p className={styles.accordionBody}>{a}</p>}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
