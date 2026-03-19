import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, createTask, loginUser, isoDate } from '../helpers/api'

test.describe('Task Graph Drag-and-Drop', () => {
  test('T4 – drag a task card to reposition it and verify the date persists', async ({ page }) => {
    // ── Seed ──────────────────────────────────────────────────────────────
    const user = uniqueUser()
    const token = await registerUser(user)

    // Use +2 days so the card lands near the current-time indicator and is
    // visible in the default graph viewport without scrolling.
    const taskTitle = `Draggable Task ${Date.now()}`
    const taskId = await createTask(token, {
      title: taskTitle,
      endType: 'Fixed',
      endDate: isoDate(2),
    })

    // ── Log in — graph view is the default ────────────────────────────────
    await page.goto('/login')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/')

    // Ensure graph view is active
    await page.getByRole('navigation').getByRole('button', { name: 'Graph' }).click()

    // ── Wait for the task card ─────────────────────────────────────────────
    const taskCard = page.getByRole('button', { name: taskTitle })
    await expect(taskCard).toBeVisible({ timeout: 15_000 })
    await taskCard.scrollIntoViewIfNeeded()

    // ── Record start date before drag ──────────────────────────────────────
    const freshToken = await loginUser(user.username, user.password)
    const before = await page.request.get(`/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    })
    const beforeTask = await before.json() as { endDate: string }

    // ── Drag card 100 px to the right (→ later date) ──────────────────────
    const box = await taskCard.boundingBox()
    if (!box) throw new Error('Task card bounding box not available')

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Set up response interception before triggering the drag
    const saveResponse = page.waitForResponse(
      resp => resp.url().includes('/api/tasks/') && resp.request().method() === 'PUT',
      { timeout: 15_000 },
    )

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (let dx = 10; dx <= 100; dx += 10) {
      await page.mouse.move(cx + dx, cy)
    }
    await page.mouse.up()

    await saveResponse

    // ── Verify end date moved later ────────────────────────────────────────
    const after = await page.request.get(`/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    })
    const afterTask = await after.json() as { endDate: string }
    expect(new Date(afterTask.endDate).getTime()).toBeGreaterThan(
      new Date(beforeTask.endDate).getTime(),
    )

    // ── Reload and confirm persistence ────────────────────────────────────
    await page.reload()
    await page.getByRole('navigation').getByRole('button', { name: 'Graph' }).click()
    await expect(page.getByRole('button', { name: taskTitle })).toBeVisible({ timeout: 15_000 })

    const persisted = await page.request.get(`/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    })
    const persistedTask = await persisted.json() as { endDate: string }
    expect(persistedTask.endDate).toBe(afterTask.endDate)
  })
})
