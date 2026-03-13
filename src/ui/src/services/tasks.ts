import { api } from '../lib/api'

export type TaskStatus = 'Incomplete' | 'Complete'
export type TaskPriority = 'Low' | 'Medium' | 'High'
export type TimingType = 'None' | 'Fixed' | 'Flexible'

export interface Task {
  id: string
  title: string
  description: string | null
  assigneeId: string | null
  assigneeUsername: string | null
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  startType: TimingType
  startDate: string | null
  endType: TimingType
  endDate: string | null
  duration: string | null
  pinnedPosition: { x: number; y: number } | null
  predecessorIds: string[]
  successorIds: string[]
}

export interface CreateTaskData {
  title: string
  description?: string
  assigneeId?: string
  status?: TaskStatus
  priority?: TaskPriority
  tags?: string[]
  startType?: TimingType
  startDate?: string
  endType?: TimingType
  endDate?: string
  duration?: string
}

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/tasks')
  return data
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const { data: task } = await api.post<Task>('/tasks', data)
  return task
}
