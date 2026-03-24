import { test, expect } from '@playwright/test'

test('landing page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('BacTracker')).toBeVisible()
  await expect(page.getByRole('link', { name: /^login$/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /^register$/i })).toBeVisible()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /login to easybac/i })).toBeVisible()
})

test('register page renders', async ({ page }) => {
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
})

test('payment page renders rib + whatsapp cta', async ({ page }) => {
  await page.goto('/payment')
  await expect(page.getByRole('heading', { name: /unlock premium access/i })).toBeVisible()
  await expect(page.getByText(/rib/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /send receipt via whatsapp/i })).toBeVisible()
})

test('dashboard redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
