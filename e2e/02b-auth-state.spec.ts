import { test, expect } from '@playwright/test'

/**
 * 로그인 후 인증 상태가 UI에 정확히 반영되는지 검증.
 * 시드 사용자(scripts/seed.ts) 가 원격/로컬 DB에 적용돼 있어야 한다.
 *
 * 회귀 방지 대상:
 * - 사이드바가 본인 닉네임/포인트를 표시하는가
 * - "로그인 / 가입" 버튼이 사라지고 "로그아웃" 버튼이 보이는가
 * - 로그아웃 후 다시 미인증 상태 UI로 복귀하는가
 */

const SEED_USER = {
  email: 'kimchul@example.com',
  password: 'Test1234!',
  displayName: '김철수',
}

test.describe('인증 상태 UI 반영', () => {
  test('로그인 → 사이드바에 본인 닉네임/포인트 + 로그아웃 버튼 표시', async ({ page }) => {
    // 1) 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(SEED_USER.email)
    await page.getByLabel('비밀번호').fill(SEED_USER.password)
    await page.getByRole('button', { name: /이메일로 로그인/ }).click()

    // 2) 홈으로 리다이렉트 대기
    await page.waitForURL('/', { timeout: 10000 })

    // 3) 사이드바에 본인 정보 표시 확인 (lg+ 데스크탑 뷰포트)
    //    LeftSidebar 는 hidden lg:flex 라서 chromium 기본 1280px에서 노출됨.
    const sidebar = page.locator('aside').first()

    // 닉네임이 보여야 함
    await expect(sidebar.getByText(SEED_USER.displayName, { exact: false })).toBeVisible({
      timeout: 5000,
    })

    // 로그아웃 버튼 노출
    await expect(sidebar.getByRole('button', { name: /로그아웃/ })).toBeVisible()

    // "로그인 / 가입" 링크가 더 이상 보이면 안 됨
    await expect(sidebar.getByRole('link', { name: /로그인 \/ 가입/ })).toHaveCount(0)
  })

  test('로그아웃 → 다시 "로그인 / 가입" 표시', async ({ page }) => {
    // 1) 사전 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(SEED_USER.email)
    await page.getByLabel('비밀번호').fill(SEED_USER.password)
    await page.getByRole('button', { name: /이메일로 로그인/ }).click()
    await page.waitForURL('/', { timeout: 10000 })

    const sidebar = page.locator('aside').first()
    await expect(sidebar.getByText(SEED_USER.displayName, { exact: false })).toBeVisible({
      timeout: 5000,
    })

    // 2) 로그아웃
    await sidebar.getByRole('button', { name: /로그아웃/ }).click()

    // 3) "로그인 / 가입" 링크 복귀
    await expect(sidebar.getByRole('link', { name: /로그인 \/ 가입/ })).toBeVisible({
      timeout: 5000,
    })
    await expect(sidebar.getByRole('button', { name: /로그아웃/ })).toHaveCount(0)
  })

  test('로그인 → 보호 라우트(/portfolio) 접근 가능', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(SEED_USER.email)
    await page.getByLabel('비밀번호').fill(SEED_USER.password)
    await page.getByRole('button', { name: /이메일로 로그인/ }).click()
    await page.waitForURL('/', { timeout: 10000 })

    // /portfolio 는 본인 프로필로 redirect 됨
    await page.goto('/portfolio')
    await page.waitForURL(/\/profile\/.+/, { timeout: 10000 })
    expect(page.url()).toContain('/profile/')
  })
})
