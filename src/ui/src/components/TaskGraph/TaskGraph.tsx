import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addPredecessor,
  getTasks,
  updateTaskPosition,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../services/tasks'
import { getUsers, type UserSummary } from '../../services/users'
import { computeDueStatus, DUE_STATUS_LABEL, type DueStatusKey } from '../../utils/taskStatus'
import { Button } from '../ui'
import { AddTaskModal } from '../TaskList/AddTaskModal'
import { TimeAxis } from './TimeAxis'
import { TaskGraphItem, type RelationDragType } from './TaskGraphItem'
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

// ── Types ──────────────────────────────────────────────────────────────────

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

const MIN_ZOOM = 0.3
const MAX_ZOOM = 200
const DEFAULT_ZOOM = 40

interface RelationDrag {
  sourceId: string
  type: RelationDragType
  cursorX: number
  cursorY: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function weekStart(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(m.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function wouldCreateCycle(taskMap: Map<string, Task>, newPredId: string, taskId: string): boolean {
  const visited = new Set<string>()
  function dfs(id: string): boolean {
    if (id === newPredId) return true
    if (visited.has(id)) return false
    visited.add(id)
    return (taskMap.get(id)?.successorIds ?? []).some(dfs)
  }
  return dfs(taskId)
}

// ── Component ──────────────────────────────────────────────────────────────

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
  const [pinnedPositions, setPinnedPositions] = useState<Map<string, { x: number; y: number }>>(new Map())

  const [relationDrag, setRelationDrag] = useState<RelationDrag | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const dragTargetRef = useRef<string | null>(null)

  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const tasksRef = useRef<Task[]>([])

  const load = useCallback(async () => {
    setError('')
    try {
      const [taskData, userData] = await Promise.all([getTasks(), getUsers()])
      setTasks(taskData)
      tasksRef.current = taskData
      setUsers(userData)
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

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const f = applyFilters(tasks, filters)
    return showOpenEnded ? f : f.filter(t => t.endDate)
  }, [tasks, filters, showOpenEnded])

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])

  const { viewStart, viewEnd } = useMemo(
    () => computeViewRange(filtered.length ? filtered : tasks),
    [filtered, tasks],
  )

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

  const positions = useMemo(() => {
    const map = new Map(autoPositions)
    for (const [id, pos] of pinnedPositions) {
      if (map.has(id)) map.set(id, pos)
    }
    return map
  }, [autoPositions, pinnedPositions])

  useEffect(() => { positionsRef.current = positions }, [positions])

  const openEndedTasks = useMemo(() => filtered.filter(t => !t.endDate), [filtered])
  const datedTasks    = useMemo(() => filtered.filter(t =>  t.endDate), [filtered])

  const nowX = useMemo(() => dateToX(new Date(), viewStart, pixelsPerDay), [viewStart, pixelsPerDay])

  const weekBand = useMemo(() => ({
    x: dateToX(weekStart(new Date()), viewStart, pixelsPerDay),
    width: 7 * pixelsPerDay,
  }), [viewStart, pixelsPerDay])

  const gaps = useMemo(() => {
    const dates = datedTasks
      .flatMap(t => [t.startDate, t.endDate].filter(Boolean) as string[])
      .map(s => new Date(s).getTime())
      .sort((a, b) => a - b)
    const result: { x: number; width: number }[] = []
    for (let i = 1; i < dates.length; i++) {
      if ((dates[i] - dates[i - 1]) / MS_PER_DAY > 14) {
        result.push({
          x: dateToX(new Date(dates[i - 1]), viewStart, pixelsPerDay),
          width: dateToX(new Date(dates[i]), viewStart, pixelsPerDay)
                - dateToX(new Date(dates[i - 1]), viewStart, pixelsPerDay),
        })
      }
    }
    return result
  }, [datedTasks, viewStart, pixelsPerDay])

  // ── Arrows ────────────────────────────────────────────────────────────────

  const arrows = useMemo(() => {
    const filteredIds = new Set(filtered.map(t => t.id))
    const result: { id: string; d: string; dashed: boolean }[] = []
    for (const task of filtered) {
      const toPos = positions.get(task.id)
      if (!toPos) continue
      for (const predId of task.predecessorIds) {
        const fromPos = positions.get(predId)
        if (!fromPos) continue
        const x1 = fromPos.x + CARD_WIDTH, y1 = fromPos.y + CARD_HEIGHT / 2
        const x2 = toPos.x,                y2 = toPos.y  + CARD_HEIGHT / 2
        const cx = (x1 + x2) / 2
        result.push({ id: `${predId}->${task.id}`, d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`, dashed: !filteredIds.has(predId) })
      }
    }
    return result
  }, [filtered, positions])

  const dragLine = useMemo(() => {
    if (!relationDrag) return null
    const src = positionsRef.current.get(relationDrag.sourceId)
    if (!src) return null
    const isSucc = relationDrag.type === 'successor'
    return { x1: isSucc ? src.x + CARD_WIDTH : src.x, y1: src.y + CARD_HEIGHT / 2, x2: relationDrag.cursorX, y2: relationDrag.cursorY }
  }, [relationDrag])

  // ── Zoom ──────────────────────────────────────────────────────────────────

  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left + container.scrollLeft
    const dateAtMouse = xToDate(mouseX, viewStart, pixelsPerDay)
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pixelsPerDay * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
    setPixelsPerDay(newZoom)
    requestAnimationFrame(() => {
      if (!containerRef.current) return
      containerRef.current.scrollLeft = dateToX(dateAtMouse, viewStart, newZoom) - (e.clientX - rect.left)
    })
  }

  // ── Pan ───────────────────────────────────────────────────────────────────

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

  // ── Task drag (reposition) ────────────────────────────────────────────────

  function handleTaskDragEnd(id: string, dx: number, dy: number) {
    const current = positions.get(id)
    if (!current) return
    const newPos = { x: current.x + dx, y: current.y + dy }
    const task = tasks.find(t => t.id === id)
    if (task) {
      const newEnd   = xToDate(newPos.x + CARD_WIDTH, viewStart, pixelsPerDay)
      const newStart = xToDate(newPos.x, viewStart, pixelsPerDay)
      for (const predId of task.predecessorIds) {
        const p = positions.get(predId)
        if (p && newStart < xToDate(p.x + CARD_WIDTH, viewStart, pixelsPerDay)) return
      }
      for (const succId of task.successorIds) {
        const s = positions.get(succId)
        if (s && newEnd > xToDate(s.x, viewStart, pixelsPerDay)) return
      }
    }
    setPinnedPositions(prev => { const n = new Map(prev); n.set(id, newPos); return n })
    updateTaskPosition(id, newPos).catch(() => {
      setPinnedPositions(prev => { const n = new Map(prev); n.delete(id); return n })
    })
  }

  // ── Relation drag (wire tasks together) ───────────────────────────────────

  function handleRelationDragStart(sourceId: string, type: RelationDragType, clientX: number, clientY: number) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const coords = (cx: number, cy: number) => ({
      x: cx - rect.left + container.scrollLeft,
      y: cy - rect.top  + container.scrollTop,
    })
    const start = coords(clientX, clientY)
    setRelationDrag({ sourceId, type, cursorX: start.x, cursorY: start.y })

    function onMove(me: MouseEvent) {
      const { x, y } = coords(me.clientX, me.clientY)
      setRelationDrag(prev => prev ? { ...prev, cursorX: x, cursorY: y } : null)
      let target: string | null = null
      for (const [id, pos] of positionsRef.current) {
        if (id === sourceId) continue
        if (x >= pos.x && x <= pos.x + CARD_WIDTH && y >= pos.y && y <= pos.y + CARD_HEIGHT) { target = id; break }
      }
      dragTargetRef.current = target
      setDragTargetId(target)
    }

    async function onUp() {
      const targetId = dragTargetRef.current
      if (targetId) await handleRelationDrop(sourceId, type, targetId)
      setRelationDrag(null)
      setDragTargetId(null)
      dragTargetRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function handleRelationDrop(sourceId: string, type: RelationDragType, targetId: string) {
    const src = tasksRef.current.find(t => t.id === sourceId)
    const tgt = tasksRef.current.find(t => t.id === targetId)
    if (!src || !tgt || sourceId === targetId) return
    const localMap = new Map(tasksRef.current.map(t => [t.id, t]))
    if (type === 'predecessor') {
      if (src.predecessorIds.includes(targetId)) return
      if (wouldCreateCycle(localMap, targetId, sourceId)) return
      try { await addPredecessor(sourceId, targetId); await load() } catch { /* ignore */ }
    } else {
      if (tgt.predecessorIds.includes(sourceId)) return
      if (wouldCreateCycle(localMap, sourceId, targetId)) return
      try { await addPredecessor(targetId, sourceId); await load() } catch { /* ignore */ }
    }
  }

  // ── Scroll to today ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading && containerRef.current) {
      const todayX = dateToX(new Date(), viewStart, pixelsPerDay)
      containerRef.current.scrollLeft = todayX - containerRef.current.clientWidth * 0.35
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // ── Filters ───────────────────────────────────────────────────────────────

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

      <div ref={containerRef} className={styles.canvasContainer} onWheel={handleWheel}>
        <div className={styles.canvas} style={{ width: canvasWidth, height: canvasHeight }} onMouseDown={handleCanvasMouseDown}>
          <TimeAxis viewStart={viewStart} viewEnd={viewEnd} pixelsPerDay={pixelsPerDay} canvasWidth={canvasWidth} position="top" />

          <div className={styles.weekBand} style={{ left: weekBand.x, width: weekBand.width }} aria-hidden="true" />

          {gaps.map((g, i) => <div key={i} className={styles.gap} style={{ left: g.x, width: g.width }} aria-hidden="true" />)}

          <div className={styles.nowLine} style={{ left: nowX }} aria-label="Current time" />

          <svg className={styles.arrowsSvg} width={canvasWidth} height={canvasHeight} aria-hidden="true">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-border-strong)" />
              </marker>
              <marker id="arrowhead-drag" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-primary)" />
              </marker>
            </defs>
            {arrows.map(a => (
              <path key={a.id} d={a.d} fill="none" stroke="var(--color-border-strong)"
                strokeWidth="1.5" strokeDasharray={a.dashed ? '4 4' : undefined}
                markerEnd="url(#arrowhead)" opacity="0.6" />
            ))}
            {dragLine && (
              <line x1={dragLine.x1} y1={dragLine.y1} x2={dragLine.x2} y2={dragLine.y2}
                stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="6 3"
                markerEnd="url(#arrowhead-drag)" opacity="0.8" />
            )}
          </svg>

          {datedTasks.map(task => {
            const pos = positions.get(task.id)
            if (!pos) return null
            return (
              <TaskGraphItem
                key={task.id}
                task={task}
                taskMap={taskMap}
                x={pos.x}
                y={pos.y}
                selected={selectedTaskId === task.id}
                isDragTarget={dragTargetId === task.id}
                onSelect={setSelectedTaskId}
                onDragEnd={handleTaskDragEnd}
                onRelationDragStart={handleRelationDragStart}
              />
            )
          })}
        </div>

        {showOpenEnded && openEndedTasks.length > 0 && (
          <div className={styles.openEndedPanel}>
            <div className={styles.openEndedTitle}>Open-ended</div>
            {openEndedTasks.map(task => (
              <div key={task.id}
                className={`${styles.openEndedItem} ${selectedTaskId === task.id ? styles.openEndedSelected : ''}`}
                role="button" tabIndex={0}
                onClick={() => setSelectedTaskId(task.id)}
                onKeyDown={e => { if (e.key === 'Enter') setSelectedTaskId(task.id) }}>
                {task.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actionPanel}>
        <div className={styles.actionLeft}>
          <button className={`${styles.iconBtn} ${filtersOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} title="Toggle filters">
            Filters {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
          </button>
          <button className={`${styles.iconBtn} ${!showOpenEnded ? styles.iconBtnActive : ''}`}
            onClick={() => setShowOpenEnded(v => !v)}
            title={showOpenEnded ? 'Hide open-ended tasks' : 'Show open-ended tasks'}>
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
