import { notFound, redirect } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import EditMarketForm from '@/components/market/EditMarketForm'
import type { Category, Market } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '마켓 수정 — 예견',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditMarketPage({ params }: Props) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    redirect(`/auth/login?next=/market/${id}/edit`)
  }

  const { data: dbUser } = await adminSupabase
    .from('users')
    .select('id, role')
    .eq('auth_id', authUser.id)
    .single()
  if (!dbUser) notFound()

  const { data: market } = await adminSupabase
    .from('markets')
    .select(
      `id, title, description, thumbnail_url, type, status,
       creator_id, category_id, close_date, resolved_at, resolution,
       total_volume, unique_traders, comment_count,
       yes_probability, yes_amount, no_amount,
       min_value, max_value, unit,
       is_hidden, rejection_reason, reviewed_by, reviewed_at,
       resolution_criteria, tags, created_at, updated_at`,
    )
    .eq('id', id)
    .single()

  if (!market) notFound()

  const isCreator = market.creator_id === dbUser.id
  const isAdmin = dbUser.role === 'admin'
  if (!isCreator && !isAdmin) {
    redirect(`/market/${id}`)
  }
  if (
    market.status === 'resolved' ||
    market.status === 'cancelled' ||
    market.status === 'closed'
  ) {
    redirect(`/market/${id}`)
  }

  const { data: categoriesData } = await adminSupabase
    .from('categories')
    .select('id, name, slug, icon, color, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const categories = (categoriesData ?? []) as Category[]

  return (
    <main className="min-h-screen bg-canvas-100">
      <EditMarketForm
        market={market as unknown as Market}
        categories={categories}
        isAdmin={isAdmin}
      />
    </main>
  )
}
