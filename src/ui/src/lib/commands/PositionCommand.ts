import { updateTask, type CreateTaskData } from '../../services/tasks'
import type { ICommand } from './types'

/**
 * Captures before/after state for a task-position operation (move or resize),
 * including any cascade-updated related tasks.
 */
export function positionCommand(
  primaryTaskId: string,
  taskBefore: CreateTaskData,
  taskAfter: CreateTaskData,
  cascadeBefore: Map<string, CreateTaskData>,
  cascadeAfter: Map<string, CreateTaskData>,
): ICommand {
  return {
    async undo() {
      await updateTask(primaryTaskId, taskBefore)
      for (const [id, data] of cascadeBefore) {
        await updateTask(id, data)
      }
    },
    async redo() {
      await updateTask(primaryTaskId, taskAfter)
      for (const [id, data] of cascadeAfter) {
        await updateTask(id, data)
      }
    },
  }
}
