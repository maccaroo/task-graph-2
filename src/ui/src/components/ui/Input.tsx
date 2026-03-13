import { type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leading?: ReactNode
}

export function Input({ label, error, hint, leading, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <div className={[styles.inputWrapper, error ? styles.hasError : ''].filter(Boolean).join(' ')}>
        {leading && <span className={styles.leading}>{leading}</span>}
        <input
          id={inputId}
          className={[styles.input, leading ? styles.withLeading : '', className].filter(Boolean).join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error && <span id={`${inputId}-error`} className={styles.error} role="alert">{error}</span>}
      {!error && hint && <span id={`${inputId}-hint`} className={styles.hint}>{hint}</span>}
    </div>
  )
}
