import { type ReactNode } from 'react'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  title: string
  children: ReactNode
}

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg className={styles.logoIcon} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="var(--color-primary)" opacity="0.15" />
            <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" stroke="var(--color-primary)" strokeWidth="2" fill="none" />
            <circle cx="16" cy="12" r="2.5" fill="var(--color-primary)" />
            <circle cx="10" cy="20" r="2.5" fill="var(--color-primary)" />
            <circle cx="22" cy="20" r="2.5" fill="var(--color-primary)" />
            <line x1="16" y1="12" x2="10" y2="20" stroke="var(--color-primary)" strokeWidth="1.5" />
            <line x1="16" y1="12" x2="22" y2="20" stroke="var(--color-primary)" strokeWidth="1.5" />
          </svg>
          <span className={styles.logoText}>TaskGraph</span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </div>
  )
}
