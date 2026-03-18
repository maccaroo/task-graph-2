import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DateTimePicker } from './DateTimePicker'

function renderPicker(value = '', onChange = vi.fn(), defaultTime = '00:00') {
  return { onChange, ...render(<DateTimePicker value={value} onChange={onChange} defaultTime={defaultTime} />) }
}

describe('DateTimePicker', () => {
  it('shows placeholder when no value', () => {
    renderPicker()
    expect(screen.getByRole('button', { name: /select date/i })).toBeInTheDocument()
  })

  it('shows formatted value in trigger', () => {
    renderPicker('2026-03-18T09:30')
    expect(screen.getByRole('button').textContent).toContain('09:30')
  })

  it('picker is closed initially', () => {
    renderPicker()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens popover when trigger is clicked', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button', { name: /select date/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
  })

  it('toggles closed when trigger is clicked again', () => {
    renderPicker()
    const trigger = screen.getByRole('button', { name: /select date/i })
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('time field appears only after a date is entered', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByLabelText(/time/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-18' } })
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument()
  })

  it('confirm button is disabled until a date is selected', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled()
  })

  it('calls onChange with date + defaultTime when time is not entered', () => {
    const { onChange } = renderPicker('', vi.fn(), '00:00')
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-18' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onChange).toHaveBeenCalledWith('2026-03-18T00:00')
  })

  it('calls onChange with date + explicit time when time is entered', () => {
    const { onChange } = renderPicker('', vi.fn(), '00:00')
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-18' } })
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '14:30' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onChange).toHaveBeenCalledWith('2026-03-18T14:30')
  })

  it('uses end defaultTime (23:59) when no time entered', () => {
    const { onChange } = renderPicker('', vi.fn(), '23:59')
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-18' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onChange).toHaveBeenCalledWith('2026-03-18T23:59')
  })

  it('closes popover after confirm', () => {
    renderPicker()
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-18' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show clear button when value is empty', () => {
    renderPicker('')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('shows clear button when a value is set', () => {
    renderPicker('2026-03-18T09:00')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('calls onChange with empty string and closes on clear', () => {
    const { onChange } = renderPicker('2026-03-18T09:00')
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('initialises picker inputs from existing value when opened', () => {
    renderPicker('2026-06-15T14:30')
    fireEvent.click(screen.getByRole('button'))
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe('2026-06-15')
    expect((screen.getByLabelText(/time/i) as HTMLInputElement).value).toBe('14:30')
  })
})
