import { Outlet } from 'react-router-dom'
import { Statusbar } from '../components/Statusbar/Statusbar'
import styles from './AppShell.module.css'

export function AppShell() {
  // P10 will replace this noop with the UserProfileModal
  function handleOpenProfile() {}

  return (
    <div className={styles.shell}>
      <Statusbar onOpenProfile={handleOpenProfile} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
