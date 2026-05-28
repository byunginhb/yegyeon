import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMarketForm from '@/components/market/CreateMarketForm'
import { adminSupabase } from '@/lib/supabase/admin'
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

  // 카테고리 직접 로드 (API Route HTTP 호출 대신 DB 직접 조회)
  const { data: categoriesData } = await adminSupabase
    .from('categories')
    .select('id, name, slug, icon, color, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const categories = (categoriesData ?? []) as Category[]

  return (
    <main className="min-h-screen bg-canvas-100">
      <CreateMarketForm categories={categories} />
    </main>
  )
}
