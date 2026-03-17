import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Statusbar } from '../components/Statusbar/Statusbar'
import { UserProfileModal } from '../components/UserProfileModal/UserProfileModal'
import { CurrentUserProvider } from '../contexts/CurrentUserContext'
import styles from './AppShell.module.css'

export type TasksView = 'graph' | 'list'

export interface AppShellOutletContext {
  activeView: TasksView
  setActiveView: (view: TasksView) => void
}

export function AppShell() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeView, setActiveView] = useState<TasksView>('graph')

  return (
    <CurrentUserProvider>
      <div className={styles.shell}>
        <Statusbar
          onOpenProfile={() => setProfileOpen(true)}
          activeView={activeView}
          onViewChange={setActiveView}
          onHome={() => setActiveView('graph')}
        />
        <main className={styles.main}>
          <Outlet context={{ activeView, setActiveView } satisfies AppShellOutletContext} />
        </main>
      </div>
      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </CurrentUserProvider>
  )
}
