import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { ROUTES } from '../../routeConstants'
import { updateUser, updateAvatar, updateUserConfiguration, type AvatarCrop, type UserConfiguration } from '../../services/users'
import { AvatarCropPicker } from './AvatarCropPicker'
import styles from './UserProfileModal.module.css'

const NAME_RE = /^[a-zA-Z0-9\-_ ']+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BYTES = 10 * 1024 * 1024

interface UserProfileModalProps {
  open: boolean
  onClose: () => void
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { user, avatarVersion, refresh } = useCurrentUser()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [defaultTasksView, setDefaultTasksView] = useState<UserConfiguration['defaultTasksView']>('Graph')
  const [timeAxisDirection, setTimeAxisDirection] = useState<UserConfiguration['timeAxisDirection']>('Horizontal')
  const [timeAxisPosition, setTimeAxisPosition] = useState<UserConfiguration['timeAxisPosition']>('Top')
  const [autoSaveDelaySeconds, setAutoSaveDelaySeconds] = useState(2)

  // Populate form fields when the modal opens.
  // Intentionally NOT re-syncing on every `user` change: a background refresh
  // (e.g. after avatar upload) must not overwrite unsaved edits in the form.
  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setEmail(user.email)
      setDefaultTasksView(user.configuration.defaultTasksView)
      setTimeAxisDirection(user.configuration.timeAxisDirection)
      setTimeAxisPosition(user.configuration.timeAxisPosition)
      setAutoSaveDelaySeconds(user.configuration.autoSaveDelaySeconds)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reset transient state whenever modal closes
  useEffect(() => {
    if (!open) {
      setPendingFile(null)
      setAvatarError('')
      setSaveError('')
    }
  }, [open])

  // Immediately persist and apply a config change (direction/position) without waiting for Save.
  async function applyConfigChange(patch: Partial<{
    timeAxisDirection: UserConfiguration['timeAxisDirection']
    timeAxisPosition: UserConfiguration['timeAxisPosition']
  }>) {
    if (!userId) return
    await updateUserConfiguration(userId, {
      defaultTasksView,
      timeAxisDirection,
      timeAxisPosition,
      autoSaveDelaySeconds,
      ...patch,
    })
    await refresh()
  }

  async function handleDirectionChange(newDirection: UserConfiguration['timeAxisDirection']) {
    // Reset position to a valid value for the new direction
    const newPosition = newDirection === 'Horizontal'
      ? (timeAxisPosition === 'Left' || timeAxisPosition === 'Right' ? 'Top' : timeAxisPosition)
      : (timeAxisPosition === 'Top' || timeAxisPosition === 'Bottom' ? 'Left' : timeAxisPosition)
    setTimeAxisDirection(newDirection)
    setTimeAxisPosition(newPosition)
    await applyConfigChange({ timeAxisDirection: newDirection, timeAxisPosition: newPosition })
  }

  async function handlePositionChange(newPosition: UserConfiguration['timeAxisPosition']) {
    setTimeAxisPosition(newPosition)
    await applyConfigChange({ timeAxisPosition: newPosition })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) {
      setAvatarError('File must be 10 MB or smaller.')
      return
    }
    setAvatarError('')
    setPendingFile(file)
  }

  async function handleAvatarConfirm(crop: AvatarCrop | null) {
    if (!pendingFile || !userId) return
    setUploading(true)
    setAvatarError('')
    try {
      await updateAvatar(userId, pendingFile, crop ?? undefined)
      setPendingFile(null)
      await refresh()
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed.')
      setPendingFile(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaveError('')

    if (!firstName.trim()) { setSaveError('First name is required.'); return }
    if (!NAME_RE.test(firstName.trim())) { setSaveError('First name contains invalid characters.'); return }
    if (!lastName.trim()) { setSaveError('Last name is required.'); return }
    if (!NAME_RE.test(lastName.trim())) { setSaveError('Last name contains invalid characters.'); return }
    if (!email.trim()) { setSaveError('Email is required.'); return }
    if (!EMAIL_RE.test(email.trim())) { setSaveError('Enter a valid email address.'); return }

    if (!userId) return
    setSaving(true)
    try {
      await Promise.all([
        updateUser(userId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        }),
        updateUserConfiguration(userId, {
          defaultTasksView,
          timeAxisDirection,
          timeAxisPosition,
          autoSaveDelaySeconds,
        }),
      ])
      await refresh()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetPassword() {
    onClose()
    navigate(ROUTES.PASSWORD_RESET_REQUEST)
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} title="User Profile" width="520px">
      {pendingFile ? (
        <AvatarCropPicker
          file={pendingFile}
          uploading={uploading}
          onConfirm={handleAvatarConfirm}
          onCancel={() => setPendingFile(null)}
        />
      ) : (
        <div className={styles.content}>
          {/* Avatar */}
          <div className={styles.avatarSection}>
            <button
              className={styles.avatarBtn}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change avatar"
              title="Click to change avatar"
              type="button"
            >
              {user?.avatarUrl ? (
                <img src={`${user.avatarUrl}?v=${avatarVersion}`} alt="Avatar" className={styles.avatar} />
              ) : (
                <span className={styles.avatarFallback} aria-hidden="true">
                  {user
                    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
                    : '?'}
                </span>
              )}
              <span className={styles.avatarOverlay}>Change</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleFileChange}
              aria-label="Upload avatar"
            />
            {avatarError && (
              <p className={styles.errorSmall} role="alert">{avatarError}</p>
            )}
          </div>

          <form onSubmit={handleSave} className={styles.form} noValidate>
            {saveError && <p className={styles.formError} role="alert">{saveError}</p>}

            <Input
              label="Username"
              value={user?.username ?? ''}
              readOnly
              hint="Username cannot be changed"
            />

            <div className={styles.row}>
              <Input
                label="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />

            <hr className={styles.divider} />
            <p className={styles.sectionTitle}>Settings</p>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Default tasks view</span>
              <div className={styles.radioGroup}>
                {(['Graph', 'List'] as const).map(v => (
                  <label key={v} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="defaultTasksView"
                      value={v}
                      checked={defaultTasksView === v}
                      onChange={() => setDefaultTasksView(v)}
                    />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.subGroup}>
              <span className={styles.subGroupTitle}>Time Axis</span>

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Direction</span>
                <div className={styles.radioGroup}>
                  {(['Horizontal', 'Vertical'] as const).map(v => (
                    <label key={v} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="timeAxisDirection"
                        value={v}
                        checked={timeAxisDirection === v}
                        onChange={() => handleDirectionChange(v)}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Position</span>
                <div className={styles.radioGroup}>
                  {(['Top', 'Bottom', 'Left', 'Right'] as const).map(v => {
                    const disabled =
                      (timeAxisDirection === 'Horizontal' && (v === 'Left' || v === 'Right')) ||
                      (timeAxisDirection === 'Vertical' && (v === 'Top' || v === 'Bottom'))
                    return (
                      <label key={v} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="timeAxisPosition"
                          value={v}
                          checked={timeAxisPosition === v}
                          onChange={() => handlePositionChange(v)}
                          disabled={disabled}
                        />
                        <span>{v}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Auto-save delay: {autoSaveDelaySeconds}s</span>
              <div className={styles.sliderRow}>
                <span className={styles.sliderValue}>0</span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={10}
                  step={1}
                  value={autoSaveDelaySeconds}
                  onChange={e => setAutoSaveDelaySeconds(Number(e.target.value))}
                  aria-label="Auto-save delay in seconds"
                />
                <span className={styles.sliderValue}>10</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={handleResetPassword}>
                Reset password
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  )
}
