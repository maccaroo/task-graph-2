import { useId, useState } from 'react'
import styles from './DateTimePicker.module.css'

interface DateTimePickerProps {
  value: string              // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  defaultTime?: string       // applied when no time is entered; "00:00" for start, "23:59" for end
  className?: string
}

function formatDisplay(value: string): string {
  if (!value) return ''
  const sep = value.indexOf('T')
  const datePart = sep >= 0 ? value.slice(0, sep) : value
  const timePart = sep >= 0 ? value.slice(sep + 1, sep + 6) : ''
  // Parse at noon to avoid local-timezone date-shifting
  const date = new Date(`${datePart}T12:00:00`)
  if (isNaN(date.getTime())) return value
  const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  return timePart ? `${dateStr} · ${timePart}` : dateStr
}

function splitValue(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const sep = value.indexOf('T')
  return {
    date: sep >= 0 ? value.slice(0, sep) : value,
    time: sep >= 0 ? value.slice(sep + 1, sep + 6) : '',
  }
}

export function DateTimePicker({ value, onChange, defaultTime = '00:00', className }: DateTimePickerProps) {
  const uid = useId()
  const dateId = `${uid}-date`
  const timeId = `${uid}-time`
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  function handleOpen() {
    const parts = splitValue(value)
    setDate(parts.date)
    setTime(parts.time)
    setOpen(true)
  }

  function handleToggle() {
    if (open) {
      setOpen(false)
    } else {
      handleOpen()
    }
  }

  function handleConfirm() {
    onChange(date ? `${date}T${time || defaultTime}` : '')
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setOpen(false)
  }

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <button
        type="button"
        className={`${styles.trigger} ${!value ? styles.triggerEmpty : ''}`}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={styles.triggerText}>{value ? formatDisplay(value) : 'Select date…'}</span>
        <span className={styles.caret} aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Date picker">
          <div className={styles.field}>
            <label htmlFor={dateId} className={styles.label}>Date</label>
            <input
              id={dateId}
              type="date"
              className={styles.input}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {date && (
            <div className={styles.field}>
              <label htmlFor={timeId} className={styles.label}>
                Time <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id={timeId}
                type="time"
                className={styles.input}
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          )}

          <div className={styles.actions}>
            {value && (
              <button type="button" className={styles.clearBtn} onClick={handleClear}>
                Clear
              </button>
            )}
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={!date}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
