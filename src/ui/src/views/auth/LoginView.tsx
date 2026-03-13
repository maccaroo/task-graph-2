import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../routeConstants'
import { login, decodeUserId } from '../../services/auth'
import { AuthLayout } from './AuthLayout'
import styles from './LoginView.module.css'

export function LoginView() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!username.trim()) { setError('Username is required.'); return }
    if (!password) { setError('Password is required.'); return }

    setLoading(true)
    try {
      const { token } = await login({ username: username.trim(), password })
      authLogin(token, decodeUserId(token))
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <Input
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className={styles.links}>
        <Link to={ROUTES.REGISTER}>Create account</Link>
        <Link to={ROUTES.PASSWORD_RESET_REQUEST}>Forgot password?</Link>
      </div>
    </AuthLayout>
  )
}
