import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ROUTES } from '../routeConstants'
import { Statusbar } from '../components/Statusbar/Statusbar'
import { UserProfileModal } from '../components/UserProfileModal/UserProfileModal'
import { CurrentUserProvider } from '../contexts/CurrentUserContext'
import { useCurrentUser } from '../hooks/useCurrentUser'
import styles from './AppShell.module.css'

export type TasksView = 'graph' | 'list'

export interface AppShellOutletContext {
  activeView: TasksView
  setActiveView: (view: TasksView) => void
  selectTaskId: string | null
  clearSelectTaskId: () => void
}

export function AppShell() {
  return (
    <CurrentUserProvider>
      <AppShellContent />
    </CurrentUserProvider>
  )
}

function AppShellContent() {
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectTaskId, setSelectTaskId] = useState<string | null>(null)
  // null = user hasn't manually changed the view; fall back to their saved default
  const [viewOverride, setViewOverride] = useState<TasksView | null>(null)

  // Snapshot the default view on first load so that saving a new defaultTasksView
  // in settings does not immediately change the view mid-session — it takes effect
  // on the next page load, which matches the expected behaviour.
  const [sessionDefault, setSessionDefault] = useState<TasksView | null>(null)
  useEffect(() => {
    if (user && sessionDefault === null) {
      setSessionDefault(user.configuration.defaultTasksView === 'List' ? 'list' : 'graph')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])
  const activeView: TasksView = viewOverride ?? sessionDefault ?? 'graph'

  function handleNotificationTaskSelect(taskId: string) {
    setSelectTaskId(taskId)
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <div className={styles.shell}>
      <Statusbar
        onOpenProfile={() => setProfileOpen(true)}
        activeView={activeView}
        onViewChange={(view) => { setViewOverride(view); navigate(ROUTES.DASHBOARD) }}
        onHome={() => setViewOverride(null)}
        onNotificationTaskSelect={handleNotificationTaskSelect}
      />
      <main className={styles.main}>
        <Outlet context={{
          activeView,
          setActiveView: setViewOverride,
          selectTaskId,
          clearSelectTaskId: () => setSelectTaskId(null),
        } satisfies AppShellOutletContext} />
      </main>
      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
