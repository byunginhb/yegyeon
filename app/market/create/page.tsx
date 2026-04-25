import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMarketForm from '@/components/market/CreateMarketForm'
import type { Category } from '@/types'

export const metadata = {
  title: '마켓 만들기 — 예견',
}

export default async function CreateMarketPage() {
  // 인증 확인 (미들웨어 보호 외 서버 컴포넌트에서도 확인)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login?next=/market/create')
  }

  // 카테고리 사전 로드
  let categories: Category[] = []
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/categories`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const json = await res.json()
      if (json.success) categories = json.data
    }
  } catch {
    // 카테고리 로드 실패 시 빈 배열로 진행
  }

  return (
    <main className="min-h-screen bg-canvas-100">
      <CreateMarketForm categories={categories} />
    </main>
  )
}
