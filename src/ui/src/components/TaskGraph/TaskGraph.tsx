import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addPredecessor,
  getTasks,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../services/tasks'
import { getUsers, type UserSummary } from '../../services/users'
import { computeDueStatus, DUE_STATUS_LABEL, type DueStatusKey } from '../../utils/taskStatus'
import { Button } from '../ui'
import { AddTaskModal } from '../TaskList/AddTaskModal'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TimeAxis } from './TimeAxis'
import { TaskGraphItem, type AnchorType } from './TaskGraphItem'
import {
  CANVAS_PAD_X,
  CANVAS_PAD_Y,
  CARD_HEIGHT,
  MS_PER_DAY,
  ROW_HEIGHT,
  computeAutoLayout,
  computeCanvasSize,
  computeViewRange,
  dateToX,
  xToDate,
  type TaskPosition,
} from './graphLayout'
import { resolveRelationship } from './TaskGraph.utils'
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
  sourceAnchor: AnchorType
  cursorX: number
  cursorY: number
  targetAnchor: AnchorType | null
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
  const [containerWidth, setContainerWidth] = useState(0)

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

  const [relationDrag, setRelationDrag] = useState<RelationDrag | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const dragTargetRef = useRef<string | null>(null)

  const positionsRef = useRef<Map<string, TaskPosition>>(new Map())
  const tasksRef = useRef<Task[]>([])

  const load = useCallback(async () => {
    setError('')
    try {
      const [taskData, userData] = await Promise.all([getTasks(), getUsers()])
      setTasks(taskData)
      tasksRef.current = taskData
      setUsers(userData)
    } catch {
      setError('Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Track container width so the canvas always fills the visible area when zoomed out.
  // Depends on `loading` because the canvasContainer isn't rendered until loading is false,
  // so containerRef.current is null on the very first effect run.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading])

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const f = applyFilters(tasks, filters)
    // Hide tasks with no timing constraints on either end (truly open-ended)
    return showOpenEnded ? f : f.filter(t => t.startDate || t.endDate)
  }, [tasks, filters, showOpenEnded])

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])

  const { viewStart: rawViewStart, viewEnd: rawViewEnd } = useMemo(
    () => computeViewRange(filtered.length ? filtered : tasks),
    [filtered, tasks],
  )

  // Extend the view range symmetrically so the canvas always fills the full container
  // width when zoomed out, keeping task content centred rather than left-anchored.
  const { viewStart, viewEnd } = useMemo(() => {
    if (!containerWidth) return { viewStart: rawViewStart, viewEnd: rawViewEnd }
    const rawSpanPx = ((rawViewEnd.getTime() - rawViewStart.getTime()) / MS_PER_DAY) * pixelsPerDay
    const rawWidth = CANVAS_PAD_X * 2 + rawSpanPx
    const extraPx = Math.max(0, containerWidth - rawWidth)
    if (extraPx === 0) return { viewStart: rawViewStart, viewEnd: rawViewEnd }
    const extraMs = (extraPx / 2 / pixelsPerDay) * MS_PER_DAY
    return {
      viewStart: new Date(rawViewStart.getTime() - extraMs),
      viewEnd:   new Date(rawViewEnd.getTime()   + extraMs),
    }
  }, [rawViewStart, rawViewEnd, containerWidth, pixelsPerDay])

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

  const positions = autoPositions

  useEffect(() => { positionsRef.current = positions }, [positions])

  const nowX = useMemo(() => dateToX(new Date(), viewStart, pixelsPerDay), [viewStart, pixelsPerDay])

  const weekBand = useMemo(() => ({
    x: dateToX(weekStart(new Date()), viewStart, pixelsPerDay),
    width: 7 * pixelsPerDay,
  }), [viewStart, pixelsPerDay])

  const gaps = useMemo(() => {
    const dates = filtered.filter(t => t.endDate)
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
  }, [filtered, viewStart, pixelsPerDay])

  // ── Arrows ────────────────────────────────────────────────────────────────

  const arrows = useMemo(() => {
    const filteredIds = new Set(filtered.map(t => t.id))
    const result: { id: string; fromId: string; toId: string; d: string; dashed: boolean }[] = []
    for (const task of filtered) {
      const toPos = positions.get(task.id)
      if (!toPos) continue
      for (const rel of task.predecessors) {
        const fromPos = positions.get(rel.relatedTaskId)
        if (!fromPos) continue
        // Predecessor anchor: end for Exclusive/HaveCompleted, start for HaveStarted/HandOff
        const fromX = (rel.type === 'Exclusive' || rel.type === 'HaveCompleted')
          ? fromPos.x + fromPos.width : fromPos.x
        // Successor anchor: start for Exclusive/HaveStarted, end for HaveCompleted/HandOff
        const toX = (rel.type === 'Exclusive' || rel.type === 'HaveStarted')
          ? toPos.x : toPos.x + toPos.width
        const y1 = fromPos.y + CARD_HEIGHT / 2
        const y2 = toPos.y   + CARD_HEIGHT / 2
        const cx = (fromX + toX) / 2
        result.push({
          id: `${rel.relatedTaskId}->${task.id}`,
          fromId: rel.relatedTaskId,
          toId: task.id,
          d: `M ${fromX} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${toX} ${y2}`,
          dashed: !filteredIds.has(rel.relatedTaskId),
        })
      }
    }
    return result
  }, [filtered, positions])

  const dragLine = useMemo(() => {
    if (!relationDrag) return null
    const src = positionsRef.current.get(relationDrag.sourceId)
    if (!src) return null
    const x1 = relationDrag.sourceAnchor === 'end' ? src.x + src.width : src.x
    return { x1, y1: src.y + CARD_HEIGHT / 2, x2: relationDrag.cursorX, y2: relationDrag.cursorY }
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

  // ── Relation drag (wire tasks together) ───────────────────────────────────

  const dragTargetAnchorRef = useRef<AnchorType | null>(null)

  function handleRelationDragStart(sourceId: string, sourceAnchor: AnchorType, clientX: number, clientY: number) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const coords = (cx: number, cy: number) => ({
      x: cx - rect.left + container.scrollLeft,
      y: cy - rect.top  + container.scrollTop,
    })
    const start = coords(clientX, clientY)
    setRelationDrag({ sourceId, sourceAnchor, cursorX: start.x, cursorY: start.y, targetAnchor: null })

    function onMove(me: MouseEvent) {
      const { x, y } = coords(me.clientX, me.clientY)
      let target: string | null = null
      let tAnchor: AnchorType | null = null
      for (const [id, pos] of positionsRef.current) {
        if (id === sourceId) continue
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + CARD_HEIGHT) {
          target = id
          tAnchor = x < pos.x + pos.width / 2 ? 'start' : 'end'
          break
        }
      }
      dragTargetRef.current = target
      dragTargetAnchorRef.current = tAnchor
      setDragTargetId(target)
      setRelationDrag(prev => prev ? { ...prev, cursorX: x, cursorY: y, targetAnchor: tAnchor } : null)
    }

    async function onUp() {
      const targetId = dragTargetRef.current
      const targetAnchor = dragTargetAnchorRef.current
      if (targetId && targetAnchor) await handleRelationDrop(sourceId, sourceAnchor, targetId, targetAnchor)
      setRelationDrag(null)
      setDragTargetId(null)
      dragTargetRef.current = null
      dragTargetAnchorRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function handleRelationDrop(sourceId: string, sourceAnchor: AnchorType, targetId: string, targetAnchor: AnchorType) {
    if (sourceId === targetId) return
    const srcPos = positionsRef.current.get(sourceId)
    const tgtPos = positionsRef.current.get(targetId)
    if (!srcPos || !tgtPos) return

    const srcAnchorX = sourceAnchor === 'start' ? srcPos.x : srcPos.x + srcPos.width
    const tgtAnchorX = targetAnchor === 'start' ? tgtPos.x : tgtPos.x + tgtPos.width

    const resolved = resolveRelationship(sourceId, sourceAnchor, srcAnchorX, targetId, targetAnchor, tgtAnchorX)
    if (!resolved) return
    const { predecessorId, taskId, relType } = resolved

    const taskObj = tasksRef.current.find(t => t.id === taskId)
    if (taskObj?.predecessorIds.includes(predecessorId)) return
    const localMap = new Map(tasksRef.current.map(t => [t.id, t]))
    if (wouldCreateCycle(localMap, predecessorId, taskId)) return
    try { await addPredecessor(taskId, predecessorId, relType); await load() } catch { /* ignore */ }
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
              <marker id="arrowhead-highlighted" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-primary)" />
              </marker>
              <marker id="arrowhead-drag" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-primary)" />
              </marker>
            </defs>
            {arrows.map(a => {
              const highlighted = selectedTaskId !== null && (a.fromId === selectedTaskId || a.toId === selectedTaskId)
              const dimmed = selectedTaskId !== null && !highlighted
              return (
                <path key={a.id} d={a.d} fill="none"
                  stroke={highlighted ? 'var(--color-primary)' : 'var(--color-border-strong)'}
                  strokeWidth={highlighted ? 2.5 : 1.5}
                  strokeDasharray={a.dashed ? '4 4' : undefined}
                  markerEnd={highlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                  opacity={highlighted ? 1 : dimmed ? 0.2 : 0.6} />
              )
            })}
            {dragLine && (
              <line x1={dragLine.x1} y1={dragLine.y1} x2={dragLine.x2} y2={dragLine.y2}
                stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="6 3"
                markerEnd="url(#arrowhead-drag)" opacity="0.8" />
            )}
          </svg>

          {filtered.map(task => {
            const pos = positions.get(task.id)
            if (!pos) return null
            return (
              <TaskGraphItem
                key={task.id}
                task={task}
                taskMap={taskMap}
                x={pos.x}
                y={pos.y}
                width={pos.width}
                selected={selectedTaskId === task.id}
                isDragTarget={dragTargetId === task.id}
                onSelect={setSelectedTaskId}
                onRelationDragStart={handleRelationDragStart}
              />
            )
          })}
        </div>


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

      <TaskDetailPanel
        task={selectedTaskId ? (tasks.find(t => t.id === selectedTaskId) ?? null) : null}
        tasks={tasks}
        users={users}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={load}
        onSelectTask={setSelectedTaskId}
      />
    </div>
  )
}
