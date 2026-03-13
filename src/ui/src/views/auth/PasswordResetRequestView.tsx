import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input } from '../../components/ui'
import { ROUTES } from '../../routeConstants'
import { requestPasswordReset } from '../../services/auth'
import { AuthLayout } from './AuthLayout'
import styles from './PasswordResetRequestView.module.css'

export function PasswordResetRequestView() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Email is required.'); return }

    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Check your email">
        <p className={styles.successMessage}>
          If an account with that email exists, a password reset link has been sent. Check your inbox.
        </p>
        <div className={styles.links}>
          <Link to={ROUTES.LOGIN}>Back to sign in</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset password">
      <p className={styles.description}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />
        <Button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <div className={styles.links}>
        <Link to={ROUTES.LOGIN}>Back to sign in</Link>
      </div>
    </AuthLayout>
  )
}
