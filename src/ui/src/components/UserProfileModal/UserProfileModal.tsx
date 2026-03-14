import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { ROUTES } from '../../routeConstants'
import { updateUser, updateAvatar, type AvatarCrop } from '../../services/users'
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
  const { user, loading, avatarVersion, refresh } = useCurrentUser()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form fields when the modal opens.
  // Intentionally NOT re-syncing on every `user` change: a background refresh
  // (e.g. after avatar upload) must not overwrite unsaved edits in the form.
  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setEmail(user.email)
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
      await updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      })
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

  if (loading) return null

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

          {/* Profile form */}
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
