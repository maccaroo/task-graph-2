import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser } from '../helpers/api'

async function loginAndGoToTaskList(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')

  // "Tasks" / "Graph" are view-toggle buttons in the Statusbar — they don't change the URL
  await page.getByRole('navigation').getByRole('button', { name: 'Tasks' }).click()
  // Wait until the task list toolbar is visible
  await expect(page.getByRole('button', { name: /\+ Add Task/i })).toBeVisible()
}

test.describe('Task CRUD', () => {
  test('T2a – create a task and verify it appears in the task list', async ({ page }) => {
    const user = uniqueUser()
    await registerUser(user)
    await loginAndGoToTaskList(page, user.username, user.password)

    await page.getByRole('button', { name: /\+ Add Task/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Add Task' })
    await expect(dialog).toBeVisible()

    const taskTitle = `E2E Task ${Date.now()}`
    await dialog.getByLabel('Title').fill(taskTitle)

    await dialog.getByRole('button', { name: 'Create task' }).click()
    await expect(dialog).not.toBeVisible()

    await expect(page.getByRole('row', { name: taskTitle })).toBeVisible()
  })

  test('T2b – edit task title and confirm persistence after reload', async ({ page }) => {
    const user = uniqueUser()
    await registerUser(user)
    await loginAndGoToTaskList(page, user.username, user.password)

    // Create a task
    await page.getByRole('button', { name: /\+ Add Task/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Add Task' })
    const originalTitle = `Original ${Date.now()}`
    await dialog.getByLabel('Title').fill(originalTitle)
    await dialog.getByRole('button', { name: 'Create task' }).click()
    await expect(dialog).not.toBeVisible()

    // Open detail panel by clicking the task row
    await page.getByRole('row', { name: originalTitle }).click()
    const panel = page.getByTestId('task-detail-panel')
    await expect(panel).toBeVisible()

    // Edit title — set up network intercept before fill so we don't miss the request
    const updatedTitle = `Updated ${Date.now()}`
    const saveResponsePromise = page.waitForResponse(
      r => r.url().includes('/api/tasks/') && r.request().method() === 'PUT',
      { timeout: 10_000 },
    )
    await panel.getByTestId('task-title-input').fill(updatedTitle)

    // Wait for the auto-save PUT to complete and confirm success
    const saveRes = await saveResponsePromise
    expect(saveRes.status()).toBe(200)

    // Reload and confirm persistence
    await page.reload()
    await page.getByRole('navigation').getByRole('button', { name: 'Tasks' }).click()
    await expect(page.getByRole('button', { name: /\+ Add Task/i })).toBeVisible()
    await expect(page.getByRole('row', { name: updatedTitle })).toBeVisible()
  })

  test('T2c – delete a task and confirm it is removed from the list', async ({ page }) => {
    const user = uniqueUser()
    await registerUser(user)
    await loginAndGoToTaskList(page, user.username, user.password)

    // Create a task
    await page.getByRole('button', { name: /\+ Add Task/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Add Task' })
    const taskTitle = `Delete Me ${Date.now()}`
    await dialog.getByLabel('Title').fill(taskTitle)
    await dialog.getByRole('button', { name: 'Create task' }).click()
    await expect(dialog).not.toBeVisible()

    // Open detail panel
    await page.getByRole('row', { name: taskTitle }).click()
    const panel = page.getByTestId('task-detail-panel')
    await expect(panel).toBeVisible()

    // Delete
    await panel.getByRole('button', { name: 'Delete' }).click()
    await expect(panel.getByText('Are you sure?')).toBeVisible()
    await panel.getByRole('button', { name: 'Yes' }).click()

    await expect(panel).not.toBeVisible()
    await expect(page.getByRole('row', { name: taskTitle })).not.toBeVisible()
  })
})
