import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Statusbar } from '../components/Statusbar/Statusbar'
import { UserProfileModal } from '../components/UserProfileModal/UserProfileModal'
import { CurrentUserProvider } from '../contexts/CurrentUserContext'
import styles from './AppShell.module.css'

export function AppShell() {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <CurrentUserProvider>
      <div className={styles.shell}>
        <Statusbar onOpenProfile={() => setProfileOpen(true)} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </CurrentUserProvider>
  )
}
