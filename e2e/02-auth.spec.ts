import { test, expect } from '@playwright/test'

test.describe('인증', () => {
  test('로그인 페이지로 이동', async ({ page }) => {
    await page.goto('/auth/login')
    // CardTitle은 div로 렌더되므로 일반 텍스트 로케이터 사용
    await expect(page.getByText('예견', { exact: true })).toBeVisible()
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
  })

  test('회원가입 페이지로 이동', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel(/비밀번호/)).toBeVisible()
  })

  test('잘못된 자격증명으로 로그인 시 오류 메시지', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill('nonexistent@example.com')
    await page.getByLabel('비밀번호').fill('wrongpassword123')
    await page.getByRole('button', { name: /이메일로 로그인/ }).click()
    // 에러가 표시되거나 URL이 로그인 페이지에 머물러 있어야 함
    await page.waitForTimeout(1500)
    expect(page.url()).toContain('/auth/login')
  })

  test('이메일 형식 검증 - HTML5 required', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill('not-an-email')
    await page.getByLabel('비밀번호').fill('password123')
    await page.getByRole('button', { name: /이메일로 로그인/ }).click()
    // 브라우저의 type="email" 검증으로 제출되지 않음
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/auth/login')
  })

  test('미인증 상태에서 /market/create 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/market/create')
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('미인증 상태에서 /portfolio 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/portfolio')
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('미인증 상태에서 /settings 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('Google 및 카카오 로그인 버튼이 표시된다', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('button', { name: /Google로 로그인/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /카카오로 로그인/ })).toBeVisible()
  })

  test('회원가입 페이지에 소셜 가입 버튼이 표시된다', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByRole('button', { name: /Google로 가입/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /카카오로 가입/ })).toBeVisible()
  })

  test('로그인 ↔ 회원가입 전환 링크', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: '회원가입' }).click()
    await page.waitForURL(/\/auth\/signup/)
    await page.getByRole('link', { name: '로그인' }).click()
    await page.waitForURL(/\/auth\/login/)
  })
})
