import { test, expect } from '@playwright/test'

test.describe('홈 페이지', () => {
  test('헤더 로고 및 주요 네비게이션이 표시된다', async ({ page }) => {
    await page.goto('/')
    // 헤더 로고 "예견"
    await expect(page.getByRole('link', { name: '예견', exact: true }).first()).toBeVisible()
    // 데스크탑 네비게이션 링크
    await expect(page.getByRole('link', { name: '탐색', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: '랭킹', exact: true }).first()).toBeVisible()
  })

  test('로그인/가입 버튼이 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible()
    await expect(page.getByRole('link', { name: '가입하기' })).toBeVisible()
  })

  test('환영 배너가 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: '예견에 오신 것을 환영합니다' })
    ).toBeVisible()
  })

  test('CategoryTabs에 "전체"가 표시된다', async ({ page }) => {
    await page.goto('/')
    // CategoryTabs는 button 요소로 구현됨
    await expect(page.getByRole('button', { name: /전체/ }).first()).toBeVisible()
  })

  test('모바일 네비게이션 바가 모바일 뷰포트에서 표시된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // MobileNav는 fixed 하단이며, 링크 라벨 포함
    await expect(page.getByRole('link', { name: '홈', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '만들기', exact: true })).toBeVisible()
  })
})
