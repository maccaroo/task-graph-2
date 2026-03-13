import { type HTMLAttributes, type ReactNode } from 'react'
import styles from './Panel.module.css'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Panel({ children, padding = 'md', className, ...props }: PanelProps) {
  return (
    <div
      className={[styles.panel, styles[`padding-${padding}`], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
