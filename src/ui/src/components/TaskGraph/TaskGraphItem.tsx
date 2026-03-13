import { useRef } from 'react'
import type { Task } from '../../services/tasks'
import { computeDueStatus, DUE_STATUS_COLOR_VAR, DUE_STATUS_LABEL } from '../../utils/taskStatus'
import { CARD_WIDTH, CARD_HEIGHT, MS_PER_DAY } from './graphLayout'
import styles from './TaskGraphItem.module.css'

interface TaskGraphItemProps {
  task: Task
  x: number
  y: number
  selected: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, deltaX: number, deltaY: number) => void
}

export function TaskGraphItem({ task, x, y, selected, onSelect, onDragEnd }: TaskGraphItemProps) {
  const dueStatus = computeDueStatus(task)
  const color = DUE_STATUS_COLOR_VAR[dueStatus]
  const dragRef = useRef<{ startX: number; startY: number } | null>(null)

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    dragRef.current = { startX: e.clientX, startY: e.clientY }

    function onMove() {
      // intentionally empty — position updated on drop
    }

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

  const timeLabel = getTimeLabel(task)

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      style={{
        left: x,
        top: y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        '--status-color': color,
      } as React.CSSProperties}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      aria-pressed={selected}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) } }}
    >
      <div className={styles.title} title={task.title}>{task.title}</div>
      <div className={styles.meta}>
        <span className={styles.statusLabel}>{DUE_STATUS_LABEL[dueStatus]}</span>
        {timeLabel && <span className={styles.timeLabel}>{timeLabel}</span>}
      </div>
      {(task.predecessorIds.length > 0 || task.successorIds.length > 0) && (
        <div className={styles.deps}>
          {task.predecessorIds.length > 0 && (
            <span className={styles.dep} title={`${task.predecessorIds.length} predecessor(s)`}>
              ← {task.predecessorIds.length}
            </span>
          )}
          {task.successorIds.length > 0 && (
            <span className={styles.dep} title={`${task.successorIds.length} successor(s)`}>
              → {task.successorIds.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function getTimeLabel(task: Task): string | null {
  if (task.status === 'Complete') return null
  if (!task.endDate) return null
  const diffMs = new Date(task.endDate).getTime() - Date.now()
  const days = Math.round(diffMs / MS_PER_DAY)
  if (days > 1) return `${days}d left`
  if (days === 1) return '1d left'
  if (days === 0) return 'due today'
  if (days === -1) return '1d overdue'
  return `${-days}d overdue`
}
