import { useRef, useState } from 'react'
import type { Task } from '../../services/tasks'
import {
  computeDueStatus,
  computeDueStatusForDate,
  DUE_STATUS_COLOR_VAR,
} from '../../utils/taskStatus'
import { CARD_WIDTH, MS_PER_DAY } from './graphLayout'
import styles from './TaskGraphItem.module.css'

export type AnchorType = 'start' | 'end'

interface TaskGraphItemProps {
  task: Task
  taskMap: Map<string, Task>
  x: number
  y: number
  /** Rendered card width. Defaults to CARD_WIDTH. */
  width?: number
  selected: boolean
  isDragTarget: boolean
  onSelect: (id: string) => void
  onRelationDragStart: (sourceId: string, anchor: AnchorType, clientX: number, clientY: number) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getTimeLabel(task: Task): string | null {
  if (task.status === 'Complete') return null
  if (!task.endDate) return null
  const diffMs = new Date(task.endDate).getTime() - Date.now()
  const days = Math.round(diffMs / MS_PER_DAY)
  if (days > 1)  return `${days}d left`
  if (days === 1)  return '1d left'
  if (days === 0)  return 'due today'
  if (days === -1) return '1d overdue'
  return `${-days}d overdue`
}

/** Compute start-color and end-color for the border gradient (T6). */
function borderColors(task: Task): { startColor: string; endColor: string } {
  const endStatus = computeDueStatus(task)
  const endColor = DUE_STATUS_COLOR_VAR[endStatus]

  if (task.startDate && task.endDate) {
    const startStatus = computeDueStatusForDate(task.startDate, task.status)
    if (startStatus !== endStatus) {
      return { startColor: DUE_STATUS_COLOR_VAR[startStatus], endColor }
    }
  }
  return { startColor: endColor, endColor }
}

const HOVER_EXPAND_DELAY_MS = 500

// ── Component ─────────────────────────────────────────────────────────────

export function TaskGraphItem({
  task,
  x,
  y,
  width = CARD_WIDTH,
  selected,
  isDragTarget,
  onSelect,
  onRelationDragStart,
}: TaskGraphItemProps) {
  const dueStatus = computeDueStatus(task)
  const timeLabel = getTimeLabel(task)
  const { startColor, endColor } = borderColors(task)
  const isGradient = startColor !== endColor

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoverExpanded, setHoverExpanded] = useState(false)

  const hasStartConstraint = Boolean(task.startDate)
  const hasEndConstraint   = Boolean(task.endDate)
  const bothConstrained    = hasStartConstraint && hasEndConstraint

  // A card is "reduced" when both sides are constrained but span < standard width
  const isReduced = bothConstrained && width < CARD_WIDTH

  // Effective rendered width: expand on hover if reduced
  const effectiveWidth = isReduced && hoverExpanded ? CARD_WIDTH : width

  // ── Card click (select) ──────────────────────────────────────────────────

  function handleCardMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(task.id)
  }

  // ── Hover expand (reduced cards only) ────────────────────────────────────

  function handleMouseEnter() {
    if (!isReduced) return
    hoverTimerRef.current = setTimeout(() => setHoverExpanded(true), HOVER_EXPAND_DELAY_MS)
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setHoverExpanded(false)
  }

  // ── Relation widget drag (create predecessor/successor) ──────────────────

  function handleWidgetMouseDown(e: React.MouseEvent, anchor: AnchorType) {
    e.stopPropagation()
    e.preventDefault()
    onRelationDragStart(task.id, anchor, e.clientX, e.clientY)
  }

  // ── Style ────────────────────────────────────────────────────────────────

  const cardStyle = {
    left: x,
    top: y,
    width: effectiveWidth,
    '--start-color': startColor,
    '--end-color': endColor,
    '--status-color': DUE_STATUS_COLOR_VAR[dueStatus],
  } as React.CSSProperties

  const classNames = [
    styles.card,
    isGradient           ? styles.gradient    : '',
    selected             ? styles.selected    : '',
    isDragTarget         ? styles.dragTarget  : '',
    hasStartConstraint   ? styles.constrainedStart   : styles.unconstrainedStart,
    hasEndConstraint     ? styles.constrainedEnd     : styles.unconstrainedEnd,
    isReduced            ? styles.reduced     : '',
    hoverExpanded        ? styles.expanded    : '',
  ].filter(Boolean).join(' ')

  // For wide both-constrained cards, content is standard width and centred,
  // but sticks to the visible portion when the card overflows the viewport.
  const showWideContent = bothConstrained && width >= CARD_WIDTH

  return (
    <div
      className={classNames}
      style={cardStyle}
      onMouseDown={handleCardMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      aria-pressed={selected}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) }
      }}
    >
      {/* ── Start anchor widget T11 ── */}
      <div
        className={styles.widgetStart}
        title="Drag to create a relationship"
        onMouseDown={e => handleWidgetMouseDown(e, 'start')}
        aria-label="Start anchor"
        role="button"
        tabIndex={-1}
      >
        ◀
      </div>

      {/* ── End anchor widget T11 ── */}
      <div
        className={styles.widgetEnd}
        title="Drag to create a relationship"
        onMouseDown={e => handleWidgetMouseDown(e, 'end')}
        aria-label="End anchor"
        role="button"
        tabIndex={-1}
      >
        ▶
      </div>

      {/* ── Card content ── */}
      <div className={showWideContent ? styles.wideContent : styles.content}>
        <div className={styles.title} title={task.title}>{task.title}</div>

        {!isReduced && (
          <div className={styles.meta}>
            <span className={styles.metaLeft}>
              {task.predecessorIds.length > 0 && `← ${task.predecessorIds.length}`}
            </span>
            <span className={styles.metaCenter}>{timeLabel ?? ''}</span>
            <span className={styles.metaRight}>
              {task.successorIds.length > 0 && `${task.successorIds.length} →`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
