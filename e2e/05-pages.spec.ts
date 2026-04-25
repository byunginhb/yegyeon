import { test, expect } from '@playwright/test'

test.describe('주요 페이지 로드', () => {
  test('랭킹 페이지', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.getByRole('heading', { name: '랭킹' })).toBeVisible()
    // 탭 구성
    await expect(page.getByRole('tab', { name: /포인트 순위/ })).toBeVisible()
  })

  test('소개 페이지', async ({ page }) => {
    await page.goto('/about')
    await expect(page).toHaveURL('/about')
    await expect(
      page.getByRole('heading', { name: /예견\(YEGYEON\)이란/ })
    ).toBeVisible()
  })

  test('존재하지 않는 마켓 — 404 또는 not-found 렌더', async ({ page }) => {
    const response = await page.goto('/market/this-market-does-not-exist-xyz-999', {
      waitUntil: 'domcontentloaded',
    })
    // 404 상태 또는 not-found 페이지 렌더 허용
    const status = response?.status() ?? 0
    if (status !== 404) {
      // not-found.tsx가 렌더된 경우라도 500 에러는 안 됨
      expect(status).toBeLessThan(500)
    }
  })

  test('존재하지 않는 프로필 — 오류 없이 처리', async ({ page }) => {
    const response = await page.goto('/profile/this-user-does-not-exist-xyz', {
      waitUntil: 'domcontentloaded',
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test('설정 페이지 - 비인증 리다이렉트', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('관리자 페이지 - 비인증 리다이렉트', async ({ page }) => {
    await page.goto('/admin')
    // 미인증은 로그인으로 리다이렉트되어야 함
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })
})
