import { test, expect } from '@playwright/test'

const viewports = [
  { name: '모바일', width: 375, height: 812 },
  { name: '태블릿', width: 768, height: 1024 },
  { name: '데스크탑', width: 1440, height: 900 },
]

for (const viewport of viewports) {
  test.describe(`반응형 — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('홈 페이지 렌더링', async ({ page }) => {
      await page.goto('/')
      // 헤더의 "예견" 로고 확인
      await expect(page.getByRole('link', { name: '예견', exact: true }).first()).toBeVisible()
    })

    test('탐색 페이지 렌더링', async ({ page }) => {
      await page.goto('/browse')
      await expect(page).toHaveURL('/browse')
      await expect(page.getByPlaceholder(/마켓 검색/)).toBeVisible()
    })

    test('로그인 페이지 렌더링', async ({ page }) => {
      await page.goto('/auth/login')
      await expect(page.getByLabel('이메일')).toBeVisible()
      await expect(page.getByLabel('비밀번호')).toBeVisible()
    })
  })
}
