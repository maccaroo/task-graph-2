import { useRef } from 'react'
import type { Task } from '../../services/tasks'
import {
  computeDueStatus,
  computeDueStatusForDate,
  DUE_STATUS_COLOR_VAR,
} from '../../utils/taskStatus'
import { CARD_WIDTH, MS_PER_DAY } from './graphLayout'
import styles from './TaskGraphItem.module.css'

export type RelationDragType = 'predecessor' | 'successor'

interface TaskGraphItemProps {
  task: Task
  taskMap: Map<string, Task>
  x: number
  y: number
  selected: boolean
  isDragTarget: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, deltaX: number, deltaY: number) => void
  onRelationDragStart: (sourceId: string, type: RelationDragType, clientX: number, clientY: number) => void
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

// ── Component ─────────────────────────────────────────────────────────────

export function TaskGraphItem({
  task,
  x,
  y,
  selected,
  isDragTarget,
  onSelect,
  onDragEnd,
  onRelationDragStart,
}: TaskGraphItemProps) {
  const dueStatus = computeDueStatus(task)
  const timeLabel = getTimeLabel(task)
  const { startColor, endColor } = borderColors(task)
  const isGradient = startColor !== endColor

  const dragRef = useRef<{ startX: number; startY: number } | null>(null)

  const hasPred = task.predecessorIds.length > 0
  const hasSucc = task.successorIds.length > 0

  // ── Card drag (reposition) ─────────────────────────────────────────────

  function handleCardMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    dragRef.current = { startX: e.clientX, startY: e.clientY }

    function onMove() { /* position updated on drop */ }

    function onUp(me: MouseEvent) {
      if (dragRef.current) {
        const dx = me.clientX - dragRef.current.startX
        const dy = me.clientY - dragRef.current.startY
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          onDragEnd(task.id, dx, dy)
        } else {
          onSelect(task.id)
        }
      }
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Relation widget drag (create predecessor/successor) ────────────────

  function handleWidgetMouseDown(e: React.MouseEvent, type: RelationDragType) {
    e.stopPropagation()
    e.preventDefault()
    onRelationDragStart(task.id, type, e.clientX, e.clientY)
  }

  // ── Style ─────────────────────────────────────────────────────────────

  const cardStyle = {
    left: x,
    top: y,
    width: CARD_WIDTH,
    '--start-color': startColor,
    '--end-color': endColor,
    '--status-color': DUE_STATUS_COLOR_VAR[dueStatus],
  } as React.CSSProperties

  return (
    <div
      className={[
        styles.card,
        isGradient ? styles.gradient : '',
        selected    ? styles.selected   : '',
        isDragTarget ? styles.dragTarget : '',
      ].filter(Boolean).join(' ')}
      style={cardStyle}
      onMouseDown={handleCardMouseDown}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      aria-pressed={selected}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) }
      }}
    >
      {/* ── Predecessor widget (left) T4 ── */}
      <div
        className={styles.widgetLeft}
        title="Drag to set a predecessor"
        onMouseDown={e => handleWidgetMouseDown(e, 'predecessor')}
        aria-label="Add predecessor"
        role="button"
        tabIndex={-1}
      >
        ◀
      </div>

      {/* ── Successor widget (right) T5 ── */}
      <div
        className={styles.widgetRight}
        title="Drag to set a successor"
        onMouseDown={e => handleWidgetMouseDown(e, 'successor')}
        aria-label="Add successor"
        role="button"
        tabIndex={-1}
      >
        ▶
      </div>

      {/* ── Card content ── */}
      <div className={styles.title} title={task.title}>{task.title}</div>

      <div className={styles.meta}>
        {(hasPred || hasSucc) && (
          <span className={styles.deps}>
            {hasPred && `← ${task.predecessorIds.length}`}
            {hasPred && hasSucc && '  '}
            {hasSucc && `${task.successorIds.length} →`}
          </span>
        )}
        {timeLabel && <span className={styles.timeLabel}>{timeLabel}</span>}
      </div>
    </div>
  )
}
