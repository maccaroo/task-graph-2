import { test, expect } from '@playwright/test'
import {
  uniqueUser,
  registerUser,
  createTask,
  loginUser,
  getMe,
  isoDate,
} from '../helpers/api'

test.describe('Task Dependencies', () => {
  test('T3 – add predecessor, validate constraint violation, remove predecessor', async ({ page }) => {
    // ── Seed ──────────────────────────────────────────────────────────────
    const user = uniqueUser()
    const token = await registerUser(user)

    // Task A ends today; Task B starts tomorrow — use timestamp suffix to ensure
    // unique titles even when the DB retains data from previous test runs.
    const ts = Date.now()
    const titleA = `Task A predecessor ${ts}`
    const titleB = `Task B successor ${ts}`

    const taskAId = await createTask(token, {
      title: titleA,
      endType: 'Fixed',
      endDate: isoDate(0),
    })
    const taskBId = await createTask(token, {
      title: titleB,
      startType: 'Fixed',
      startDate: isoDate(1),
    })

    // ── Log in and switch to list view ────────────────────────────────────
    await page.goto('/login')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('navigation').getByRole('button', { name: 'Tasks' }).click()
    await expect(page.getByRole('button', { name: /\+ Add Task/i })).toBeVisible()

    // ── Open Task B detail panel ───────────────────────────────────────────
    await page.getByRole('row', { name: titleB }).click()
    const panel = page.getByTestId('task-detail-panel')
    await expect(panel).toBeVisible()

    // ── Add Task A as predecessor ──────────────────────────────────────────
    const predSelect = panel.locator('select').filter({ hasText: '— Add predecessor —' })
    await predSelect.selectOption({ label: titleA })
    await panel.getByRole('button', { name: 'Add' }).click()
    await expect(panel.getByText(titleA)).toBeVisible()

    // ── Constraint violation: try to move Task B's start before Task A ends ─
    const freshToken = await loginUser(user.username, user.password)
    const putRes = await page.request.put(`/api/tasks/${taskBId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
      data: {
        title: 'Task B (successor)',
        startType: 'Fixed',
        startDate: isoDate(-1), // before Task A ends → violates constraint
        endType: 'None',
        priority: 'Medium',
        status: 'Incomplete',
        tags: [],
      },
    })
    expect(putRes.status()).toBe(422)

    // ── Remove predecessor ─────────────────────────────────────────────────
    await panel.getByRole('button', {
      name: new RegExp(`Remove ${titleA} as predecessor`, 'i'),
    }).click()
    await expect(panel.getByText(titleA)).not.toBeVisible()

    // Constraint lifted: same date change now succeeds
    const putRes2 = await page.request.put(`/api/tasks/${taskBId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
      data: {
        title: 'Task B (successor)',
        startType: 'Fixed',
        startDate: isoDate(-1),
        endType: 'None',
        priority: 'Medium',
        status: 'Incomplete',
        tags: [],
      },
    })
    expect(putRes2.status()).toBe(200)
  })
})
