import { useCallback, useEffect, useMemo, useState } from 'react'
import { getUsers, type UserSummary } from '../../services/users'
import styles from './UserManagementView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

type SortColumn = 'name' | 'username' | 'incompleteTasks' | 'completeTasks' | 'totalTasks'
type SortDirection = 'asc' | 'desc'

// ── Component ──────────────────────────────────────────────────────────────

export function UserManagementView() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortCol, setSortCol] = useState<SortColumn>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const load = useCallback(async () => {
    setError('')
    try {
      setUsers(await getUsers())
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'name':
          cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          break
        case 'username':
          cmp = a.username.localeCompare(b.username)
          break
        case 'incompleteTasks':
          cmp = (a.taskCounts?.incomplete ?? 0) - (b.taskCounts?.incomplete ?? 0)
          break
        case 'completeTasks':
          cmp = (a.taskCounts?.complete ?? 0) - (b.taskCounts?.complete ?? 0)
          break
        case 'totalTasks':
          cmp = (a.taskCounts?.total ?? 0) - (b.taskCounts?.total ?? 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [users, sortCol, sortDir])

  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  function SortHeader({ col, label, numeric }: { col: SortColumn; label: string; numeric?: boolean }) {
    const active = sortCol === col
    return (
      <th className={`${styles.th} ${active ? styles.thActive : ''} ${numeric ? styles.thNumeric : ''}`}>
        <button
          className={styles.sortBtn}
          onClick={() => handleSort(col)}
          aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          {label}
          <SortIcon active={active} direction={sortDir} />
        </button>
      </th>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.heading}>Users</span>
      </div>

      {loading ? (
        <p className={styles.state}>Loading…</p>
      ) : error ? (
        <p className={styles.stateError}>{error}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} aria-label="Avatar" />
                <SortHeader col="name"            label="Name" />
                <SortHeader col="username"        label="Username" />
                <SortHeader col="incompleteTasks" label="Incomplete" numeric />
                <SortHeader col="completeTasks"   label="Complete"   numeric />
                <SortHeader col="totalTasks"      label="Total"      numeric />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>No users found.</td>
                </tr>
              ) : sorted.map(user => (
                <tr key={user.id} className={styles.row}>
                  <td className={styles.tdAvatar}>
                    <Avatar user={user} />
                  </td>
                  <td className={styles.tdName}>{user.firstName} {user.lastName}</td>
                  <td className={styles.td}>{user.username}</td>
                  <td className={`${styles.td} ${styles.tdNumeric}`}>{user.taskCounts?.incomplete ?? 0}</td>
                  <td className={`${styles.td} ${styles.tdNumeric}`}>{user.taskCounts?.complete ?? 0}</td>
                  <td className={`${styles.td} ${styles.tdNumeric}`}>{user.taskCounts?.total ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ user }: { user: UserSummary }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} className={styles.avatar} />
  }
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  return <span className={styles.avatarFallback} aria-hidden="true">{initials}</span>
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <svg className={`${styles.sortIcon} ${active ? styles.sortIconActive : ''}`} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {(!active || direction === 'asc')  && <path d="M5 2 L9 8 L1 8 Z" fill="currentColor" opacity={active && direction === 'asc'  ? 1 : 0.3} />}
      {(!active || direction === 'desc') && <path d="M5 8 L1 2 L9 2 Z" fill="currentColor" opacity={active && direction === 'desc' ? 1 : 0.3} />}
    </svg>
  )
}
