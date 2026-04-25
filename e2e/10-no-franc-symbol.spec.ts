import { test, expect } from '@playwright/test'

const pages = ['/', '/browse', '/leaderboard', '/about', '/auth/login', '/auth/signup']

for (const path of pages) {
  test(`₣ 기호 없음 — ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('₣')
  })
}
