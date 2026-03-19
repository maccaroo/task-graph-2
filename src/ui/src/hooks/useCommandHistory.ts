import { useCallback, useRef, useState } from 'react'
import type { ICommand } from '../lib/commands/types'

export function useCommandHistory() {
  const undoStack = useRef<ICommand[]>([])
  const redoStack = useRef<ICommand[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const push = useCallback((cmd: ICommand) => {
    undoStack.current.push(cmd)
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(async () => {
    const cmd = undoStack.current.pop()
    if (!cmd) return
    await cmd.undo()
    redoStack.current.push(cmd)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [])

  const redo = useCallback(async () => {
    const cmd = redoStack.current.pop()
    if (!cmd) return
    await cmd.redo()
    undoStack.current.push(cmd)
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [])

  return { push, undo, redo, canUndo, canRedo }
}
