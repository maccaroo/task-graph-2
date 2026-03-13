import { type FormEvent, useEffect, useState } from 'react'
import { Button, Input, Modal } from '../ui'
import { type UserSummary, getUsers } from '../../services/users'
import { createTask, type CreateTaskData, type TaskPriority, type TimingType } from '../../services/tasks'
import styles from './AddTaskModal.module.css'

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddTaskModal({ open, onClose, onCreated }: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [tags, setTags] = useState('')
  const [startType, setStartType] = useState<TimingType>('None')
  const [startDate, setStartDate] = useState('')
  const [endType, setEndType] = useState<TimingType>('None')
  const [endDate, setEndDate] = useState('')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      getUsers().then(setUsers).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setPriority('Medium')
      setAssigneeId('')
      setTags('')
      setStartType('None')
      setStartDate('')
      setEndType('None')
      setEndDate('')
      setError('')
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }

    const data: CreateTaskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeId: assigneeId || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      startType,
      startDate: startType !== 'None' && startDate ? startDate : undefined,
      endType,
      endDate: endType !== 'None' && endDate ? endDate : undefined,
    }

    setSaving(true)
    setError('')
    try {
      await createTask(data)
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Task" width="480px">
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <p className={styles.error} role="alert">{error}</p>}

        <Input
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          required
        />

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Priority</label>
            <select className={styles.select} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Assignee</label>
            <select className={styles.select} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">— None —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Tags (comma-separated)"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="e.g. frontend, urgent"
        />

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Start</label>
            <select className={styles.select} value={startType} onChange={e => setStartType(e.target.value as TimingType)}>
              <option value="None">None</option>
              <option value="Fixed">Fixed</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>
          {startType !== 'None' && (
            <div className={styles.field}>
              <label className={styles.label}>Start date</label>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>End</label>
            <select className={styles.select} value={endType} onChange={e => setEndType(e.target.value as TimingType)}>
              <option value="None">None</option>
              <option value="Fixed">Fixed</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>
          {endType !== 'None' && (
            <div className={styles.field}>
              <label className={styles.label}>End date</label>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create task'}</Button>
        </div>
      </form>
    </Modal>
  )
}
