# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 07-market-detail.spec.ts >> 마켓 상세 페이지 >> 마켓 목록에서 카드 클릭 시 상세 이동
- Location: e2e/07-market-detail.spec.ts:4:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "/market/"
Received string:    "http://localhost:3000/"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e69] [cursor=pointer]:
    - img [ref=e70]
  - alert [ref=e73]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('마켓 상세 페이지', () => {
  4  |   test('마켓 목록에서 카드 클릭 시 상세 이동', async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await page.waitForLoadState('networkidle')
  7  |     // 마켓 카드가 있으면 첫 번째 클릭
  8  |     const cards = page.locator('a[href^="/market/"]')
  9  |     const count = await cards.count()
  10 |     if (count > 0) {
  11 |       const href = await cards.first().getAttribute('href')
  12 |       await cards.first().click()
  13 |       await page.waitForLoadState('networkidle')
  14 |       // 404 not-found가 아닌지 확인
  15 |       const url = page.url()
> 16 |       expect(url).toContain('/market/')
     |                   ^ Error: expect(received).toContain(expected) // indexOf
  17 |       // 에러 페이지가 아닌지
  18 |       const bodyText = await page.textContent('body')
  19 |       expect(bodyText).not.toContain('마켓을 찾을 수 없')
  20 |     }
  21 |   })
  22 | 
  23 |   test('슬러그로 마켓 상세 직접 접근', async ({ page }) => {
  24 |     // 시드 데이터의 슬러그
  25 |     await page.goto('/market/bts-full-comeback-2025')
  26 |     await page.waitForLoadState('networkidle')
  27 |     const bodyText = await page.textContent('body')
  28 |     expect(bodyText).not.toContain('마켓을 찾을 수 없')
  29 |     expect(bodyText).toContain('BTS')
  30 |   })
  31 | 
  32 |   test('베팅 패널이 표시된다', async ({ page }) => {
  33 |     await page.goto('/market/bts-full-comeback-2025')
  34 |     await page.waitForLoadState('networkidle')
  35 |     // 베팅 UI 또는 로그인 요청 중 하나가 표시
  36 |     const bodyText = await page.textContent('body')
  37 |     const hasBetting = bodyText?.includes('베팅') || bodyText?.includes('로그인')
  38 |     expect(hasBetting).toBe(true)
  39 |   })
  40 | })
  41 | 
```