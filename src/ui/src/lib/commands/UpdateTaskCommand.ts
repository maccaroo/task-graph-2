import { updateTask, type CreateTaskData } from '../../services/tasks'
import type { ICommand } from './types'

export function updateTaskCommand(
  taskId: string,
  before: CreateTaskData,
  after: CreateTaskData,
): ICommand {
  return {
    async undo() { await updateTask(taskId, before) },
    async redo() { await updateTask(taskId, after) },
  }
}
