import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommandHistory } from './useCommandHistory'
import type { ICommand } from '../lib/commands/types'

function makeCmd(label = ''): ICommand & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    undo: vi.fn(async () => { calls.push(`${label}:undo`) }),
    redo: vi.fn(async () => { calls.push(`${label}:redo`) }),
  }
}

describe('useCommandHistory', () => {
  it('starts with empty stacks — canUndo and canRedo are false', () => {
    const { result } = renderHook(() => useCommandHistory())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('push enables canUndo and clears canRedo', async () => {
    const { result } = renderHook(() => useCommandHistory())
    const cmd = makeCmd()

    await act(async () => { result.current.push(cmd) })

    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo calls cmd.undo(), moves cmd to redo stack, enables canRedo', async () => {
    const { result } = renderHook(() => useCommandHistory())
    const cmd = makeCmd('A')

    await act(async () => { result.current.push(cmd) })
    await act(async () => { await result.current.undo() })

    expect(cmd.undo).toHaveBeenCalledOnce()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('redo calls cmd.redo(), moves cmd back to undo stack', async () => {
    const { result } = renderHook(() => useCommandHistory())
    const cmd = makeCmd('A')

    await act(async () => { result.current.push(cmd) })
    await act(async () => { await result.current.undo() })
    await act(async () => { await result.current.redo() })

    expect(cmd.redo).toHaveBeenCalledOnce()
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('push after undo clears the redo stack', async () => {
    const { result } = renderHook(() => useCommandHistory())
    const a = makeCmd('A')
    const b = makeCmd('B')

    await act(async () => { result.current.push(a) })
    await act(async () => { await result.current.undo() })
    // redo stack now has [a]
    await act(async () => { result.current.push(b) })

    expect(result.current.canRedo).toBe(false)
  })

  it('undo on empty stack is a no-op', async () => {
    const { result } = renderHook(() => useCommandHistory())
    await act(async () => { await result.current.undo() })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('redo on empty stack is a no-op', async () => {
    const { result } = renderHook(() => useCommandHistory())
    await act(async () => { await result.current.redo() })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('multiple pushes: undo steps through commands in LIFO order', async () => {
    const { result } = renderHook(() => useCommandHistory())
    const a = makeCmd('A')
    const b = makeCmd('B')

    await act(async () => { result.current.push(a) })
    await act(async () => { result.current.push(b) })
    await act(async () => { await result.current.undo() }) // undoes B
    await act(async () => { await result.current.undo() }) // undoes A

    expect(b.undo).toHaveBeenCalledBefore(a.undo as ReturnType<typeof vi.fn>)
    expect(result.current.canUndo).toBe(false)
  })
})
