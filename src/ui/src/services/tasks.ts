import { api } from '../lib/api'

export type TaskStatus = 'Incomplete' | 'Complete'
export type TaskPriority = 'Low' | 'Medium' | 'High'
export type TimingType = 'None' | 'Fixed' | 'Flexible'
export type RelationshipType = 'Exclusive' | 'HaveStarted' | 'HaveCompleted' | 'HandOff'

export interface TaskRelationshipInfo {
  relatedTaskId: string
  type: RelationshipType
}

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
  predecessorIds: string[]
  successorIds: string[]
  predecessors: TaskRelationshipInfo[]
  successors: TaskRelationshipInfo[]
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

export async function updateTask(id: string, data: CreateTaskData): Promise<Task> {
  const { data: task } = await api.put<Task>(`/tasks/${id}`, data)
  return task
}

export async function addPredecessor(taskId: string, predecessorId: string, relationshipType: RelationshipType = 'Exclusive'): Promise<void> {
  await api.post(`/tasks/${taskId}/predecessors/${predecessorId}`, { relationshipType })
}

export async function removePredecessor(taskId: string, predecessorId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}/predecessors/${predecessorId}`)
}
