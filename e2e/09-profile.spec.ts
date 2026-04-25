import { test, expect } from '@playwright/test'

test.describe('프로필 페이지', () => {
  test('시드 유저 프로필 접근', async ({ page }) => {
    await page.goto('/profile/kimchul')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('오류')
    expect(bodyText).toContain('김철수')
  })
})
