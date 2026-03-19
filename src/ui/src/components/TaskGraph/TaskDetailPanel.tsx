import { useEffect, useRef, useState } from 'react'
import {
  addPredecessor,
  deleteTask,
  removePredecessor,
  updateTask,
  type CreateTaskData,
  type Task,
  type TaskStatus,
  type TimingType,
} from '../../services/tasks'
import { type UserSummary } from '../../services/users'
import { DateTimePicker } from '../ui'
import styles from './TaskDetailPanel.module.css'

interface TaskDetailPanelProps {
  task: Task | null
  tasks: Task[]
  users: UserSummary[]
  onClose: () => void
  onUpdated: () => void
  onDeleted: (id: string) => void
  onSelectTask: (id: string) => void
  onTaskSaved?: (taskId: string, before: CreateTaskData, after: CreateTaskData) => void
  autoSaveDelayMs?: number
}

function toDatetimeLocal(iso: string): string {
  return iso.substring(0, 16)
}

export function TaskDetailPanel({
  task,
  tasks,
  users,
  onClose,
  onUpdated,
  onDeleted,
  onSelectTask,
  onTaskSaved,
  autoSaveDelayMs = 2000,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState<TaskStatus>('Incomplete')
  const [startType, setStartType] = useState<TimingType>('None')
  const [startDate, setStartDate] = useState('')
  const [endType, setEndType] = useState<TimingType>('None')
  const [endDate, setEndDate] = useState('')
  const [duration, setDuration] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [addPredId, setAddPredId] = useState('')
  const [relError, setRelError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a stable ref to the current task id for use inside async callbacks
  const taskIdRef = useRef<string | null>(null)
  // Tracks the last persisted state so each save can record an accurate before/after diff
  const lastSavedRef = useRef<CreateTaskData | null>(null)

  // Sync form state only when the selected task changes (not on re-render after save)
  useEffect(() => {
    if (!task) return
    taskIdRef.current = task.id
    setTitle(task.title)
    setDescription(task.description ?? '')
    setAssigneeId(task.assigneeId ?? '')
    setStatus(task.status)
    setStartType(task.startType)
    setStartDate(task.startDate ? toDatetimeLocal(task.startDate) : '')
    setEndType(task.endType)
    setEndDate(task.endDate ? toDatetimeLocal(task.endDate) : '')
    setDuration(task.duration ?? '')
    setDirty(false)
    setSaveError('')
    setRelError('')
    setAddPredId('')
    setConfirmDelete(false)
    setDeleteError('')
    lastSavedRef.current = {
      title: task.title,
      description: task.description ?? undefined,
      assigneeId: task.assigneeId ?? undefined,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      startType: task.startType,
      startDate: task.startDate ?? undefined,
      endType: task.endType,
      endDate: task.endDate ?? undefined,
      duration: task.duration ?? undefined,
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save debounce — fires whenever any field or dirty flag changes
  useEffect(() => {
    if (!dirty || !task) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void save() }, autoSaveDelayMs)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, description, assigneeId, status, startType, startDate, endType, endDate, duration])

  function markDirty() { setDirty(true) }

  async function save() {
    const id = taskIdRef.current
    if (!id || !title.trim()) return
    setSaving(true)
    setSaveError('')
    const after: CreateTaskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId: assigneeId || undefined,
      status,
      // priority and tags are not editable in this panel — read from current task
      priority: task!.priority,
      tags: task!.tags,
      startType,
      startDate: startType !== 'None' && startDate ? startDate : undefined,
      endType,
      endDate: endType !== 'None' && endDate ? endDate : undefined,
      duration: duration.trim() || undefined,
    }
    try {
      await updateTask(id, after)
      const before = lastSavedRef.current
      lastSavedRef.current = after
      if (before) onTaskSaved?.(id, before, after)
      setDirty(false)
      onUpdated()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemovePredecessor(predId: string) {
    if (!task) return
    setRelError('')
    try {
      await removePredecessor(task.id, predId)
      onUpdated()
    } catch (err) {
      setRelError(err instanceof Error ? err.message : 'Failed to remove predecessor.')
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleteError('')
    try {
      await deleteTask(task.id)
      onDeleted(task.id)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete task.')
      setConfirmDelete(false)
    }
  }

  async function handleAddPredecessor() {
    if (!task || !addPredId) return
    setRelError('')
    try {
      await addPredecessor(task.id, addPredId)
      setAddPredId('')
      onUpdated()
    } catch (err) {
      setRelError(err instanceof Error ? err.message : 'Failed to add predecessor.')
    }
  }

  if (!task) return null

  const durationLocked = startType === 'Fixed' && endType === 'Fixed'

  const availableForPredecessor = tasks.filter(t =>
    t.id !== task.id &&
    !task.predecessorIds.includes(t.id) &&
    !task.successorIds.includes(t.id),
  )

  return (
    <div className={styles.panel} data-testid="task-detail-panel" onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Task Detail</h3>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close detail panel">✕</button>
      </div>

      <div className={styles.body}>
        {/* Title */}
        <div className={styles.field}>
          <label className={styles.label}>Title <span className={styles.required}>*</span></label>
          <input
            className={styles.input}
            value={title}
            onChange={e => { setTitle(e.target.value); markDirty() }}
            required
            data-testid="task-title-input"
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={e => { setDescription(e.target.value); markDirty() }}
            rows={3}
          />
        </div>

        {/* Assignee */}
        <div className={styles.field}>
          <label className={styles.label}>Assignee</label>
          <select
            className={styles.select}
            value={assigneeId}
            onChange={e => { setAssigneeId(e.target.value); markDirty() }}
          >
            <option value="">— None —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.username})</option>
            ))}
          </select>
        </div>

        {/* Completion status */}
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={status === 'Complete'}
              onChange={e => { setStatus(e.target.checked ? 'Complete' : 'Incomplete'); markDirty() }}
            />
            <span>Complete</span>
          </label>
        </div>

        {/* Timing */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Timing</h4>

          <div className={styles.field}>
            <label className={styles.label}>Start</label>
            <div className={styles.row}>
              <select
                className={styles.selectInline}
                value={startType}
                onChange={e => { setStartType(e.target.value as TimingType); markDirty() }}
              >
                <option value="None">None</option>
                <option value="Fixed">Fixed</option>
                <option value="Flexible">Flexible</option>
              </select>
              {startType !== 'None' && (
                <DateTimePicker
                  value={startDate}
                  onChange={v => { setStartDate(v); markDirty() }}
                  defaultTime="00:00"
                  className={styles.datePicker}
                />
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End</label>
            <div className={styles.row}>
              <select
                className={styles.selectInline}
                value={endType}
                onChange={e => { setEndType(e.target.value as TimingType); markDirty() }}
              >
                <option value="None">None</option>
                <option value="Fixed">Fixed</option>
                <option value="Flexible">Flexible</option>
              </select>
              {endType !== 'None' && (
                <DateTimePicker
                  value={endDate}
                  onChange={v => { setEndDate(v); markDirty() }}
                  defaultTime="23:59"
                  className={styles.datePicker}
                />
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Duration {durationLocked && <span className={styles.lockedHint}>(locked)</span>}
            </label>
            <input
              className={styles.input}
              value={duration}
              onChange={e => { setDuration(e.target.value); markDirty() }}
              disabled={durationLocked}
              placeholder="hh:mm:ss"
            />
          </div>
        </div>

        {/* Predecessors */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Predecessors ({task.predecessors.length})</h4>

          {task.predecessors.length > 0 && (
            <ul className={styles.relList}>
              {task.predecessors.map(rel => {
                const relTask = tasks.find(t => t.id === rel.relatedTaskId)
                return (
                  <li key={rel.relatedTaskId} className={styles.relItem}>
                    <button
                      className={styles.relLink}
                      onClick={() => onSelectTask(rel.relatedTaskId)}
                      title={rel.type}
                    >
                      {relTask?.title ?? rel.relatedTaskId}
                    </button>
                    <span className={styles.relType}>{rel.type}</span>
                    <button
                      className={styles.relRemove}
                      onClick={() => handleRemovePredecessor(rel.relatedTaskId)}
                      aria-label={`Remove ${relTask?.title ?? rel.relatedTaskId} as predecessor`}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {availableForPredecessor.length > 0 && (
            <div className={styles.addRelRow}>
              <select
                className={styles.selectInline}
                value={addPredId}
                onChange={e => setAddPredId(e.target.value)}
              >
                <option value="">— Add predecessor —</option>
                {availableForPredecessor.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <button
                className={styles.addBtn}
                onClick={handleAddPredecessor}
                disabled={!addPredId}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Successors */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Successors ({task.successors.length})</h4>

          {task.successors.length > 0 && (
            <ul className={styles.relList}>
              {task.successors.map(rel => {
                const relTask = tasks.find(t => t.id === rel.relatedTaskId)
                return (
                  <li key={rel.relatedTaskId} className={styles.relItem}>
                    <button
                      className={styles.relLink}
                      onClick={() => onSelectTask(rel.relatedTaskId)}
                    >
                      {relTask?.title ?? rel.relatedTaskId}
                    </button>
                    <span className={styles.relType}>{rel.type}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {relError && <p className={styles.error} role="alert">{relError}</p>}
        {saveError && <p className={styles.error} role="alert">{saveError}</p>}
        {deleteError && <p className={styles.error} role="alert">{deleteError}</p>}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {!confirmDelete ? (
            <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              <span className={styles.deleteConfirmLabel}>Are you sure?</span>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete}>Yes</button>
              <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          )}
        </div>
        <div className={styles.footerRight}>
          {saving
            ? <span className={styles.statusSaving}>Saving…</span>
            : dirty
              ? <span className={styles.statusUnsaved}>Unsaved changes</span>
              : <span className={styles.statusSaved}>Saved</span>
          }
        </div>
      </div>
    </div>
  )
}
