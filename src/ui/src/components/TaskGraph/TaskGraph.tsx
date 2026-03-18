import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  addPredecessor,
  getTasks,
  removePredecessor,
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
  AXIS_SIZE,
  CANVAS_PAD_X,
  CANVAS_PAD_Y,
  CARD_HEIGHT,
  CARD_WIDTH,
  COL_WIDTH,
  MS_PER_DAY,
  ROW_HEIGHT,
  computeAutoLayout,
  computeAutoLayoutVertical,
  computeCanvasSize,
  computeCanvasSizeVertical,
  computeViewRange,
  dateToX,
  dateToY,
  xToDate,
  yToDate,
  type TaskPosition,
} from './graphLayout'
import { resolveRelationship } from './TaskGraph.utils'
import { useCurrentUser } from '../../hooks/useCurrentUser'
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

interface TaskGraphProps {
  selectTaskId?: string | null
  onTaskSelected?: () => void
}

export function TaskGraph({ selectTaskId, onTaskSelected }: TaskGraphProps) {
  const { user } = useCurrentUser()
  const config = user?.configuration
  const vertical = config?.timeAxisDirection === 'Vertical'
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
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Select a task when triggered externally (e.g. notification click)
  useEffect(() => {
    if (!selectTaskId) return
    setSelectedTaskId(selectTaskId)
    setSelectedRelId(null)
    onTaskSelected?.()
  }, [selectTaskId]) // eslint-disable-line react-hooks/exhaustive-deps

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
  // width when zoomed out (horizontal mode only).
  const { viewStart, viewEnd } = useMemo(() => {
    if (!containerWidth || vertical) return { viewStart: rawViewStart, viewEnd: rawViewEnd }
    const rawSpanPx = ((rawViewEnd.getTime() - rawViewStart.getTime()) / MS_PER_DAY) * pixelsPerDay
    const rawWidth = CANVAS_PAD_X * 2 + rawSpanPx
    const extraPx = Math.max(0, containerWidth - rawWidth)
    if (extraPx === 0) return { viewStart: rawViewStart, viewEnd: rawViewEnd }
    const extraMs = (extraPx / 2 / pixelsPerDay) * MS_PER_DAY
    return {
      viewStart: new Date(rawViewStart.getTime() - extraMs),
      viewEnd:   new Date(rawViewEnd.getTime()   + extraMs),
    }
  }, [rawViewStart, rawViewEnd, containerWidth, pixelsPerDay, vertical])

  const autoPositions = useMemo(
    () => vertical
      ? computeAutoLayoutVertical(filtered, viewStart, pixelsPerDay)
      : computeAutoLayout(filtered, viewStart, pixelsPerDay),
    [filtered, viewStart, pixelsPerDay, vertical],
  )

  const numRows = useMemo(() => {
    if (vertical) {
      const xs = [...autoPositions.values()].map(p => p.x)
      if (!xs.length) return 1
      return Math.floor((Math.max(...xs) - AXIS_SIZE) / COL_WIDTH) + 1
    }
    const ys = [...autoPositions.values()].map(p => p.y)
    if (!ys.length) return 1
    return Math.floor((Math.max(...ys) - CANVAS_PAD_Y) / ROW_HEIGHT) + 1
  }, [autoPositions, vertical])

  // In vertical mode, expand columns to fill the available container width instead of
  // using a fixed COL_WIDTH. containerWidth is tracked via ResizeObserver.
  const effectiveColWidth = useMemo(() => {
    if (!vertical || !containerWidth) return COL_WIDTH
    return Math.max(COL_WIDTH, Math.floor((containerWidth - AXIS_SIZE) / Math.max(numRows, 1)))
  }, [vertical, containerWidth, numRows])

  const { width: canvasWidth, height: canvasHeight } = useMemo(() => {
    if (vertical) {
      const { height } = computeCanvasSizeVertical(viewStart, viewEnd, pixelsPerDay, numRows)
      return { width: AXIS_SIZE + Math.max(numRows, 1) * effectiveColWidth, height }
    }
    return computeCanvasSize(viewStart, viewEnd, pixelsPerDay, numRows)
  }, [viewStart, viewEnd, pixelsPerDay, numRows, vertical, effectiveColWidth])

  // In vertical mode, remap card x-positions and widths to use effectiveColWidth.
  const positions = useMemo(() => {
    if (!vertical || effectiveColWidth === COL_WIDTH) return autoPositions
    const result = new Map<string, TaskPosition>()
    for (const [id, pos] of autoPositions) {
      const colIndex = Math.round((pos.x - AXIS_SIZE) / COL_WIDTH)
      result.set(id, {
        ...pos,
        x: AXIS_SIZE + colIndex * effectiveColWidth,
        // Keep the same right-margin as the default layout (COL_WIDTH - CARD_WIDTH = 20px)
        width: effectiveColWidth - (COL_WIDTH - CARD_WIDTH),
      })
    }
    return result
  }, [autoPositions, vertical, effectiveColWidth])

  useEffect(() => { positionsRef.current = positions }, [positions])

  // nowLine: vertical strip in horizontal mode; horizontal strip in vertical mode
  const nowLine = useMemo((): CSSProperties => vertical
    ? { top: dateToY(new Date(), viewStart, pixelsPerDay) }
    : { left: dateToX(new Date(), viewStart, pixelsPerDay) },
    [viewStart, pixelsPerDay, vertical])

  const weekBand = useMemo((): CSSProperties => vertical
    ? { top: dateToY(weekStart(new Date()), viewStart, pixelsPerDay), height: 7 * pixelsPerDay }
    : { left: dateToX(weekStart(new Date()), viewStart, pixelsPerDay), width: 7 * pixelsPerDay },
    [viewStart, pixelsPerDay, vertical])

  const gaps = useMemo(() => {
    const dates = filtered.filter(t => t.endDate)
      .flatMap(t => [t.startDate, t.endDate].filter(Boolean) as string[])
      .map(s => new Date(s).getTime())
      .sort((a, b) => a - b)
    const result: CSSProperties[] = []
    for (let i = 1; i < dates.length; i++) {
      if ((dates[i] - dates[i - 1]) / MS_PER_DAY > 14) {
        const from = vertical
          ? dateToY(new Date(dates[i - 1]), viewStart, pixelsPerDay)
          : dateToX(new Date(dates[i - 1]), viewStart, pixelsPerDay)
        const to = vertical
          ? dateToY(new Date(dates[i]), viewStart, pixelsPerDay)
          : dateToX(new Date(dates[i]), viewStart, pixelsPerDay)
        result.push(vertical ? { top: from, height: to - from } : { left: from, width: to - from })
      }
    }
    return result
  }, [filtered, viewStart, pixelsPerDay, vertical])

  // ── Arrows ────────────────────────────────────────────────────────────────

  const arrows = useMemo(() => {
    const filteredIds = new Set(filtered.map(t => t.id))
    const result: { id: string; fromId: string; toId: string; d: string; dashed: boolean; midX: number; midY: number }[] = []
    for (const task of filtered) {
      const toPos = positions.get(task.id)
      if (!toPos) continue
      for (const rel of task.predecessors) {
        const fromPos = positions.get(rel.relatedTaskId)
        if (!fromPos) continue

        const MIN_SEP = 20
        let d: string
        let midX: number
        let midY: number

        if (vertical) {
          // Vertical mode: time on Y axis, lanes on X axis
          const fromY = (rel.type === 'Exclusive' || rel.type === 'HaveCompleted')
            ? fromPos.y + (fromPos.height ?? CARD_HEIGHT) : fromPos.y
          const toY = (rel.type === 'Exclusive' || rel.type === 'HaveStarted')
            ? toPos.y : toPos.y + (toPos.height ?? CARD_HEIGHT)
          const x1 = fromPos.x + fromPos.width / 2
          const x2 = toPos.x + toPos.width / 2
          midX = (x1 + x2) / 2
          if (toY - fromY >= MIN_SEP) {
            const cy = (fromY + toY) / 2
            d = `M ${x1} ${fromY} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${toY}`
            midY = cy
          } else {
            const bypassY = Math.min(fromPos.y, toPos.y) - 50
            d = `M ${x1} ${fromY} C ${x1} ${bypassY}, ${x2} ${bypassY}, ${x2} ${toY}`
            midY = (fromY + toY + 6 * bypassY) / 8
          }
        } else {
          // Horizontal mode: time on X axis, lanes on Y axis
          const fromX = (rel.type === 'Exclusive' || rel.type === 'HaveCompleted')
            ? fromPos.x + fromPos.width : fromPos.x
          const toX = (rel.type === 'Exclusive' || rel.type === 'HaveStarted')
            ? toPos.x : toPos.x + toPos.width
          const y1 = fromPos.y + CARD_HEIGHT / 2
          const y2 = toPos.y   + CARD_HEIGHT / 2
          midY = (y1 + y2) / 2
          if (toX - fromX >= MIN_SEP) {
            const cx = (fromX + toX) / 2
            d = `M ${fromX} ${y1} C ${cx} ${y1}, ${cx} ${midY}, ${toX} ${y2}`
            midX = cx
          } else {
            const bypassX = Math.min(fromPos.x, toPos.x) - 50
            d = `M ${fromX} ${y1} C ${bypassX} ${y1}, ${bypassX} ${midY}, ${toX} ${y2}`
            midX = (fromX + toX + 6 * bypassX) / 8
          }
        }

        result.push({
          id: `${rel.relatedTaskId}->${task.id}`,
          fromId: rel.relatedTaskId,
          toId: task.id,
          d,
          dashed: !filteredIds.has(rel.relatedTaskId),
          midX,
          midY,
        })
      }
    }
    return result
  }, [filtered, positions, vertical])

  const dragLine = useMemo(() => {
    if (!relationDrag) return null
    const src = positionsRef.current.get(relationDrag.sourceId)
    if (!src) return null
    if (vertical) {
      const y1 = relationDrag.sourceAnchor === 'end' ? src.y + (src.height ?? CARD_HEIGHT) : src.y
      return { x1: src.x + src.width / 2, y1, x2: relationDrag.cursorX, y2: relationDrag.cursorY }
    }
    const x1 = relationDrag.sourceAnchor === 'end' ? src.x + src.width : src.x
    return { x1, y1: src.y + CARD_HEIGHT / 2, x2: relationDrag.cursorX, y2: relationDrag.cursorY }
  }, [relationDrag, vertical])

  // IDs of tasks that are anchors of the currently selected relationship
  const relAnchorIds = useMemo(() => {
    if (!selectedRelId) return new Set<string>()
    const [predId, taskId] = selectedRelId.split('->')
    return new Set([predId, taskId])
  }, [selectedRelId])

  // ── Relationship delete ────────────────────────────────────────────────────

  async function handleDeleteRelationship(relId: string) {
    const [predId, taskId] = relId.split('->')
    setSelectedRelId(null)
    try { await removePredecessor(taskId, predId); await load() } catch { /* ignore */ }
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pixelsPerDay * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
    setPixelsPerDay(newZoom)
    if (vertical) {
      const mouseY = e.clientY - rect.top + container.scrollTop
      const dateAtMouse = yToDate(mouseY, viewStart, pixelsPerDay)
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        containerRef.current.scrollTop = dateToY(dateAtMouse, viewStart, newZoom) - (e.clientY - rect.top)
      })
    } else {
      const mouseX = e.clientX - rect.left + container.scrollLeft
      const dateAtMouse = xToDate(mouseX, viewStart, pixelsPerDay)
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        containerRef.current.scrollLeft = dateToX(dateAtMouse, viewStart, newZoom) - (e.clientX - rect.left)
      })
    }
  }

  // ── Pan ───────────────────────────────────────────────────────────────────

  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return
    setSelectedTaskId(null)
    setSelectedRelId(null)
    panRef.current = {
      startX: e.clientX, startY: e.clientY,
      scrollLeft: containerRef.current?.scrollLeft ?? 0,
      scrollTop: containerRef.current?.scrollTop ?? 0,
    }
    function onMove(me: MouseEvent) {
      if (!panRef.current || !containerRef.current) return
      if (vertical) {
        containerRef.current.scrollTop = panRef.current.scrollTop - (me.clientY - panRef.current.startY)
      } else {
        containerRef.current.scrollLeft = panRef.current.scrollLeft - (me.clientX - panRef.current.startX)
      }
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
        const cardH = pos.height ?? CARD_HEIGHT
        if (vertical) {
          if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + cardH) {
            target = id
            tAnchor = y < pos.y + cardH / 2 ? 'start' : 'end'
            break
          }
        } else {
          if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + CARD_HEIGHT) {
            target = id
            tAnchor = x < pos.x + pos.width / 2 ? 'start' : 'end'
            break
          }
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

    const srcAnchorCoord = vertical
      ? (sourceAnchor === 'start' ? srcPos.y : srcPos.y + (srcPos.height ?? CARD_HEIGHT))
      : (sourceAnchor === 'start' ? srcPos.x : srcPos.x + srcPos.width)
    const tgtAnchorCoord = vertical
      ? (targetAnchor === 'start' ? tgtPos.y : tgtPos.y + (tgtPos.height ?? CARD_HEIGHT))
      : (targetAnchor === 'start' ? tgtPos.x : tgtPos.x + tgtPos.width)

    const resolved = resolveRelationship(sourceId, sourceAnchor, srcAnchorCoord, targetId, targetAnchor, tgtAnchorCoord)
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
      if (vertical) {
        const todayY = dateToY(new Date(), viewStart, pixelsPerDay)
        containerRef.current.scrollTop  = todayY - containerRef.current.clientHeight * 0.35
        containerRef.current.scrollLeft = 0
      } else {
        const todayX = dateToX(new Date(), viewStart, pixelsPerDay)
        containerRef.current.scrollLeft = todayX - containerRef.current.clientWidth * 0.35
        containerRef.current.scrollTop  = 0
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, vertical])

  // ── Filters ───────────────────────────────────────────────────────────────

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  function clearFilters() { setFilters(DEFAULT_FILTERS) }
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // ── Render ────────────────────────────────────────────────────────────────

  const axisPos: 'top' | 'bottom' | 'left' | 'right' = vertical
    ? (config?.timeAxisPosition === 'Right' ? 'right' : 'left')
    : (config?.timeAxisPosition === 'Bottom' ? 'bottom' : 'top')

  const timeAxisEl = (
    <TimeAxis
      key="time-axis"
      viewStart={viewStart} viewEnd={viewEnd} pixelsPerDay={pixelsPerDay}
      canvasSize={vertical ? canvasHeight : canvasWidth}
      position={axisPos}
    />
  )

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
          {/* TimeAxis rendered first for top/left, last for bottom/right so sticky positioning works */}
          {(axisPos === 'top' || axisPos === 'left') && timeAxisEl}

          <div className={vertical ? styles.weekBandV : styles.weekBand} style={weekBand} aria-hidden="true" />

          {gaps.map((g, i) => <div key={i} className={vertical ? styles.gapV : styles.gap} style={g} aria-hidden="true" />)}

          <div className={vertical ? styles.nowLineV : styles.nowLine} style={nowLine} aria-label="Current time" />

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
                height={vertical ? pos.height : undefined}
                selected={selectedTaskId === task.id || relAnchorIds.has(task.id)}
                isDragTarget={dragTargetId === task.id}
                onSelect={id => { setSelectedTaskId(id); setSelectedRelId(null) }}
                onRelationDragStart={handleRelationDragStart}
              />
            )
          })}

          {/* SVG z-index elevates when a relationship is selected so it renders over all cards */}
          <svg className={styles.arrowsSvg} width={canvasWidth} height={canvasHeight}
            style={{ pointerEvents: 'none', zIndex: selectedRelId ? 20 : 1 }}>
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
              const relSelected  = a.id === selectedRelId
              const taskHighlight = selectedTaskId !== null && (a.fromId === selectedTaskId || a.toId === selectedTaskId)
              const highlighted  = relSelected || taskHighlight
              const dimmed = !highlighted && (selectedTaskId !== null || selectedRelId !== null)
              return (
                <g key={a.id}>
                  {/* Invisible wide hit area for click detection */}
                  <path d={a.d} fill="none" stroke="transparent" strokeWidth={12}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={() => { setSelectedRelId(a.id); setSelectedTaskId(null) }} />
                  {/* Visible arrow */}
                  <path d={a.d} fill="none"
                    stroke={highlighted ? 'var(--color-primary)' : 'var(--color-border-strong)'}
                    strokeWidth={highlighted ? 2.5 : 1.5}
                    strokeDasharray={a.dashed ? '4 4' : undefined}
                    markerEnd={highlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                    opacity={highlighted ? 1 : dimmed ? 0.2 : 0.6} />
                  {/* Delete button — only on the selected relationship */}
                  {relSelected && (
                    <g transform={`translate(${a.midX}, ${a.midY})`}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={() => handleDeleteRelationship(a.id)}
                      aria-label="Remove relationship">
                      <circle r={10} fill="var(--color-danger)" />
                      <text textAnchor="middle" dominantBaseline="central"
                        fill="white" fontSize={14} style={{ userSelect: 'none' }}>×</text>
                    </g>
                  )}
                </g>
              )
            })}
            {dragLine && (
              <line x1={dragLine.x1} y1={dragLine.y1} x2={dragLine.x2} y2={dragLine.y2}
                stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="6 3"
                markerEnd="url(#arrowhead-drag)" opacity="0.8" />
            )}
          </svg>

          {(axisPos === 'bottom' || axisPos === 'right') && timeAxisEl}
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
        onDeleted={() => { setSelectedTaskId(null); void load() }}
        onSelectTask={setSelectedTaskId}
        autoSaveDelayMs={config ? config.autoSaveDelaySeconds * 1000 : 2000}
      />
    </div>
  )
}
