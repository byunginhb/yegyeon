import { test, expect } from '@playwright/test'

// 전역 storageState의 억제 키를 해제해야 팝업이 뜬다
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('티저 마켓 팝업', () => {
  test('비로그인 상태에서 3초 후 인기 마켓 팝업이 뜨고, 예측하면 진행 상황과 가입 유도 링크가 보인다', async ({
    page,
  }) => {
    await page.goto('/')

    const dialog = page.getByRole('dialog').filter({ hasText: '오늘 하루 보지 않기' })
    await expect(dialog).toBeVisible({ timeout: 15000 })

    await dialog.getByRole('button', { name: '예', exact: true }).click()

    await expect(dialog.getByText(/^예 \d+%$/)).toBeVisible()
    await expect(
      dialog.getByText('인기 마켓부터 새로운 마켓까지, 더 많은 예측에 참여해보세요.')
    ).toBeVisible()
    await expect(dialog.getByRole('link', { name: /더 많은 마켓 보기/ })).toHaveAttribute(
      'href',
      '/auth/signup'
    )
  })

  test('"오늘 하루 보지 않기"를 누르면 팝업이 닫히고 새로고침해도 다시 뜨지 않는다', async ({
    page,
  }) => {
    await page.goto('/')

    const dialog = page.getByRole('dialog').filter({ hasText: '오늘 하루 보지 않기' })
    await expect(dialog).toBeVisible({ timeout: 15000 })

    await dialog.getByRole('button', { name: '오늘 하루 보지 않기' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await page.waitForTimeout(5000)
    await expect(page.getByText('어떻게 예측하시나요?')).toHaveCount(0)
  })
})
