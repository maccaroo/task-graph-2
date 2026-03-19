import { test, expect, type Browser } from '@playwright/test'
import { uniqueUser, registerUser, createTask, getMe, isoDate } from '../helpers/api'

async function loginAndWaitForDashboard(browser: Browser, username: string, password: string) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
  return { ctx, page }
}

test.describe('Real-Time Notifications', () => {
  test('T5 – re-assigning a task pushes a WebSocket notification to the assignee', async ({ browser }) => {
    // ── Seed two users and a task ──────────────────────────────────────────
    const userA = uniqueUser() // receiver of notification
    const userB = uniqueUser() // the one who re-assigns

    const tokenA = await registerUser(userA)
    const tokenB = await registerUser(userB)
    const { id: userAId } = await getMe(tokenA)

    // Task created by User B with no assignee
    const taskTitle = `Notify Task ${Date.now()}`
    await createTask(tokenB, {
      title: taskTitle,
      endType: 'Fixed',
      endDate: isoDate(7),
    })

    // ── User A: open app and note initial unread count ─────────────────────
    const { page: pageA } = await loginAndWaitForDashboard(browser, userA.username, userA.password)
    const badgeA = pageA.locator('[aria-label*="unread"]')
    const initialCount = (await badgeA.isVisible()) ? parseInt(await badgeA.innerText(), 10) : 0

    // ── User B: switch to task list and re-assign task to User A ──────────
    const { page: pageB } = await loginAndWaitForDashboard(browser, userB.username, userB.password)

    // Switch to list view (graph is default)
    await pageB.getByRole('navigation').getByRole('button', { name: 'Tasks' }).click()
    await expect(pageB.getByRole('button', { name: /\+ Add Task/i })).toBeVisible()

    await pageB.getByRole('row', { name: taskTitle }).click()
    const panel = pageB.getByTestId('task-detail-panel')
    await expect(panel).toBeVisible()

    // Assignee dropdown is the first <select> in the panel
    await panel.locator('select').first().selectOption({ value: userAId })

    // Wait for auto-save
    await expect(panel.getByText('Saved')).toBeVisible({ timeout: 10_000 })

    // ── User A: badge must increment within a few seconds ─────────────────
    await expect(async () => {
      const newCount = (await badgeA.isVisible())
        ? parseInt(await badgeA.innerText(), 10)
        : 0
      expect(newCount).toBeGreaterThan(initialCount)
    }).toPass({ timeout: 15_000, intervals: [1_000] })

    // ── Open notification list and confirm the new entry ──────────────────
    await pageA.getByRole('button', { name: 'Notifications' }).click()
    const notifPanel = pageA.getByRole('dialog', { name: 'Notifications' })
    await expect(notifPanel).toBeVisible()
    await expect(notifPanel.locator('li').first()).toContainText(taskTitle)
  })
})
