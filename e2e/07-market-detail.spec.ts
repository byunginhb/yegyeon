import { test, expect } from '@playwright/test'

test.describe('마켓 상세 페이지', () => {
  test('마켓 목록에서 카드 클릭 시 상세 이동', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // 마켓 카드가 있으면 첫 번째 클릭
    const cards = page.locator('a[href^="/market/"]')
    const count = await cards.count()
    if (count > 0) {
      const href = await cards.first().getAttribute('href')
      await cards.first().click()
      await page.waitForLoadState('networkidle')
      // 404 not-found가 아닌지 확인
      const url = page.url()
      expect(url).toContain('/market/')
      // 에러 페이지가 아닌지
      const bodyText = await page.textContent('body')
      expect(bodyText).not.toContain('마켓을 찾을 수 없')
    }
  })

  test('슬러그로 마켓 상세 직접 접근', async ({ page }) => {
    // 시드 데이터의 슬러그
    await page.goto('/market/bts-full-comeback-2025')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('마켓을 찾을 수 없')
    expect(bodyText).toContain('BTS')
  })

  test('베팅 패널이 표시된다', async ({ page }) => {
    await page.goto('/market/bts-full-comeback-2025')
    await page.waitForLoadState('networkidle')
    // 베팅 UI 또는 로그인 요청 중 하나가 표시
    const bodyText = await page.textContent('body')
    const hasBetting = bodyText?.includes('베팅') || bodyText?.includes('로그인')
    expect(hasBetting).toBe(true)
  })
})
