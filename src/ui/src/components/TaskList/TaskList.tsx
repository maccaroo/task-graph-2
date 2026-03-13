import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'
import { getTasks, type Task, type TaskPriority, type TaskStatus } from '../../services/tasks'
import { getUsers, type UserSummary } from '../../services/users'
import { computeDueStatus, DUE_STATUS_COLOR_VAR, DUE_STATUS_LABEL, type DueStatusKey } from '../../utils/taskStatus'
import { ROUTES } from '../../routeConstants'
import { AddTaskModal } from './AddTaskModal'
import styles from './TaskList.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

type SortColumn = 'title' | 'priority' | 'assignee' | 'startDate' | 'endDate' | 'duration' | 'status'

interface SortState {
  column: SortColumn
  direction: 'asc' | 'desc'
}

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

// ── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 }

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Parse .NET TimeSpan string "d.HH:mm:ss" or "HH:mm:ss" → human-readable. */
function formatDuration(raw: string | null): string {
  if (!raw) return '—'
  // may be "d.HH:mm:ss.fffffff" or "HH:mm:ss"
  const m = raw.match(/^(?:(\d+)\.)?(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return raw
  const days = parseInt(m[1] ?? '0', 10)
  const hours = parseInt(m[2], 10)
  const minutes = parseInt(m[3], 10)
  const parts: string[] = []
  if (days)    parts.push(`${days}d`)
  if (hours)   parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  return parts.length ? parts.join(' ') : '<1m'
}

function sortTasks(tasks: Task[], sort: SortState): Task[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0
    switch (sort.column) {
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
      case 'priority':
        cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        break
      case 'assignee':
        cmp = (a.assigneeUsername ?? '').localeCompare(b.assigneeUsername ?? '')
        break
      case 'startDate':
        cmp = (a.startDate ?? '').localeCompare(b.startDate ?? '')
        break
      case 'endDate': {
        // null/open-ended tasks are placed via toggle (handled outside this sort)
        const aDate = a.endDate ?? ''
        const bDate = b.endDate ?? ''
        cmp = aDate.localeCompare(bDate)
        break
      }
      case 'duration':
        cmp = (a.duration ?? '').localeCompare(b.duration ?? '')
        break
      case 'status':
        cmp = a.status.localeCompare(b.status)
        break
    }
    return sort.direction === 'asc' ? cmp : -cmp
  })
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

/** Split into dated / open-ended arrays, preserving sort order. */
function splitByEndDate(tasks: Task[]): { dated: Task[]; openEnded: Task[] } {
  return tasks.reduce<{ dated: Task[]; openEnded: Task[] }>(
    (acc, t) => {
      if (t.endDate) acc.dated.push(t)
      else acc.openEnded.push(t)
      return acc
    },
    { dated: [], openEnded: [] }
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function TaskList() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState<SortState>({ column: 'endDate', direction: 'asc' })
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openEndedFirst, setOpenEndedFirst] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const [taskData, userData] = await Promise.all([getTasks(), getUsers()])
      setTasks(taskData)
      setUsers(userData)
    } catch {
      setError('Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filtered tasks (before ordering by open-ended toggle)
  const filtered = useMemo(() => applyFilters(tasks, filters), [tasks, filters])

  // Sorted tasks
  const sorted = useMemo(() => sortTasks(filtered, sort), [filtered, sort])

  // Apply open-ended split when sorted by due date; otherwise keep order
  const ordered = useMemo(() => {
    if (sort.column !== 'endDate') return sorted
    const { dated, openEnded } = splitByEndDate(sorted)
    return openEndedFirst ? [...openEnded, ...dated] : [...dated, ...openEnded]
  }, [sorted, sort.column, openEndedFirst])

  // Index in `ordered` (dated portion) where today's divider should appear
  const todayDividerIndex = useMemo(() => {
    if (sort.column !== 'endDate') return -1
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startIdx = openEndedFirst ? tasks.filter(t => !t.endDate).length : 0
    for (let i = startIdx; i < ordered.length; i++) {
      const t = ordered[i]
      if (!t.endDate) continue
      if (new Date(t.endDate) >= today) return i
    }
    return -1 // all tasks are overdue; divider at end of dated tasks
  }, [ordered, sort.column, openEndedFirst, tasks])

  function handleSort(col: SortColumn) {
    setSort(prev =>
      prev.column === col
        ? { column: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column: col, direction: 'asc' }
    )
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // ── Render helpers ─────────────────────────────────────────────────────

  function SortHeader({ col, label }: { col: SortColumn; label: string }) {
    const active = sort.column === col
    return (
      <th className={`${styles.th} ${active ? styles.thActive : ''}`}>
        <button className={styles.sortBtn} onClick={() => handleSort(col)} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
          {label}
          <SortIcon active={active} direction={sort.direction} />
        </button>
      </th>
    )
  }

  function renderRows() {
    if (ordered.length === 0) {
      return (
        <tr>
          <td colSpan={8} className={styles.empty}>
            {activeFilterCount > 0 ? 'No tasks match the current filters.' : 'No tasks yet. Click "Add Task" to create one.'}
          </td>
        </tr>
      )
    }

    const rows: React.ReactNode[] = []
    let dividerInserted = false

    ordered.forEach((task, idx) => {
      // Insert "Today" divider between overdue and upcoming tasks
      if (sort.column === 'endDate' && !dividerInserted && idx === todayDividerIndex) {
        dividerInserted = true
        rows.push(
          <tr key="today-divider" className={styles.dividerRow} aria-hidden="true">
            <td colSpan={8}><span className={styles.dividerLabel}>Today</span></td>
          </tr>
        )
      }

      const dueStatus = computeDueStatus(task)
      const color = DUE_STATUS_COLOR_VAR[dueStatus]

      rows.push(
        <tr
          key={task.id}
          className={styles.row}
          style={{ '--status-color': color } as React.CSSProperties}
          onClick={() => navigate(ROUTES.TASK(task.id))}
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') navigate(ROUTES.TASK(task.id)) }}
          aria-label={task.title}
        >
          <td className={styles.tdTitle}>{task.title}</td>
          <td className={styles.td}>
            <PriorityBadge priority={task.priority} />
          </td>
          <td className={styles.td}>
            <TagList tags={task.tags} />
          </td>
          <td className={styles.td}>{task.assigneeUsername ?? '—'}</td>
          <td className={styles.td}>{formatDate(task.startDate)}</td>
          <td className={styles.td}>{formatDate(task.endDate)}</td>
          <td className={styles.td}>{formatDuration(task.duration)}</td>
          <td className={styles.td}>
            <StatusBadge status={task.status} dueStatus={dueStatus} />
          </td>
        </tr>
      )
    })

    return rows
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.heading}>Tasks</span>

        <div className={styles.toolbarRight}>
          <button
            className={`${styles.filterToggle} ${filtersOpen ? styles.filterToggleActive : ''}`}
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
          >
            Filters {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
          </button>

          <button
            className={`${styles.toggleBtn} ${openEndedFirst ? styles.toggleBtnActive : ''}`}
            onClick={() => setOpenEndedFirst(v => !v)}
            title={openEndedFirst ? 'Open-ended tasks shown first' : 'Open-ended tasks shown last'}
          >
            Open-ended: {openEndedFirst ? 'first' : 'last'}
          </button>

          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add Task</Button>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Search</label>
              <input
                className={styles.filterInput}
                type="search"
                placeholder="Title or description…"
                value={filters.text}
                onChange={e => setFilter('text', e.target.value)}
              />
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Assignee</label>
              <select className={styles.filterSelect} value={filters.assigneeId} onChange={e => setFilter('assigneeId', e.target.value)}>
                <option value="">All</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="filter-priority">Priority</label>
              <select id="filter-priority" className={styles.filterSelect} value={filters.priority} onChange={e => setFilter('priority', e.target.value as Filters['priority'])}>
                <option value="">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Tags</label>
              <input
                className={styles.filterInput}
                placeholder="Comma-separated…"
                value={filters.tags}
                onChange={e => setFilter('tags', e.target.value)}
              />
            </div>

            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="filter-completion">Completion</label>
              <select id="filter-completion" className={styles.filterSelect} value={filters.completion} onChange={e => setFilter('completion', e.target.value as Filters['completion'])}>
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

      {/* Table */}
      {loading ? (
        <p className={styles.state}>Loading…</p>
      ) : error ? (
        <p className={styles.stateError}>{error}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <SortHeader col="title"     label="Title" />
                <SortHeader col="priority"  label="Priority" />
                <th className={styles.th}>Tags</th>
                <SortHeader col="assignee"  label="Assignee" />
                <SortHeader col="startDate" label="Start" />
                <SortHeader col="endDate"   label="End" />
                <SortHeader col="duration"  label="Duration" />
                <SortHeader col="status"    label="Status" />
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </div>
      )}

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={load}
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  return (
    <svg className={`${styles.sortIcon} ${active ? styles.sortIconActive : ''}`} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {direction === 'asc' || !active ? <path d="M5 2 L9 8 L1 8 Z" fill="currentColor" opacity={active && direction === 'asc' ? 1 : 0.3} /> : null}
      {direction === 'desc' || !active ? <path d="M5 8 L1 2 L9 2 Z" fill="currentColor" opacity={active && direction === 'desc' ? 1 : 0.3} /> : null}
    </svg>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`${styles.badge} ${styles[`priority${priority}`]}`}>{priority}</span>
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className={styles.none}>—</span>
  return (
    <div className={styles.tags}>
      {tags.slice(0, 3).map(t => <span key={t} className={styles.tag}>{t}</span>)}
      {tags.length > 3 && <span className={styles.tagMore}>+{tags.length - 3}</span>}
    </div>
  )
}

function StatusBadge({ status, dueStatus }: { status: string; dueStatus: DueStatusKey }) {
  if (status === 'Complete') return <span className={`${styles.badge} ${styles.statusComplete}`}>Complete</span>
  return (
    <span
      className={styles.badge}
      style={{ color: DUE_STATUS_COLOR_VAR[dueStatus], borderColor: DUE_STATUS_COLOR_VAR[dueStatus], backgroundColor: 'transparent' }}
    >
      {DUE_STATUS_LABEL[dueStatus]}
    </span>
  )
}
