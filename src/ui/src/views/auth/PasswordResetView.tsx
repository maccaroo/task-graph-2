import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input } from '../../components/ui'
import { ROUTES } from '../../routeConstants'
import { resetPassword } from '../../services/auth'
import { AuthLayout } from './AuthLayout'
import styles from './PasswordResetView.module.css'

export function PasswordResetView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Show an invalid-link message if there's no token in the URL
  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className={styles.description}>
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <div className={styles.links}>
          <Link to={ROUTES.PASSWORD_RESET_REQUEST}>Request a new link</Link>
        </div>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!newPassword) { setError('Password is required.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      await resetPassword(token, newPassword)
      navigate(ROUTES.LOGIN, { replace: true, state: { passwordReset: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Set new password">
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          autoComplete="new-password"
          hint="Minimum 8 characters"
          autoFocus
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
      <div className={styles.links}>
        <Link to={ROUTES.LOGIN}>Back to sign in</Link>
      </div>
    </AuthLayout>
  )
}
