import { useRef, useState } from 'react'
import type { Task } from '../../services/tasks'
import {
  computeDueStatus,
  computeDueStatusForDate,
  DUE_STATUS_COLOR_VAR,
} from '../../utils/taskStatus'
import { CARD_WIDTH, CARD_HEIGHT, CARD_HEIGHT_V, MS_PER_DAY } from './graphLayout'
import styles from './TaskGraphItem.module.css'

export type AnchorType = 'start' | 'end'

interface TaskGraphItemProps {
  task: Task
  taskMap: Map<string, Task>
  x: number
  y: number
  /** Rendered card width. Defaults to CARD_WIDTH. */
  width?: number
  /** Rendered card height. Used in vertical mode for both-constrained tasks. */
  height?: number
  selected: boolean
  isDragTarget: boolean
  /** True while this card is being dragged (dims the card). */
  isDragging?: boolean
  /** True when layout direction is vertical (affects resize handle orientation). */
  vertical?: boolean
  onSelect: (id: string) => void
  /** Called on card-body mousedown — parent decides whether it becomes a drag or a click. */
  onCardDragAttempt: (taskId: string, clientX: number, clientY: number) => void
  onRelationDragStart: (sourceId: string, anchor: AnchorType, clientX: number, clientY: number) => void
  /** Called when a resize handle is pressed. */
  onResizeDragStart: (taskId: string, anchor: 'start' | 'end') => void
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
  height,
  selected,
  isDragTarget,
  isDragging = false,
  vertical = false,
  onSelect,
  onCardDragAttempt,
  onRelationDragStart,
  onResizeDragStart,
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

  // A card is "reduced" when both sides are constrained but span < standard size along the major axis
  const isReduced  = !vertical && bothConstrained && width < CARD_WIDTH
  // Hide info when the card is too short to show title + 2-row info comfortably (≈ 2 × standard card height)
  const isReducedV =  vertical && bothConstrained && height !== undefined && height < CARD_HEIGHT * 2

  // Effective rendered dimensions: expand on hover if reduced
  const effectiveWidth  = isReduced  && hoverExpanded ? CARD_WIDTH   : width
  const effectiveHeight = isReducedV && hoverExpanded ? CARD_HEIGHT_V : height

  // ── Card body mousedown — parent decides drag vs click ────────────────────

  function handleCardMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    onCardDragAttempt(task.id, e.clientX, e.clientY)
  }

  // ── Keyboard selection ────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(task.id)
    }
  }

  // ── Hover expand (reduced cards only) ────────────────────────────────────

  function handleMouseEnter() {
    if (!isReduced && !isReducedV) return
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

  // ── Resize handle drag ────────────────────────────────────────────────────

  function handleResizeMouseDown(e: React.MouseEvent, anchor: 'start' | 'end') {
    e.stopPropagation()
    e.preventDefault()
    onResizeDragStart(task.id, anchor)
  }

  // ── Style ────────────────────────────────────────────────────────────────

  const cardStyle = {
    left: x,
    top: y,
    width: effectiveWidth,
    ...(effectiveHeight !== undefined ? { height: effectiveHeight } : {}),
    '--start-color': startColor,
    '--end-color': endColor,
    '--status-color': DUE_STATUS_COLOR_VAR[dueStatus],
  } as React.CSSProperties

  const classNames = [
    styles.card,
    selected             ? styles.selected    : '',
    isDragTarget         ? styles.dragTarget  : '',
    isDragging           ? styles.dragging    : '',
    isReduced            ? styles.reduced     : '',
    hoverExpanded        ? styles.expanded    : '',
  ].filter(Boolean).join(' ')

  // .cardBg: visual background + borders + gradient border pseudo-elements.
  const cardBgClassNames = [
    styles.cardBg,
    isGradient ? styles.gradient : '',
    vertical
      ? (hasStartConstraint ? styles.constrainedStartV   : styles.unconstrainedStartV)
      : (hasStartConstraint ? styles.constrainedStart    : styles.unconstrainedStart),
    vertical
      ? (hasEndConstraint   ? styles.constrainedEndV     : styles.unconstrainedEndV)
      : (hasEndConstraint   ? styles.constrainedEnd      : styles.unconstrainedEnd),
  ].filter(Boolean).join(' ')

  // For wide both-constrained cards, content is standard width and centred,
  // but sticks to the visible portion when the card overflows the viewport.
  // Not applicable in vertical mode (width is fixed at CARD_WIDTH_V).
  const showWideContent = !vertical && bothConstrained && width >= CARD_WIDTH

  const contentClass = showWideContent
    ? styles.wideContent
    : vertical ? styles.contentV : styles.content

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
      onKeyDown={handleKeyDown}
    >
      {/* ── Background layer: card surface, solid borders, gradient border. ── */}
      <div className={cardBgClassNames} aria-hidden="true" />

      {/* ── Wake: gradient strip extending past unconstrained edges along the
           time axis only. Clamped to the card's minor-axis extent so it does
           not bleed into adjacent lanes. ── */}
      {!hasStartConstraint && (
        <div className={vertical ? styles.wakeStartV : styles.wakeStart} aria-hidden="true" />
      )}
      {!hasEndConstraint && (
        <div className={vertical ? styles.wakeEndV : styles.wakeEnd} aria-hidden="true" />
      )}

      {/* ── Start anchor widget (relation drag) ── */}
      <div
        className={vertical ? styles.widgetStartV : styles.widgetStart}
        title="Drag to create a relationship"
        onMouseDown={e => handleWidgetMouseDown(e, 'start')}
        aria-label="Start anchor"
        role="button"
        tabIndex={-1}
      >
        {vertical ? '▲' : '◀'}
      </div>

      {/* ── End anchor widget (relation drag) ── */}
      <div
        className={vertical ? styles.widgetEndV : styles.widgetEnd}
        title="Drag to create a relationship"
        onMouseDown={e => handleWidgetMouseDown(e, 'end')}
        aria-label="End anchor"
        role="button"
        tabIndex={-1}
      >
        {vertical ? '▼' : '▶'}
      </div>

      {/* ── Resize handles (date manipulation) — only on constrained sides ── */}
      {hasStartConstraint && (
        <div
          className={`${styles.resizeHandle} ${vertical ? styles.resizeHandleStartV : styles.resizeHandleStart}`}
          title="Drag to change start date"
          onMouseDown={e => handleResizeMouseDown(e, 'start')}
          aria-label="Drag to resize start date"
        />
      )}
      {hasEndConstraint && (
        <div
          className={`${styles.resizeHandle} ${vertical ? styles.resizeHandleEndV : styles.resizeHandleEnd}`}
          title="Drag to change end date"
          onMouseDown={e => handleResizeMouseDown(e, 'end')}
          aria-label="Drag to resize end date"
        />
      )}


      {/* ── Card content ── */}
      <div className={contentClass}>

        {/* Title — always at the top */}
        <div className={styles.title} title={task.title}>{task.title}</div>


        {/* Vertical info: two rows — due status / pred left + succ right */}
        {!isReduced && (!isReducedV || hoverExpanded) && vertical && (
          <div className={styles.infoVertical}>
            <span className={styles.infoTime}>{timeLabel ?? ''}</span>
            <div className={styles.infoRow}>
              <span className={styles.infoPred}>
                {task.predecessorIds.length > 0 ? `← ${task.predecessorIds.length}` : ''}
              </span>
              <span className={styles.infoSucc}>
                {task.successorIds.length > 0 ? `${task.successorIds.length} →` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Horizontal info bar: absolutely positioned at card bottom, full card width ── */}
      {/* Pred at start edge, due status centred (normal cards only), succ at end edge  */}
      {(!isReduced || hoverExpanded) && !vertical && (
        <div className={styles.info}>
          <span className={styles.infoPred}>
            {task.predecessorIds.length > 0 ? `← ${task.predecessorIds.length}` : ''}
          </span>
          <span className={styles.infoTime}>{timeLabel ?? ''}</span>
          <span className={styles.infoSucc}>
            {task.successorIds.length > 0 ? `${task.successorIds.length} →` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
