import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotifications } from '../../hooks/useNotifications'
import { ROUTES } from '../../routeConstants'
import { NotificationList } from '../NotificationList/NotificationList'
import styles from './Statusbar.module.css'

interface StatusbarProps {
  onOpenProfile?: () => void
}

export function Statusbar({ onOpenProfile }: StatusbarProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { user } = useCurrentUser()
  const { notifications, unreadCount, refresh, setNotifications } = useNotifications()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleLogout() {
    setUserMenuOpen(false)
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  function handleOpenProfile() {
    setUserMenuOpen(false)
    onOpenProfile?.()
  }

  function handleNotifClick() {
    if (!notifOpen) refresh()
    setNotifOpen(v => !v)
    setUserMenuOpen(false)
  }

  return (
    <header className={styles.statusbar} role="banner">
      <div className={styles.left}>
        <span className={styles.appName}>TaskGraph</span>
      </div>

      <div className={styles.right}>
        {/* Notifications */}
        <div className={styles.popoverRoot} ref={notifRef}>
          <button
            className={styles.iconBtn}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            onClick={handleNotifClick}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className={styles.badge} aria-label={`${unreadCount} unread`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationList
              notifications={notifications}
              onClose={() => setNotifOpen(false)}
              onNotificationsChange={setNotifications}
            />
          )}
        </div>

        {/* User */}
        <div className={styles.popoverRoot} ref={userMenuRef}>
          <button
            className={styles.userBtn}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            onClick={() => {
              setUserMenuOpen(v => !v)
              setNotifOpen(false)
            }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {user ? initials(user.firstName, user.lastName) : '?'}
              </span>
            )}
            <span className={styles.userName}>
              {user ? `${user.firstName} ${user.lastName}` : '…'}
            </span>
          </button>

          {userMenuOpen && (
            <div className={styles.dropdown} role="menu">
              <button className={styles.dropdownItem} role="menuitem" onClick={handleOpenProfile}>
                Open user profile
              </button>
              <button className={styles.dropdownItem} role="menuitem" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
