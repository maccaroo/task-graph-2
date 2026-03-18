import { NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '../../routeConstants'
import styles from './DocsLayout.module.css'

const TABS = [
  { to: ROUTES.DOCS_ABOUT, label: 'About' },
  { to: ROUTES.DOCS_FAQ,   label: 'FAQ' },
  { to: ROUTES.DOCS_GUIDE, label: 'User Guide' },
]

export function DocsLayout() {
  return (
    <div className={styles.root}>
      <nav className={styles.subnav} aria-label="Documentation sections">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}
