import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTasks, updateTaskPosition, type Task, type TaskPriority, type TaskStatus } from '../../services/tasks'
import { getUsers, type UserSummary } from '../../services/users'
import { computeDueStatus, DUE_STATUS_LABEL, type DueStatusKey } from '../../utils/taskStatus'
import { Button } from '../ui'
import { AddTaskModal } from '../TaskList/AddTaskModal'
import { TimeAxis } from './TimeAxis'
import { TaskGraphItem } from './TaskGraphItem'
import {
  CANVAS_PAD_Y,
  CARD_HEIGHT,
  CARD_WIDTH,
  MS_PER_DAY,
  ROW_HEIGHT,
  computeAutoLayout,
  computeCanvasSize,
  computeViewRange,
  dateToX,
  xToDate,
} from './graphLayout'
import styles from './TaskGraph.module.css'

// ── Types ─────────────────────────────────────────────────────────────────

interface Filters {
  text: string
  assigneeId: string
  priority: '' | TaskPriority
  tags: string
  completion: '' | TaskStatus
  dueStatus: '' | DueStatusKey
  fromDate: string
  toDate: string
}

const DEFAULT_FILTERS: Filters = {
  text: '', assigneeId: '', priority: '', tags: '',
  completion: '', dueStatus: '', fromDate: '', toDate: '',
}

const MIN_ZOOM = 0.3   // px/day
const MAX_ZOOM = 200   // px/day
const DEFAULT_ZOOM = 40

// ── Helpers ───────────────────────────────────────────────────────────────

function applyFilters(tasks: Task[], filters: Filters): Task[] {
  return tasks.filter(t => {
    if (filters.text) {
      const q = filters.text.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) return false
    }
    if (filters.assigneeId && t.assigneeId !== filters.assigneeId) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.tags) {
      const wanted = filters.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (!wanted.every(w => t.tags.some(tag => tag.toLowerCase().includes(w)))) return false
    }
    if (filters.completion && t.status !== filters.completion) return false
    if (filters.dueStatus && computeDueStatus(t) !== filters.dueStatus) return false
    if (filters.fromDate && t.endDate && t.endDate < filters.fromDate) return false
    if (filters.toDate  && t.endDate && t.endDate > filters.toDate)   return false
    return true
  })
}

// Get start-of-week (Monday) for a date
function weekStart(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day) // Mon=1 … Sun=0
  const m = new Date(d)
  m.setDate(m.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

// ── Component ─────────────────────────────────────────────────────────────

export function TaskGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_ZOOM)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showOpenEnded, setShowOpenEnded] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  // pinnedPositions overrides auto-layout; values are absolute canvas coordinates
  const [pinnedPositions, setPinnedPositions] = useState<Map<string, { x: number; y: number }>>(new Map())

  const load = useCallback(async () => {
    setError('')
    try {
      const [taskData, userData] = await Promise.all([getTasks(), getUsers()])
      setTasks(taskData)
      setUsers(userData)
      // Restore server-saved pinned positions
      const serverPins = new Map<string, { x: number; y: number }>()
      for (const t of taskData) {
        if (t.pinnedPosition) serverPins.set(t.id, t.pinnedPosition)
      }
      setPinnedPositions(serverPins)
    } catch {
      setError('Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived data ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const f = applyFilters(tasks, filters)
    return showOpenEnded ? f : f.filter(t => t.endDate)
  }, [tasks, filters, showOpenEnded])

  const { viewStart, viewEnd } = useMemo(() => computeViewRange(filtered.length ? filtered : tasks), [filtered, tasks])

  const autoPositions = useMemo(
    () => computeAutoLayout(filtered, viewStart, pixelsPerDay),
    [filtered, viewStart, pixelsPerDay],
  )

  const numRows = useMemo(() => {
    const ys = [...autoPositions.values()].map(p => p.y)
    if (!ys.length) return 1
    return Math.floor((Math.max(...ys) - CANVAS_PAD_Y) / ROW_HEIGHT) + 1
  }, [autoPositions])

  const { width: canvasWidth, height: canvasHeight } = useMemo(
    () => computeCanvasSize(viewStart, viewEnd, pixelsPerDay, numRows),
    [viewStart, viewEnd, pixelsPerDay, numRows],
  )

  /** Final positions: pinned overrides auto */
  const positions = useMemo(() => {
    const map = new Map(autoPositions)
    for (const [id, pos] of pinnedPositions) {
      if (map.has(id)) map.set(id, pos)
    }
    return map
  }, [autoPositions, pinnedPositions])

  const openEndedTasks = useMemo(() => filtered.filter(t => !t.endDate), [filtered])
  const datedTasks = useMemo(() => filtered.filter(t => t.endDate), [filtered])

  // Dates for decorative elements
  const nowX = useMemo(() => dateToX(new Date(), viewStart, pixelsPerDay), [viewStart, pixelsPerDay])
  const weekBand = useMemo(() => {
    const start = weekStart(new Date())
    const end = new Date(start.getTime() + 7 * MS_PER_DAY)
    return {
      x: dateToX(start, viewStart, pixelsPerDay),
      width: (7 * MS_PER_DAY / MS_PER_DAY) * pixelsPerDay,
      endX: dateToX(end, viewStart, pixelsPerDay),
    }
  }, [viewStart, pixelsPerDay])

  // Gap detection — sections of time axis with no tasks (>14 days between adjacent task dates)
  const gaps = useMemo(() => {
    const dates = datedTasks
      .flatMap(t => [t.startDate, t.endDate].filter(Boolean) as string[])
      .map(s => new Date(s).getTime())
      .sort((a, b) => a - b)

    const result: { x: number; width: number }[] = []
    for (let i = 1; i < dates.length; i++) {
      const gapDays = (dates[i] - dates[i - 1]) / MS_PER_DAY
      if (gapDays > 14) {
        result.push({
          x: dateToX(new Date(dates[i - 1]), viewStart, pixelsPerDay),
          width: dateToX(new Date(dates[i]), viewStart, pixelsPerDay) - dateToX(new Date(dates[i - 1]), viewStart, pixelsPerDay),
        })
      }
    }
    return result
  }, [datedTasks, viewStart, pixelsPerDay])

  // ── Zoom ────────────────────────────────────────────────────────────────

  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left + container.scrollLeft
    const dateAtMouse = xToDate(mouseX, viewStart, pixelsPerDay)

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pixelsPerDay * factor))
    setPixelsPerDay(newZoom)

    // Re-center scroll so the date under the mouse stays in place
    requestAnimationFrame(() => {
      if (!containerRef.current) return
      const newX = dateToX(dateAtMouse, viewStart, newZoom)
      containerRef.current.scrollLeft = newX - (e.clientX - rect.left)
    })
  }

  // ── Pan (canvas drag) ────────────────────────────────────────────────────

  const panRef = useRef<{ startX: number; scrollLeft: number } | null>(null)

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return
    panRef.current = { startX: e.clientX, scrollLeft: containerRef.current?.scrollLeft ?? 0 }

    function onMove(me: MouseEvent) {
      if (!panRef.current || !containerRef.current) return
      containerRef.current.scrollLeft = panRef.current.scrollLeft - (me.clientX - panRef.current.startX)
    }
    function onUp() {
      panRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Task drag ────────────────────────────────────────────────────────────

  function handleTaskDragEnd(id: string, dx: number, dy: number) {
    const current = positions.get(id)
    if (!current) return
    const newPos = { x: current.x + dx, y: current.y + dy }

    // Validate against dependency constraints (T10)
    const task = tasks.find(t => t.id === id)
    if (task) {
      const newEndDate = xToDate(newPos.x + CARD_WIDTH, viewStart, pixelsPerDay)
      const newStartDate = xToDate(newPos.x, viewStart, pixelsPerDay)

      for (const predId of task.predecessorIds) {
        const predPos = positions.get(predId)
        if (predPos) {
          const predEnd = xToDate(predPos.x + CARD_WIDTH, viewStart, pixelsPerDay)
          if (newStartDate < predEnd) return // constraint violation — block move
        }
      }
      for (const succId of task.successorIds) {
        const succPos = positions.get(succId)
        if (succPos) {
          const succStart = xToDate(succPos.x, viewStart, pixelsPerDay)
          if (newEndDate > succStart) return // constraint violation — block move
        }
      }
    }

    setPinnedPositions(prev => {
      const next = new Map(prev)
      next.set(id, newPos)
      return next
    })

    // Persist to server asynchronously
    updateTaskPosition(id, newPos).catch(() => {
      // revert on failure
      setPinnedPositions(prev => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    })
  }

  // ── Dependency arrows (SVG) ──────────────────────────────────────────────

  const arrows = useMemo(() => {
    const result: { id: string; d: string; dashed: boolean }[] = []
    const filteredIds = new Set(filtered.map(t => t.id))

    for (const task of filtered) {
      const toPos = positions.get(task.id)
      if (!toPos) continue

      for (const predId of task.predecessorIds) {
        const fromPos = positions.get(predId)
        const dashed = !filteredIds.has(predId)

        if (fromPos) {
          // Arrow from right-center of predecessor to left-center of successor
          const x1 = fromPos.x + CARD_WIDTH
          const y1 = fromPos.y + CARD_HEIGHT / 2
          const x2 = toPos.x
          const y2 = toPos.y + CARD_HEIGHT / 2
          const cx = (x1 + x2) / 2
          result.push({
            id: `${predId}->${task.id}`,
            d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
            dashed,
          })
        }
      }
    }
    return result
  }, [filtered, positions])

  // ── Scroll to today on mount ─────────────────────────────────────────────

  useEffect(() => {
    if (!loading && containerRef.current) {
      const container = containerRef.current
      const todayX = dateToX(new Date(), viewStart, pixelsPerDay)
      container.scrollLeft = todayX - container.clientWidth * 0.35
    }
    // Only run after initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // ── Filter helpers ────────────────────────────────────────────────────────

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() { setFilters(DEFAULT_FILTERS) }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className={styles.state}>Loading…</div>
  if (error)   return <div className={styles.stateError}>{error}</div>

  return (
    <div className={styles.root}>
      {/* Filter panel */}
      {filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Search</label>
              <input className={styles.filterInput} type="search" placeholder="Title or description…"
                value={filters.text} onChange={e => setFilter('text', e.target.value)} />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Assignee</label>
              <select className={styles.filterSelect} value={filters.assigneeId} onChange={e => setFilter('assigneeId', e.target.value)}>
                <option value="">All</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Priority</label>
              <select className={styles.filterSelect} value={filters.priority} onChange={e => setFilter('priority', e.target.value as Filters['priority'])}>
                <option value="">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Tags</label>
              <input className={styles.filterInput} placeholder="Comma-separated…"
                value={filters.tags} onChange={e => setFilter('tags', e.target.value)} />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Completion</label>
              <select className={styles.filterSelect} value={filters.completion} onChange={e => setFilter('completion', e.target.value as Filters['completion'])}>
                <option value="">All</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Due status</label>
              <select className={styles.filterSelect} value={filters.dueStatus} onChange={e => setFilter('dueStatus', e.target.value as Filters['dueStatus'])}>
                <option value="">All</option>
                {(Object.entries(DUE_STATUS_LABEL) as [DueStatusKey, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>From date</label>
              <input type="date" className={styles.filterInput} value={filters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>To date</label>
              <input type="date" className={styles.filterInput} value={filters.toDate} onChange={e => setFilter('toDate', e.target.value)} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button className={styles.clearFilters} onClick={clearFilters}>Clear all filters</button>
          )}
        </div>
      )}

      {/* Graph canvas — scrollable */}
      <div
        ref={containerRef}
        className={styles.canvasContainer}
        onWheel={handleWheel}
      >
        <div
          className={styles.canvas}
          style={{ width: canvasWidth, height: canvasHeight }}
          onMouseDown={handleCanvasMouseDown}
        >
          {/* Time axis */}
          <TimeAxis
            viewStart={viewStart}
            viewEnd={viewEnd}
            pixelsPerDay={pixelsPerDay}
            canvasWidth={canvasWidth}
            position="top"
          />

          {/* Current week band (T6) */}
          <div
            className={styles.weekBand}
            style={{ left: weekBand.x, width: weekBand.width }}
            aria-hidden="true"
          />

          {/* Gap indicators — dashed sections (T7) */}
          {gaps.map((gap, i) => (
            <div
              key={i}
              className={styles.gap}
              style={{ left: gap.x, width: gap.width }}
              aria-hidden="true"
            />
          ))}

          {/* Current moment line (T5) */}
          <div
            className={styles.nowLine}
            style={{ left: nowX }}
            aria-label="Current time"
          />

          {/* Dependency arrows SVG (T4) */}
          <svg
            className={styles.arrowsSvg}
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden="true"
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-border-strong)" />
              </marker>
            </defs>
            {arrows.map(a => (
              <path
                key={a.id}
                d={a.d}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth="1.5"
                strokeDasharray={a.dashed ? '4 4' : undefined}
                markerEnd="url(#arrowhead)"
                opacity="0.6"
              />
            ))}
          </svg>

          {/* Task items (T3, T8, T9, T10) */}
          {datedTasks.map(task => {
            const pos = positions.get(task.id)
            if (!pos) return null
            return (
              <TaskGraphItem
                key={task.id}
                task={task}
                x={pos.x}
                y={pos.y}
                selected={selectedTaskId === task.id}
                onSelect={setSelectedTaskId}
                onDragEnd={handleTaskDragEnd}
              />
            )
          })}
        </div>

        {/* Open-ended tasks sidebar (T12) */}
        {showOpenEnded && openEndedTasks.length > 0 && (
          <div className={styles.openEndedPanel}>
            <div className={styles.openEndedTitle}>Open-ended</div>
            {openEndedTasks.map(task => (
              <div
                key={task.id}
                className={`${styles.openEndedItem} ${selectedTaskId === task.id ? styles.openEndedSelected : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTaskId(task.id)}
                onKeyDown={e => { if (e.key === 'Enter') setSelectedTaskId(task.id) }}
              >
                {task.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action panel (bottom) */}
      <div className={styles.actionPanel}>
        <div className={styles.actionLeft}>
          <button
            className={`${styles.iconBtn} ${filtersOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
            title="Toggle filters"
          >
            Filters {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
          </button>
          <button
            className={`${styles.iconBtn} ${!showOpenEnded ? styles.iconBtnActive : ''}`}
            onClick={() => setShowOpenEnded(v => !v)}
            title={showOpenEnded ? 'Hide open-ended tasks' : 'Show open-ended tasks'}
          >
            Open-ended: {showOpenEnded ? 'shown' : 'hidden'}
          </button>
        </div>
        <div className={styles.actionRight}>
          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add Task</Button>
        </div>
      </div>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </div>
  )
}
