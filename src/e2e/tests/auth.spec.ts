import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser } from '../helpers/api'

test.describe('Authentication', () => {
  test('T1a – register a new user and land on the dashboard', async ({ page }) => {
    const user = uniqueUser()

    await page.goto('/register')
    await page.getByLabel('First name').fill(user.firstName)
    await page.getByLabel('Last name').fill(user.lastName)
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'User menu' })).toContainText(user.firstName)
  })

  test('T1b – logout navigates to the login page', async ({ page }) => {
    const user = uniqueUser()
    await registerUser(user)

    await page.goto('/login')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('menuitem', { name: 'Logout' }).click()

    await expect(page).toHaveURL('/login')
  })

  test('T1c – login with valid credentials navigates to the dashboard', async ({ page }) => {
    const user = uniqueUser()
    await registerUser(user)

    await page.goto('/login')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/')
  })

  test('T1d – login with wrong password shows an error', async ({ page }) => {
    const user = uniqueUser()
    await registerUser(user)

    await page.goto('/login')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Wait for the loading state to clear, then assert the error is shown
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 15_000 })
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})
