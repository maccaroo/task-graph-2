import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  addPredecessor,
  getTasks,
  removePredecessor,
  updateTask,
  type CreateTaskData,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../services/tasks'
import { getUsers, updateUserConfiguration, type UserConfiguration, type UserSummary } from '../../services/users'
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
import { snapDate } from './dragSnap'
import { computeMovementCorridor, clampMoveDelta, clampResizePx, computeCascadeUpdates, type CascadeUpdate } from './dragConstraints'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useCommandHistory } from '../../hooks/useCommandHistory'
import { positionCommand } from '../../lib/commands/PositionCommand'
import { updateTaskCommand } from '../../lib/commands/UpdateTaskCommand'
import { GraphMiniMap } from './GraphMiniMap'
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
const DRAG_THRESHOLD_PX = 4

interface RelationDrag {
  sourceId: string
  sourceAnchor: AnchorType
  cursorX: number
  cursorY: number
  targetAnchor: AnchorType | null
}

interface MoveDrag {
  taskId: string
  /** Original pixel position of the card's leading edge (left in H-mode, top in V-mode). */
  originalPosPx: number
  /** Card size in the drag axis: width (H-mode) or height (V-mode). */
  cardSizePx: number
  /** Current clamped+snapped delta from originalPosPx. */
  deltaPx: number
  corridor: { lowerPx: number; upperPx: number }
  /** True when the task's anchor is its endDate (no startDate). */
  endAnchored: boolean
  /** Free anchor positions to cascade to related tasks during and after this drag. */
  cascadeUpdates: Map<string, CascadeUpdate>
}

interface ResizeDrag {
  taskId: string
  anchor: 'start' | 'end'
  /** Current clamped+snapped position of the dragged edge (absolute canvas coords). */
  currentPx: number
  corridor: { lowerPx: number; upperPx: number }
  /** Free anchor positions to cascade to related tasks during and after this drag. */
  cascadeUpdates: Map<string, CascadeUpdate>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function taskToData(t: Task): CreateTaskData {
  return {
    title: t.title,
    description: t.description ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    status: t.status,
    priority: t.priority,
    tags: t.tags,
    startType: t.startType,
    startDate: t.startDate ?? undefined,
    endType: t.endType,
    endDate: t.endDate ?? undefined,
  }
}

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
  const { user, refresh } = useCurrentUser()
  const config = user?.configuration
  const vertical = config?.timeAxisDirection === 'Vertical'
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const { push: pushCommand, undo: undoCommand, redo: redoCommand, canUndo, canRedo } = useCommandHistory()

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

  // ── Move / resize drag state ──────────────────────────────────────────────

  const [moveDrag, setMoveDrag] = useState<MoveDrag | null>(null)
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null)
  // Refs track the latest drag values for use in async mouseup handlers
  const moveDeltaRef   = useRef<number>(0)
  const resizePxRef    = useRef<number>(0)

  const positionsRef = useRef<Map<string, TaskPosition>>(new Map())
  const tasksRef = useRef<Task[]>([])
  // Refs for zoom/layout values needed inside drag closures
  const pixelsPerDayRef = useRef(pixelsPerDay)
  const viewStartRef    = useRef<Date>(new Date())
  const verticalRef     = useRef(vertical)

  useEffect(() => { pixelsPerDayRef.current = pixelsPerDay }, [pixelsPerDay])
  useEffect(() => { verticalRef.current = vertical }, [vertical])

  // ── Dynamic min-zoom (T3) ─────────────────────────────────────────────────
  // Clamp zoom-out so at most 20% of empty space appears beyond each end of span.
  const computedMinZoom = useMemo(() => {
    const dates: number[] = []
    for (const t of tasks) {
      if (t.startDate) dates.push(new Date(t.startDate).getTime())
      if (t.endDate) dates.push(new Date(t.endDate).getTime())
    }
    if (dates.length < 2) return MIN_ZOOM
    const spanMs = Math.max(...dates) - Math.min(...dates)
    if (spanMs <= 0) return MIN_ZOOM
    const spanDays = spanMs / MS_PER_DAY
    const viewSize = vertical ? containerHeight : containerWidth
    if (viewSize <= 0) return MIN_ZOOM
    return Math.max(MIN_ZOOM, viewSize / (spanDays * 1.4))
  }, [tasks, containerWidth, containerHeight, vertical])

  const computedMinZoomRef = useRef(computedMinZoom)
  useEffect(() => { computedMinZoomRef.current = computedMinZoom }, [computedMinZoom])

  // Clamp current zoom when the dynamic minimum rises (e.g. after tasks are removed)
  useEffect(() => {
    if (pixelsPerDay < computedMinZoom) setPixelsPerDay(computedMinZoom)
  }, [computedMinZoom]) // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
      setContainerHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading])

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const f = applyFilters(tasks, filters)
    return showOpenEnded ? f : f.filter(t => t.startDate || t.endDate)
  }, [tasks, filters, showOpenEnded])

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])

  const { viewStart: rawViewStart, viewEnd: rawViewEnd } = useMemo(
    () => computeViewRange(filtered.length ? filtered : tasks),
    [filtered, tasks],
  )

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

  // Keep viewStartRef current for drag handlers
  useEffect(() => { viewStartRef.current = viewStart }, [viewStart])

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

  const { width: canvasWidth, height: canvasHeight } = useMemo(() => {
    if (vertical) {
      const { height } = computeCanvasSizeVertical(viewStart, viewEnd, pixelsPerDay, numRows)
      const lanesWidth = AXIS_SIZE + Math.max(numRows, 1) * COL_WIDTH
      return { width: Math.max(lanesWidth, containerWidth || 0), height }
    }
    return computeCanvasSize(viewStart, viewEnd, pixelsPerDay, numRows)
  }, [viewStart, viewEnd, pixelsPerDay, numRows, vertical, containerWidth])

  const positions = autoPositions

  useEffect(() => { positionsRef.current = positions }, [positions])

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

  // Non-passive wheel listener so preventDefault() actually suppresses scroll.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handler(e: WheelEvent) {
      const container = containerRef.current
      if (!container) return
      e.preventDefault()
      const ppd = pixelsPerDayRef.current
      const minZ = computedMinZoomRef.current
      const newZoom = Math.min(MAX_ZOOM, Math.max(minZ, ppd * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
      setPixelsPerDay(newZoom)
      const rect = container.getBoundingClientRect()
      if (verticalRef.current) {
        const mouseY = e.clientY - rect.top + container.scrollTop
        const dateAtMouse = yToDate(mouseY, viewStartRef.current, ppd)
        requestAnimationFrame(() => {
          if (containerRef.current) containerRef.current.scrollTop = dateToY(dateAtMouse, viewStartRef.current, newZoom) - (e.clientY - rect.top)
        })
      } else {
        const mouseX = e.clientX - rect.left + container.scrollLeft
        const dateAtMouse = xToDate(mouseX, viewStartRef.current, ppd)
        requestAnimationFrame(() => {
          if (containerRef.current) containerRef.current.scrollLeft = dateToX(dateAtMouse, viewStartRef.current, newZoom) - (e.clientX - rect.left)
        })
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [loading]) // re-register once container is mounted

  // Zoom to a target level, keeping the viewport centred on the current midpoint.
  function zoomTo(target: number) {
    const newZoom = Math.min(MAX_ZOOM, Math.max(computedMinZoom, target))
    const container = containerRef.current
    if (!container) { setPixelsPerDay(newZoom); return }
    if (vertical) {
      const centerY = container.scrollTop + container.clientHeight / 2
      const dateAtCenter = yToDate(centerY, viewStart, pixelsPerDay)
      setPixelsPerDay(newZoom)
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        containerRef.current.scrollTop = dateToY(dateAtCenter, viewStart, newZoom) - containerRef.current.clientHeight / 2
      })
    } else {
      const centerX = container.scrollLeft + container.clientWidth / 2
      const dateAtCenter = xToDate(centerX, viewStart, pixelsPerDay)
      setPixelsPerDay(newZoom)
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        containerRef.current.scrollLeft = dateToX(dateAtCenter, viewStart, newZoom) - containerRef.current.clientWidth / 2
      })
    }
  }

  // Logarithmic slider helpers: maps [computedMinZoom, MAX_ZOOM] ↔ [0, 100].
  const sliderValue = Math.max(0, Math.min(100,
    computedMinZoom >= MAX_ZOOM ? 100
      : 100 * Math.log(pixelsPerDay / computedMinZoom) / Math.log(MAX_ZOOM / computedMinZoom),
  ))
  function sliderToZoom(val: number): number {
    return computedMinZoom * Math.pow(MAX_ZOOM / computedMinZoom, val / 100)
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

  // ── Move drag (card body drag) ────────────────────────────────────────────

  function handleCardDragAttempt(taskId: string, clientX: number, clientY: number) {
    const foundTask = tasksRef.current.find(t => t.id === taskId)
    if (!foundTask) return
    // Explicitly typed so TypeScript preserves the non-null type inside closures
    const task: Task = foundTask

    // Open-ended tasks have no dates: treat as click
    if (!task.startDate && !task.endDate) {
      setSelectedTaskId(taskId)
      setSelectedRelId(null)
      return
    }

    const pos = positionsRef.current.get(taskId)
    if (!pos) return

    const vert = verticalRef.current
    const ppd  = pixelsPerDayRef.current
    const vs   = viewStartRef.current

    // The leading-edge pixel position of the card
    const originalPosPx = vert ? pos.y : pos.x
    const cardSizePx    = vert ? (pos.height ?? CARD_HEIGHT) : pos.width
    const endAnchored   = !task.startDate && Boolean(task.endDate)

    const localMap = new Map(tasksRef.current.map(t => [t.id, t]))
    const corridor = computeMovementCorridor(task, localMap, 'move', ppd, vs, vert)

    let dragInitiated = false
    moveDeltaRef.current = 0
    const moveCascadeRef = { current: new Map<string, CascadeUpdate>() }

    function onMove(me: MouseEvent) {
      const rawDelta = vert ? (me.clientY - clientY) : (me.clientX - clientX)

      if (!dragInitiated) {
        if (Math.abs(rawDelta) < DRAG_THRESHOLD_PX) return
        dragInitiated = true
      }

      // Compute the snapped delta
      const primaryDateStr = task.startDate ?? task.endDate!
      const rawDateMs = new Date(primaryDateStr).getTime() + (rawDelta / pixelsPerDayRef.current) * MS_PER_DAY
      const otherTasks = tasksRef.current.filter(t => t.id !== taskId)
      const snappedDate = snapDate(new Date(rawDateMs), pixelsPerDayRef.current, otherTasks)
      const snappedDeltaPx = ((snappedDate.getTime() - new Date(primaryDateStr).getTime()) / MS_PER_DAY) * pixelsPerDayRef.current

      const clampedDelta = clampMoveDelta(corridor, originalPosPx, endAnchored, snappedDeltaPx)

      // Effective new pixel positions of the dragged task's date anchors
      const newStartPx = task.startDate ? originalPosPx + clampedDelta : null
      const newEndPx   = task.endDate
        ? endAnchored
          ? originalPosPx + CARD_WIDTH + clampedDelta   // end-only: anchor at leading + CARD_WIDTH
          : originalPosPx + cardSizePx + clampedDelta   // start or both: endDate at leading + size
        : null

      const cascadeUpdates = computeCascadeUpdates(task, newStartPx, newEndPx, localMap, ppd, vs, vert)

      moveDeltaRef.current = clampedDelta
      moveCascadeRef.current = cascadeUpdates
      setMoveDrag({ taskId, originalPosPx, cardSizePx, deltaPx: clampedDelta, corridor, endAnchored, cascadeUpdates })
    }

    async function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (!dragInitiated) {
        // Treat as click/select
        setSelectedTaskId(taskId)
        setSelectedRelId(null)
        return
      }

      const delta = moveDeltaRef.current
      const cascade = moveCascadeRef.current
      setMoveDrag(null)
      if (Math.abs(delta) < 1) return

      await commitMove(task, delta, cascade)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function commitMove(task: Task, deltaPx: number, cascadeUpdates: Map<string, CascadeUpdate>) {
    const ppd = pixelsPerDayRef.current
    const vs  = viewStartRef.current
    const vert = verticalRef.current
    const deltaMs = (deltaPx / ppd) * MS_PER_DAY
    const newStartDate = task.startDate
      ? new Date(new Date(task.startDate).getTime() + deltaMs).toISOString()
      : undefined
    const newEndDate = task.endDate
      ? new Date(new Date(task.endDate).getTime() + deltaMs).toISOString()
      : undefined

    // Snapshot before/after for undo/redo
    const taskBefore = taskToData(task)
    const taskAfter: CreateTaskData = { ...taskBefore, startDate: newStartDate, endDate: newEndDate }
    const cascadeBefore = new Map<string, CreateTaskData>()
    const cascadeAfter  = new Map<string, CreateTaskData>()
    const toDate = (px: number) => vert ? yToDate(px, vs, ppd).toISOString() : xToDate(px, vs, ppd).toISOString()
    for (const [relId, update] of cascadeUpdates) {
      const rel = tasksRef.current.find(t => t.id === relId)
      if (!rel) continue
      cascadeBefore.set(relId, taskToData(rel))
      cascadeAfter.set(relId, {
        ...taskToData(rel),
        startDate: update.startPx !== undefined ? toDate(update.startPx) : (rel.startDate ?? undefined),
        endDate:   update.endPx   !== undefined ? toDate(update.endPx)   : (rel.endDate   ?? undefined),
      })
    }

    try {
      await updateTask(task.id, taskAfter)
    } catch { /* ignore — reload will revert */ }

    await commitCascade(cascadeUpdates, ppd, vs, vert)
    pushCommand(positionCommand(task.id, taskBefore, taskAfter, cascadeBefore, cascadeAfter))
    await load()
  }

  async function commitCascade(
    cascadeUpdates: Map<string, CascadeUpdate>,
    ppd: number,
    vs: Date,
    vert: boolean,
  ) {
    for (const [relatedTaskId, update] of cascadeUpdates) {
      const relatedTask = tasksRef.current.find(t => t.id === relatedTaskId)
      if (!relatedTask) continue
      const toDate = (px: number) => vert
        ? yToDate(px, vs, ppd).toISOString()
        : xToDate(px, vs, ppd).toISOString()
      try {
        await updateTask(relatedTaskId, {
          title: relatedTask.title,
          description: relatedTask.description ?? undefined,
          assigneeId: relatedTask.assigneeId ?? undefined,
          status: relatedTask.status,
          priority: relatedTask.priority,
          tags: relatedTask.tags,
          startType: relatedTask.startType,
          startDate: update.startPx !== undefined ? toDate(update.startPx) : (relatedTask.startDate ?? undefined),
          endType: relatedTask.endType,
          endDate: update.endPx !== undefined ? toDate(update.endPx) : (relatedTask.endDate ?? undefined),
        })
      } catch { /* ignore — reload will revert */ }
    }
  }

  // ── Resize drag (edge handle drag) ────────────────────────────────────────

  function handleResizeDragStart(taskId: string, anchor: 'start' | 'end') {
    const foundTask = tasksRef.current.find(t => t.id === taskId)
    if (!foundTask) return
    // Explicitly typed so TypeScript preserves the non-null type inside closures
    const task: Task = foundTask

    const vert = verticalRef.current
    const ppd  = pixelsPerDayRef.current
    const vs   = viewStartRef.current
    const containerEl = containerRef.current
    if (!containerEl) return
    // Captured as HTMLDivElement (not null) so closures can access it safely
    const container: HTMLDivElement = containerEl
    const rect = container.getBoundingClientRect()

    const operation = anchor === 'start' ? 'resize-start' : 'resize-end'
    const localMap = new Map(tasksRef.current.map(t => [t.id, t]))
    const corridor = computeMovementCorridor(task, localMap, operation, ppd, vs, vert)

    const dateStr = anchor === 'start' ? task.startDate! : task.endDate!
    const originalPx = vert
      ? dateToY(new Date(dateStr), vs, ppd)
      : dateToX(new Date(dateStr), vs, ppd)

    resizePxRef.current = originalPx

    function toCanvasPx(clientCoord: number, scrollCoord: number, rectCoord: number): number {
      return clientCoord - rectCoord + scrollCoord
    }

    const resizeCascadeRef = { current: new Map<string, CascadeUpdate>() }

    function onMove(me: MouseEvent) {
      const rawPx = vert
        ? toCanvasPx(me.clientY, container.scrollTop, rect.top)
        : toCanvasPx(me.clientX, container.scrollLeft, rect.left)

      // Snap
      const rawDate = vert
        ? yToDate(rawPx, viewStartRef.current, pixelsPerDayRef.current)
        : xToDate(rawPx, viewStartRef.current, pixelsPerDayRef.current)
      const otherTasks = tasksRef.current.filter(t => t.id !== taskId)
      const snappedDate = snapDate(rawDate, pixelsPerDayRef.current, otherTasks)
      const snappedPx = vert
        ? dateToY(snappedDate, viewStartRef.current, pixelsPerDayRef.current)
        : dateToX(snappedDate, viewStartRef.current, pixelsPerDayRef.current)

      const clamped = clampResizePx(corridor, snappedPx)

      // Effective new pixel positions for cascade computation
      const newStartPx = anchor === 'start' ? clamped : (task.startDate ? dateToX(new Date(task.startDate), vs, ppd) : null)
      const newEndPx   = anchor === 'end'   ? clamped : (task.endDate   ? dateToX(new Date(task.endDate),   vs, ppd) : null)
      const cascadeUpdates = computeCascadeUpdates(task, newStartPx, newEndPx, localMap, ppd, vs, vert)

      resizePxRef.current = clamped
      resizeCascadeRef.current = cascadeUpdates
      setResizeDrag({ taskId, anchor, currentPx: clamped, corridor, cascadeUpdates })
    }

    async function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      const finalPx = resizePxRef.current
      const cascade = resizeCascadeRef.current
      setResizeDrag(null)

      if (Math.abs(finalPx - originalPx) < 1) return

      await commitResize(task, anchor, finalPx, cascade)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function commitResize(task: Task, anchor: 'start' | 'end', finalPx: number, cascadeUpdates: Map<string, CascadeUpdate>) {
    const vert = verticalRef.current
    const vs   = viewStartRef.current
    const ppd  = pixelsPerDayRef.current
    const newDate = vert
      ? yToDate(finalPx, vs, ppd)
      : xToDate(finalPx, vs, ppd)

    const newDateIso = newDate.toISOString()

    // Snapshot before/after for undo/redo
    const taskBefore = taskToData(task)
    const taskAfter: CreateTaskData = {
      ...taskBefore,
      startDate: anchor === 'start' ? newDateIso : (task.startDate ?? undefined),
      endDate:   anchor === 'end'   ? newDateIso : (task.endDate   ?? undefined),
    }
    const cascadeBefore = new Map<string, CreateTaskData>()
    const cascadeAfter  = new Map<string, CreateTaskData>()
    const toDate = (px: number) => vert ? yToDate(px, vs, ppd).toISOString() : xToDate(px, vs, ppd).toISOString()
    for (const [relId, update] of cascadeUpdates) {
      const rel = tasksRef.current.find(t => t.id === relId)
      if (!rel) continue
      cascadeBefore.set(relId, taskToData(rel))
      cascadeAfter.set(relId, {
        ...taskToData(rel),
        startDate: update.startPx !== undefined ? toDate(update.startPx) : (rel.startDate ?? undefined),
        endDate:   update.endPx   !== undefined ? toDate(update.endPx)   : (rel.endDate   ?? undefined),
      })
    }

    try {
      await updateTask(task.id, taskAfter)
    } catch { /* ignore — reload will revert */ }

    await commitCascade(cascadeUpdates, ppd, vs, vert)
    pushCommand(positionCommand(task.id, taskBefore, taskAfter, cascadeBefore, cascadeAfter))
    await load()
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

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    await undoCommand()
    await load()
  }, [undoCommand]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRedo = useCallback(async () => {
    await redoCommand()
    await load()
  }, [redoCommand]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleDirection = useCallback(async () => {
    if (!user) return
    const newDirection: UserConfiguration['timeAxisDirection'] = vertical ? 'Horizontal' : 'Vertical'
    const currentPosition = config?.timeAxisPosition ?? 'Top'
    const newPosition: UserConfiguration['timeAxisPosition'] =
      newDirection === 'Horizontal'
        ? (currentPosition === 'Left' || currentPosition === 'Right' ? 'Top' : currentPosition)
        : (currentPosition === 'Top' || currentPosition === 'Bottom' ? 'Left' : currentPosition)
    await updateUserConfiguration(user.id, {
      defaultTasksView: config?.defaultTasksView ?? 'Graph',
      timeAxisDirection: newDirection,
      timeAxisPosition: newPosition,
      autoSaveDelaySeconds: config?.autoSaveDelaySeconds ?? 2,
    })
    await refresh()
  }, [user, vertical, config, refresh])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (!e.shiftKey && e.key === 'z') { e.preventDefault(); void handleUndo() }
      if ( e.shiftKey && e.key === 'z') { e.preventDefault(); void handleRedo() }
      if (!e.shiftKey && e.key === 'y') { e.preventDefault(); void handleRedo() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  function handleTaskSaved(taskId: string, before: CreateTaskData, after: CreateTaskData) {
    pushCommand(updateTaskCommand(taskId, before, after))
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  function clearFilters() { setFilters(DEFAULT_FILTERS) }
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // ── Drag visual state ─────────────────────────────────────────────────────

  const activeDrag = moveDrag ?? resizeDrag
  const hasCorridor = activeDrag !== null
    && (isFinite(activeDrag.corridor.lowerPx) || isFinite(activeDrag.corridor.upperPx))

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

  // Ghost card position (during move drag)
  const ghostCardStyle: CSSProperties | null = (() => {
    if (!moveDrag) return null
    const pos = positionsRef.current.get(moveDrag.taskId)
    if (!pos) return null
    const ghostLeadPx = moveDrag.originalPosPx + moveDrag.deltaPx
    if (vertical) {
      return { left: pos.x, top: ghostLeadPx, width: pos.width, height: moveDrag.cardSizePx }
    }
    return { left: ghostLeadPx, top: pos.y, width: moveDrag.cardSizePx }
  })()

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

      <div className={styles.graphWrapper}>
        <div ref={containerRef} className={styles.canvasContainer}>
          <div className={styles.canvas} style={{ width: canvasWidth, height: canvasHeight }} onMouseDown={handleCanvasMouseDown}>
          {(axisPos === 'top' || axisPos === 'left') && timeAxisEl}

          <div className={vertical ? styles.weekBandV : styles.weekBand} style={weekBand} aria-hidden="true" />

          {gaps.map((g, i) => <div key={i} className={vertical ? styles.gapV : styles.gap} style={g} aria-hidden="true" />)}

          <div className={vertical ? styles.nowLineV : styles.nowLine} style={nowLine} aria-label="Current time" />

          {/* Ghost card during move drag */}
          {ghostCardStyle && (
            <div className={styles.ghostCard} style={ghostCardStyle} aria-hidden="true" />
          )}

          {filtered.map(task => {
            const pos = positions.get(task.id)
            if (!pos) return null

            // Apply cascade position override for tasks whose free anchors are following the drag
            const cascadeUpdate = activeDrag?.cascadeUpdates.get(task.id)
            let renderX = pos.x, renderY = pos.y, renderW = pos.width, renderH = pos.height
            if (cascadeUpdate && !vertical) {
              if (cascadeUpdate.startPx !== undefined) {
                const endPx = task.endDate ? dateToX(new Date(task.endDate), viewStart, pixelsPerDay) : pos.x + pos.width
                renderX = cascadeUpdate.startPx
                renderW = Math.max(endPx - cascadeUpdate.startPx, CARD_WIDTH)
              }
              if (cascadeUpdate.endPx !== undefined) {
                const startPx = task.startDate ? dateToX(new Date(task.startDate), viewStart, pixelsPerDay) : pos.x
                renderW = Math.max(cascadeUpdate.endPx - startPx, CARD_WIDTH)
              }
            } else if (cascadeUpdate && vertical) {
              if (cascadeUpdate.startPx !== undefined) {
                const endPy = task.endDate ? dateToY(new Date(task.endDate), viewStart, pixelsPerDay) : pos.y + (pos.height ?? CARD_HEIGHT)
                renderY = cascadeUpdate.startPx
                renderH = Math.max(endPy - cascadeUpdate.startPx, CARD_HEIGHT)
              }
              if (cascadeUpdate.endPx !== undefined) {
                const startPy = task.startDate ? dateToY(new Date(task.startDate), viewStart, pixelsPerDay) : pos.y
                renderH = Math.max(cascadeUpdate.endPx - startPy, CARD_HEIGHT)
              }
            }

            return (
              <TaskGraphItem
                key={task.id}
                task={task}
                taskMap={taskMap}
                x={renderX}
                y={renderY}
                width={renderW}
                height={vertical ? renderH : undefined}
                selected={selectedTaskId === task.id || relAnchorIds.has(task.id)}
                isDragTarget={dragTargetId === task.id}
                isDragging={moveDrag?.taskId === task.id || resizeDrag?.taskId === task.id}
                vertical={vertical}
                onSelect={id => { setSelectedTaskId(id); setSelectedRelId(null) }}
                onCardDragAttempt={handleCardDragAttempt}
                onRelationDragStart={handleRelationDragStart}
                onResizeDragStart={handleResizeDragStart}
              />
            )
          })}

          {/* SVG: arrows + drag visuals; z-index elevated during drag so lines render above cards */}
          <svg className={styles.arrowsSvg} width={canvasWidth} height={canvasHeight}
            style={{
              pointerEvents: 'none',
              zIndex: selectedRelId ? 20 : (moveDrag || resizeDrag) ? 12 : 1,
            }}>
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
                  <path d={a.d} fill="none" stroke="transparent" strokeWidth={12}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={() => { setSelectedRelId(a.id); setSelectedTaskId(null) }} />
                  <path d={a.d} fill="none"
                    stroke={highlighted ? 'var(--color-primary)' : 'var(--color-border-strong)'}
                    strokeWidth={highlighted ? 2.5 : 1.5}
                    strokeDasharray={a.dashed ? '4 4' : undefined}
                    markerEnd={highlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                    opacity={highlighted ? 1 : dimmed ? 0.2 : 0.6} />
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

            {/* ── Corridor band ── */}
            {hasCorridor && (() => {
              const { lowerPx, upperPx } = activeDrag!.corridor
              const lo = isFinite(lowerPx) ? lowerPx : 0
              // For move drags extend the band to show the full task extent
              // (latest trailing-edge = upperPx + cardSize)
              const trailExtra = moveDrag ? moveDrag.cardSizePx : 0
              const hi = isFinite(upperPx)
                ? upperPx + trailExtra
                : (vertical ? canvasHeight : canvasWidth)
              return vertical
                ? <rect x={0} y={lo} width={canvasWidth} height={Math.max(0, hi - lo)}
                    fill="var(--color-primary)" opacity={0.07} />
                : <rect x={lo} y={0} width={Math.max(0, hi - lo)} height={canvasHeight}
                    fill="var(--color-primary)" opacity={0.07} />
            })()}

            {/* Corridor limit lines */}
            {hasCorridor && isFinite(activeDrag!.corridor.lowerPx) && (
              vertical
                ? <line x1={0} y1={activeDrag!.corridor.lowerPx} x2={canvasWidth} y2={activeDrag!.corridor.lowerPx}
                    stroke="var(--color-primary)" strokeWidth={1} opacity={0.4} strokeDasharray="3 3" />
                : <line x1={activeDrag!.corridor.lowerPx} y1={0} x2={activeDrag!.corridor.lowerPx} y2={canvasHeight}
                    stroke="var(--color-primary)" strokeWidth={1} opacity={0.4} strokeDasharray="3 3" />
            )}
            {hasCorridor && isFinite(activeDrag!.corridor.upperPx) && (
              vertical
                ? <line x1={0} y1={activeDrag!.corridor.upperPx} x2={canvasWidth} y2={activeDrag!.corridor.upperPx}
                    stroke="var(--color-primary)" strokeWidth={1} opacity={0.4} strokeDasharray="3 3" />
                : <line x1={activeDrag!.corridor.upperPx} y1={0} x2={activeDrag!.corridor.upperPx} y2={canvasHeight}
                    stroke="var(--color-primary)" strokeWidth={1} opacity={0.4} strokeDasharray="3 3" />
            )}

            {/* ── Alignment lines during move ── */}
            {moveDrag && (() => {
              const leadPx = moveDrag.originalPosPx + moveDrag.deltaPx
              const trailPx = leadPx + moveDrag.cardSizePx
              return vertical ? (
                <>
                  <line x1={0} y1={leadPx}  x2={canvasWidth} y2={leadPx}
                    stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.65} />
                  <line x1={0} y1={trailPx} x2={canvasWidth} y2={trailPx}
                    stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.65} />
                </>
              ) : (
                <>
                  <line x1={leadPx}  y1={0} x2={leadPx}  y2={canvasHeight}
                    stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.65} />
                  <line x1={trailPx} y1={0} x2={trailPx} y2={canvasHeight}
                    stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.65} />
                </>
              )
            })()}

            {/* ── Alignment line during resize ── */}
            {resizeDrag && (
              vertical
                ? <line x1={0} y1={resizeDrag.currentPx} x2={canvasWidth} y2={resizeDrag.currentPx}
                    stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.65} />
                : <line x1={resizeDrag.currentPx} y1={0} x2={resizeDrag.currentPx} y2={canvasHeight}
                    stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.65} />
            )}
          </svg>

          {(axisPos === 'bottom' || axisPos === 'right') && timeAxisEl}
        </div>
        </div>
        <GraphMiniMap
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          containerRef={containerRef}
          vertical={vertical}
          positions={positions}
          tasks={filtered}
        />
      </div>

      <div className={styles.actionPanel}>
        <div className={styles.actionLeft}>
          <button className={styles.iconBtn} onClick={() => { void handleUndo() }} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button className={styles.iconBtn} onClick={() => { void handleRedo() }} disabled={!canRedo} title="Redo (Ctrl+Y)">↪ Redo</button>
          <div className={styles.zoomControls}>
            <button className={styles.zoomBtn} onClick={() => zoomTo(pixelsPerDay / 1.5)}
              title="Zoom out" aria-label="Zoom out">−</button>
            <input
              type="range" className={styles.zoomSlider}
              min={0} max={100} step={0.5}
              value={sliderValue}
              onChange={e => zoomTo(sliderToZoom(parseFloat(e.target.value)))}
              aria-label="Zoom level"
            />
            <button className={styles.zoomBtn} onClick={() => zoomTo(pixelsPerDay * 1.5)}
              title="Zoom in" aria-label="Zoom in">+</button>
            <button className={styles.zoomBtn} onClick={() => zoomTo(DEFAULT_ZOOM)}
              title="Reset zoom" aria-label="Reset zoom">↺</button>
          </div>
          <button className={`${styles.iconBtn} ${filtersOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} title="Toggle filters">
            Filters {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
          </button>
          <button className={`${styles.iconBtn} ${!showOpenEnded ? styles.iconBtnActive : ''}`}
            onClick={() => setShowOpenEnded(v => !v)}
            title={showOpenEnded ? 'Hide open-ended tasks' : 'Show open-ended tasks'}>
            Open-ended: {showOpenEnded ? 'shown' : 'hidden'}
          </button>
          <button className={styles.iconBtn}
            onClick={() => { void handleToggleDirection() }}
            title={`Switch to ${vertical ? 'Horizontal' : 'Vertical'} layout`}>
            {vertical ? 'Horizontal' : 'Vertical'}
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
        onTaskSaved={handleTaskSaved}
        autoSaveDelayMs={config ? config.autoSaveDelaySeconds * 1000 : 2000}
      />
    </div>
  )
}
