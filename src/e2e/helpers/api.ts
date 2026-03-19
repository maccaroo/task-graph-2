/**
 * Lightweight API helpers for seeding test data directly against the REST API.
 * These run in Node (not in the browser) so they use the native fetch API.
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:5501'

let counter = 0

/** Generate unique test-user data. */
export function uniqueUser() {
  const id = `${Date.now()}${++counter}`
  return {
    firstName: 'Test',
    lastName: 'User',
    username: `tuser${id}`,
    email: `tuser${id}@example.com`,
    password: 'Password1!',
  }
}

/** Register a user via API and return the JWT token. */
export async function registerUser(user: ReturnType<typeof uniqueUser>): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })
  if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { token: string }
  return data.token
}

/** Log in an existing user via API and return the JWT token. */
export async function loginUser(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { token: string }
  return data.token
}

export interface TaskSeed {
  title: string
  endType?: 'None' | 'Fixed' | 'Flexible'
  endDate?: string
  startType?: 'None' | 'Fixed' | 'Flexible'
  startDate?: string
  assigneeId?: string
}

/** Create a task via API; returns the created task id. */
export async function createTask(token: string, task: TaskSeed): Promise<string> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: task.title,
      priority: 'Medium',
      endType: task.endType ?? 'None',
      endDate: task.endDate,
      startType: task.startType ?? 'None',
      startDate: task.startDate,
      assigneeId: task.assigneeId,
      tags: [],
    }),
  })
  if (!res.ok) throw new Error(`Create task failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { id: string }
  return data.id
}

/** Update a task via API. */
export async function updateTask(
  token: string,
  taskId: string,
  patch: Partial<TaskSeed & { status: string }>,
): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Update task failed: ${res.status} ${await res.text()}`)
}

/** Get the current user profile (returns id and other fields). */
export async function getMe(token: string): Promise<{ id: string; username: string }> {
  // Decode sub claim from JWT payload
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  return { id: payload.sub as string, username: payload.unique_name as string }
}

/** ISO date string for today + offsetDays, at noon UTC. */
export function isoDate(offsetDays = 0): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  d.setUTCHours(12, 0, 0, 0)
  return d.toISOString()
}
