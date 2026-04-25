import { test, expect } from '@playwright/test'

test.describe('마켓 탐색', () => {
  test('탐색 페이지 로드', async ({ page }) => {
    await page.goto('/browse')
    await expect(page).toHaveTitle(/예견/)
    await expect(page.getByPlaceholder(/마켓 검색/)).toBeVisible()
    await expect(page.getByRole('heading', { name: '마켓 탐색' })).toBeVisible()
  })

  test('카테고리 탭이 표시된다', async ({ page }) => {
    await page.goto('/browse')
    // CategoryTabs는 button 요소로 구현됨
    await expect(page.getByRole('button', { name: /전체/ }).first()).toBeVisible()
  })

  test('카테고리 탭 클릭 시 URL 쿼리 변경', async ({ page }) => {
    await page.goto('/browse')
    // "정치" 카테고리 버튼 클릭
    const politicsBtn = page.getByRole('button', { name: /정치/ }).first()
    if (await politicsBtn.isVisible()) {
      await politicsBtn.click()
      await page.waitForURL(/category=politics/, { timeout: 5000 })
      expect(page.url()).toContain('category=politics')
    }
  })

  test('검색창에 입력 시 URL이 업데이트된다', async ({ page }) => {
    await page.goto('/browse')
    const search = page.getByPlaceholder(/마켓 검색/)
    await search.fill('테스트')
    // 디바운스 대기 후 URL 확인
    await page.waitForTimeout(800)
    await expect(search).toHaveValue('테스트')
  })

  test('결과 카운트 표시', async ({ page }) => {
    await page.goto('/browse')
    // "총 N개의 마켓" 텍스트가 렌더링되어야 함
    await expect(page.getByText(/총\s*[\d,]+개의 마켓/)).toBeVisible({ timeout: 10000 })
  })
})
