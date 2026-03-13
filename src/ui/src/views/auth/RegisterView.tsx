import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../routeConstants'
import { register, decodeUserId } from '../../services/auth'
import { AuthLayout } from './AuthLayout'
import styles from './RegisterView.module.css'

// Valid name chars: alpha, numbers, dashes, underscores, spaces, apostrophes
const NAME_RE = /^[a-zA-Z0-9\-_ ']+$/
// Valid username chars: alpha, numbers, dashes, underscores
const USERNAME_RE = /^[a-zA-Z0-9\-_]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(fields: {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
}): string {
  if (!fields.firstName.trim()) return 'First name is required.'
  if (!NAME_RE.test(fields.firstName.trim())) return 'First name contains invalid characters.'
  if (!fields.lastName.trim()) return 'Last name is required.'
  if (!NAME_RE.test(fields.lastName.trim())) return 'Last name contains invalid characters.'
  if (!fields.username.trim()) return 'Username is required.'
  if (!USERNAME_RE.test(fields.username.trim())) return 'Username may only contain letters, numbers, dashes, and underscores.'
  if (!fields.email.trim()) return 'Email is required.'
  if (!EMAIL_RE.test(fields.email.trim())) return 'Enter a valid email address.'
  if (!fields.password) return 'Password is required.'
  if (fields.password.length < 8) return 'Password must be at least 8 characters.'
  return ''
}

export function RegisterView() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const validationError = validate({ firstName, lastName, username, email, password })
    if (validationError) { setError(validationError); return }

    setLoading(true)
    try {
      const { token } = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      })
      authLogin(token, decodeUserId(token))
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create account">
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <p className={styles.formError} role="alert">{error}</p>}

        <div className={styles.row}>
          <Input
            label="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            autoComplete="given-name"
            autoFocus
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          hint="Letters, numbers, dashes, and underscores only"
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          hint="Minimum 8 characters"
        />

        <Button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div className={styles.links}>
        <span>Already have an account?</span>
        <Link to={ROUTES.LOGIN}>Sign in</Link>
      </div>
    </AuthLayout>
  )
}
