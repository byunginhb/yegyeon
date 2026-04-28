import { notFound } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Users, Calendar, TrendingUp, ArrowLeft } from 'lucide-react'
import type { Market, MarketOption } from '@/types'
import InlineMarketBetting from '@/components/market/InlineMarketBetting'
import CommentSection from '@/components/market/CommentSection'
import RelatedQuestions from '@/components/market/RelatedQuestions'
import PendingBanner from '@/components/market/PendingBanner'
import RejectedBanner from '@/components/market/RejectedBanner'
import AdminApprovalBar from '@/components/market/AdminApprovalBar'
import ShareButton from '@/components/market/ShareButton'
import type { ChartPoint } from '@/components/market/ProbabilityChart'
import Link from 'next/link'
import { ReportButton } from '@/components/common/ReportButton'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const { data } = await adminSupabase
    .from('markets')
    .select('title, description, status')
    .eq('id', id)
    .single()
  if (!data) return { title: '마켓을 찾을 수 없습니다 — 예견' }
  if (data.status === 'pending' || data.status === 'rejected') {
    return { title: '예견 — 마켓 심사 중' }
  }
  return {
    title: `${data.title} — 예견`,
    description: data.description ?? undefined,
  }
}

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()

  const [marketResult, authResult] = await Promise.all([
    adminSupabase
      .from('markets')
      .select(
        `
        id, title, description, type, status,
        creator_id, category_id, close_date, resolved_at, resolution,
        total_volume, unique_traders, comment_count,
        yes_probability, yes_amount, no_amount,
        min_value, max_value, unit,
        is_hidden, rejection_reason, reviewed_by, reviewed_at,
        tags, created_at, updated_at,
        creator:users!creator_id(id, username, display_name, avatar_url),
        category:categories!category_id(id, name, slug, icon, color),
        options:market_options(id, market_id, text, color, probability, total_amount, sort_order)
        `
      )
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ])

  const { data, error } = marketResult
  if (error || !data) notFound()

  const market = data as unknown as Market & { options?: MarketOption[] }

  const authUser = authResult.data.user
  let dbUser: { id: string; role: string; points: number } | null = null
  if (authUser) {
    const { data: u } = await adminSupabase
      .from('users')
      .select('id, role, points')
      .eq('auth_id', authUser.id)
      .single()
    dbUser = u ?? null
  }

  const isCreator = !!dbUser && dbUser.id === market.creator_id
  const isAdmin = dbUser?.role === 'admin'
  const isPending = market.status === 'pending'
  const isRejected = market.status === 'rejected'

  if (market.is_hidden && !isAdmin) notFound()
  if ((isPending || isRejected) && !isCreator && !isAdmin) notFound()

  const userPoints = dbUser?.points ?? null
  const isLoggedIn = !!authUser

  const { data: betRows } = await adminSupabase
    .from('bets')
    .select('created_at, probability_at_bet')
    .eq('market_id', market.id)
    .not('probability_at_bet', 'is', null)
    .order('created_at', { ascending: true })

  const renderedAt = new Date().getTime()
  const chartData: ChartPoint[] = [
    { t: new Date(market.created_at).getTime(), p: 50 },
    ...(betRows ?? []).map((b) => ({
      t: new Date(b.created_at).getTime(),
      p: Math.round((b.probability_at_bet as number) * 100),
    })),
    { t: renderedAt, p: Math.round(market.yes_probability * 100) },
  ]

  const isOpen = market.status === 'open'
  const statusLabel =
    market.status === 'pending' ? '승인 대기' :
    market.status === 'rejected' ? '거절됨' :
    market.status === 'open' ? '진행 중' :
    market.status === 'closed' ? '마감됨' :
    market.status === 'resolved' ? '종료' : '취소됨'

  const statusBadgeClass =
    market.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
    market.status === 'rejected' ? 'bg-scarlet-500/10 text-scarlet-600' :
    isOpen ? 'bg-teal-500/10 text-teal-600' : 'bg-ink-200 text-ink-600'

  const closeDate = new Date(market.close_date)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex gap-8">

        {/* ── 메인 콘텐츠 ─────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* 뒤로가기 + 상태 */}
          <div className="flex items-center gap-2 text-sm text-ink-400 mb-5">
            <Link href="/" className="flex items-center gap-1.5 hover:text-ink-700 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              홈
            </Link>
            {market.category && (
              <>
                <span>/</span>
                <span className="text-ink-500">{market.category.icon} {market.category.name}</span>
              </>
            )}
            <span className="ml-auto">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass}`}>
                {statusLabel}
              </span>
            </span>
          </div>

          {/* 관리자 검토 패널 (pending 상태 + 관리자) */}
          {isPending && isAdmin && <AdminApprovalBar marketId={market.id} />}

          {/* 승인 대기 배너 (pending) */}
          {isPending && !isAdmin && <PendingBanner isCreator={isCreator} />}

          {/* 거절 배너 */}
          {isRejected && (
            <RejectedBanner
              reason={market.rejection_reason}
              reviewedAt={market.reviewed_at}
            />
          )}

          {/* 제목 */}
          <h1 className="text-2xl font-bold text-ink-1000 leading-snug mb-3">
            {market.title}
          </h1>

          {/* 생성자 + 통계 바 */}
          <div className="flex items-center gap-3 flex-wrap mb-5 text-sm text-ink-500">
            {market.creator && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                    {market.creator.display_name.slice(0, 1).toUpperCase()}
                  </div>
                  <Link
                    href={`/profile/${market.creator.username}`}
                    className="font-medium text-ink-700 hover:text-primary transition-colors"
                  >
                    {market.creator.display_name}
                  </Link>
                </div>
                <span className="text-ink-300">·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {market.unique_traders.toLocaleString()}명
            </span>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {market.total_volume.toLocaleString()} 포인트
            </span>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {closeDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 마감
            </span>
            <div className="ml-auto flex items-center gap-1">
              {!isPending && !isRejected && (
                <ShareButton
                  marketId={market.id}
                  marketTitle={market.title}
                />
              )}
              {isLoggedIn && isOpen && (
                <ReportButton
                  type="market"
                  targetId={market.id}
                  targetLabel={market.title}
                  variant="text"
                />
              )}
            </div>
          </div>

          {/* 종료 결과 */}
          {market.status === 'resolved' && market.resolution && (
            <div className="mb-5 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <p className="text-sm font-semibold text-teal-700 mb-1">종료 결과</p>
              <p className="text-xl font-bold text-teal-600 uppercase">{market.resolution}</p>
            </div>
          )}

          {/* 확률 차트 + 베팅 폼 (open 상태만 활성) */}
          {!isPending && !isRejected ? (
            <InlineMarketBetting
              market={market}
              userPoints={userPoints}
              isLoggedIn={isLoggedIn}
              chartData={market.type === 'binary' ? chartData : undefined}
            />
          ) : (
            <div className="mb-5 p-4 rounded-xl bg-canvas-50 border border-ink-200 text-center text-sm text-ink-500">
              승인 후 베팅이 활성화됩니다.
            </div>
          )}

          {/* 설명 */}
          {market.description && (
            <div className="mb-5 p-4 bg-canvas-50 rounded-xl border border-ink-200">
              <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">
                {market.description}
              </p>
            </div>
          )}

          {/* 태그 */}
          {market.tags && market.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {market.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-canvas-100 border border-ink-200 text-ink-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 댓글 (open 이상 상태만) */}
          {!isPending && !isRejected && (
            <CommentSection marketId={market.id} isLoggedIn={isLoggedIn} />
          )}
        </div>

        {/* ── 관련 질문 패널 (xl+, 공개 마켓만) ──────── */}
        {!isPending && !isRejected && (
          <div className="hidden xl:block w-72 shrink-0">
            <div className="sticky top-6">
              <RelatedQuestions
                currentMarketId={market.id}
                categoryId={market.category_id ?? null}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
