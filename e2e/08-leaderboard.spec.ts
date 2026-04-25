import { test, expect } from '@playwright/test'

test.describe('랭킹 페이지', () => {
  test('유저 목록이 표시된다', async ({ page }) => {
    await page.goto('/leaderboard')
    await page.waitForLoadState('networkidle')
    // 시드 유저가 보이는지
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('임태원') // 가장 높은 포인트
  })

  test('₣ 기호가 없어야 한다', async ({ page }) => {
    await page.goto('/leaderboard')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('₣')
  })
})
