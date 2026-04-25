import { test, expect } from '@playwright/test'

test.describe('마켓 생성 폼 (비인증)', () => {
  test('비인증 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto('/market/create')
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })
})
