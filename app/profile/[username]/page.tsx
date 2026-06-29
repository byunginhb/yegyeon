import { notFound } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FollowButton from '@/components/user/FollowButton'
import { ReportButton } from '@/components/common/ReportButton'
import PageShell from '@/components/layout/PageShell'
import Link from 'next/link'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Clock,
  CheckCircle,
} from 'lucide-react'
import type { Market, Bet, User } from '@/types'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  const { data } = await adminSupabase
    .from('users')
    .select('display_name')
    .eq('username', username)
    .single()
  if (!data) return { title: '사용자를 찾을 수 없습니다 — 예견' }
  return { title: `${data.display_name} (@${username}) — 예견` }
}

interface BetWithMarket extends Bet {
  market?: {
    id: string
    title: string
    slug?: string
    status: string
    type: string
    yes_probability: number
    resolution: string | null
    close_date: string
  } | null
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profileUser, error } = await adminSupabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, points, created_at')
    .eq('username', username)
    .single()

  if (error || !profileUser) {
    notFound()
  }

  // 현재 유저 정보 조회
  let currentUserId: string | null = null
  let isFollowing = false

  if (authUser) {
    const { data: dbUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
    currentUserId = dbUser?.id ?? null

    if (currentUserId && currentUserId !== profileUser.id) {
      const { data: followRow } = await adminSupabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profileUser.id)
        .maybeSingle()
      isFollowing = !!followRow
    }
  }

  const isSelf = currentUserId === profileUser.id

  // 마켓 및 예측 데이터 조회
  const [marketsResult, betsResult] = await Promise.all([
    adminSupabase
      .from('markets')
      .select(
        'id, slug, title, status, total_volume, yes_probability, close_date, created_at, description, type, comment_count, unique_traders, yes_amount, no_amount, min_value, max_value, unit, numeric_tolerance, is_hidden, tags, creator_id, category_id, resolved_at, resolution, updated_at'
      )
      .eq('creator_id', profileUser.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50),
    adminSupabase
      .from('bets')
      .select(
        'id, user_id, market_id, option_id, outcome, amount, shares, payout, probability_at_bet, created_at, market:markets!market_id(id, title, slug, status, type, yes_probability, resolution, close_date)'
      )
      .eq('user_id', profileUser.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const markets = (marketsResult.data ?? []) as unknown as Market[]
  const bets = (betsResult.data ?? []) as unknown as BetWithMarket[]

  // Summary 통계
  const activeBets = bets.filter(
    (b) => b.market?.status === 'open' || b.market?.status === 'closed'
  )
  const resolvedBets = bets.filter(
    (b) => b.market?.status === 'resolved' || b.market?.status === 'cancelled'
  )

  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0)
  const resolvedPayout = resolvedBets.reduce((sum, b) => sum + (b.payout ?? 0), 0)
  const resolvedCost = resolvedBets.reduce((sum, b) => sum + b.amount, 0)
  const netProfit = resolvedPayout - resolvedCost

  const joinedAt = new Date(profileUser.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <PageShell>
      <div>

        {/* 프로필 헤더 */}
        <div className="bg-canvas-0 rounded-2xl border border-ink-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={profileUser.avatar_url ?? undefined} alt={profileUser.display_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {profileUser.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-ink-1000 truncate">{profileUser.display_name}</h1>
                  <p className="text-sm text-ink-500 truncate">@{profileUser.username}</p>
                </div>
                {isSelf ? (
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-ink-200 text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors shrink-0 whitespace-nowrap"
                  >
                    프로필 편집
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <FollowButton
                      targetUserId={profileUser.id}
                      initialFollowing={isFollowing}
                      isLoggedIn={!!authUser}
                    />
                    {!!authUser && (
                      <ReportButton
                        type="user"
                        targetId={profileUser.id}
                        targetLabel={`${profileUser.display_name} (@${profileUser.username})`}
                        variant="icon"
                      />
                    )}
                  </div>
                )}
              </div>

              {profileUser.bio && (
                <p className="mt-2 text-sm text-ink-700">{profileUser.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-ink-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {joinedAt} 가입
                </span>
              </div>
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-ink-100">
            <div className="text-center">
              <p className="text-sm sm:text-lg font-bold text-ink-1000 break-keep">{profileUser.points.toLocaleString()}포인트</p>
              <p className="text-xs text-ink-500">보유 포인트</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-ink-1000">{markets.length}</p>
              <p className="text-xs text-ink-500">생성 마켓</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-ink-1000">{bets.length}</p>
              <p className="text-xs text-ink-500">예측 횟수</p>
            </div>
          </div>
        </div>

        {/* 3탭: Summary / Markets / Trades */}
        <Tabs defaultValue="summary">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="summary" className="flex-1">요약</TabsTrigger>
            <TabsTrigger value="markets" className="flex-1">마켓</TabsTrigger>
            <TabsTrigger value="trades" className="flex-1">예측</TabsTrigger>
          </TabsList>

          {/* ─── Summary 탭 ─────────────────────────── */}
          <TabsContent value="summary">
            {/* 요약 카드 4칸 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-canvas-0 rounded-xl border border-ink-200 p-4 text-center">
                <p className="text-xl font-bold text-ink-1000 tabular-nums">
                  {profileUser.points.toLocaleString()}
                </p>
                <p className="text-xs text-ink-500 mt-1">현재 포인트</p>
              </div>
              <div className="bg-canvas-0 rounded-xl border border-ink-200 p-4 text-center">
                <p className="text-xl font-bold text-ink-1000 tabular-nums">{bets.length}</p>
                <p className="text-xs text-ink-500 mt-1">총 예측 수</p>
              </div>
              <div className="bg-canvas-0 rounded-xl border border-ink-200 p-4 text-center">
                <p className="text-xl font-bold text-ink-1000 tabular-nums">
                  {totalBetAmount.toLocaleString()}
                </p>
                <p className="text-xs text-ink-500 mt-1">총 예측 금액</p>
              </div>
              <div className="bg-canvas-0 rounded-xl border border-ink-200 p-4 text-center">
                <p
                  className={`text-xl font-bold tabular-nums ${
                    netProfit >= 0 ? 'text-teal-500' : 'text-scarlet-500'
                  }`}
                >
                  {netProfit >= 0 ? '+' : ''}
                  {netProfit.toLocaleString()}
                </p>
                <p className="text-xs text-ink-500 mt-1">순 손익</p>
              </div>
            </div>

            {/* 본인 프로필일 때만 진행 중/완료 예측 섹션 노출 */}
            {isSelf && (
              <>
                {/* 진행 중인 예측 */}
                <section className="mb-6">
                  <h2 className="text-base font-semibold text-ink-900 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-ink-400" />
                    진행 중인 예측
                    <span className="text-sm font-normal text-ink-500">
                      ({activeBets.length})
                    </span>
                  </h2>
                  {activeBets.length === 0 ? (
                    <div className="bg-canvas-0 rounded-xl border border-ink-200 p-8 text-center text-ink-400 text-sm">
                      진행 중인 예측이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeBets.slice(0, 10).map((bet) => {
                        const market = bet.market
                        const currentProb = market?.yes_probability ?? 0.5
                        const isYes = bet.outcome === 'YES'
                        const currentValue = isYes
                          ? bet.shares * currentProb
                          : bet.shares * (1 - currentProb)
                        const unrealizedPnl = currentValue - bet.amount

                        return (
                          <div
                            key={bet.id}
                            className="bg-canvas-0 rounded-xl border border-ink-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {market ? (
                                  <Link
                                    href={`/market/${market.id}`}
                                    className="text-sm font-medium text-ink-900 hover:text-primary line-clamp-2 transition-colors"
                                  >
                                    {market.title}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium text-ink-900">
                                    마켓 정보 없음
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      bet.outcome === 'YES'
                                        ? 'bg-teal-500/10 text-teal-600'
                                        : bet.outcome === 'NO'
                                        ? 'bg-scarlet-500/10 text-scarlet-600'
                                        : 'bg-primary/10 text-primary'
                                    }`}
                                  >
                                    {bet.outcome}
                                  </span>
                                  <span className="text-xs text-ink-400">
                                    {new Date(bet.created_at).toLocaleDateString('ko-KR')}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-ink-900 tabular-nums">
                                  {bet.amount.toLocaleString()}포인트
                                </p>
                                {market?.type === 'binary' && (
                                  <p
                                    className={`text-xs font-medium tabular-nums ${
                                      unrealizedPnl >= 0
                                        ? 'text-teal-500'
                                        : 'text-scarlet-500'
                                    }`}
                                  >
                                    {unrealizedPnl >= 0 ? '+' : ''}
                                    {Math.round(unrealizedPnl).toLocaleString()}포인트
                                  </p>
                                )}
                                {market && (
                                  <p className="text-xs text-ink-400 mt-0.5 tabular-nums">
                                    현 {Math.round(currentProb * 100)}%
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* 완료된 예측 */}
                <section>
                  <h2 className="text-base font-semibold text-ink-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-ink-400" />
                    완료된 예측
                    <span className="text-sm font-normal text-ink-500">
                      ({resolvedBets.length})
                    </span>
                  </h2>
                  {resolvedBets.length === 0 ? (
                    <div className="bg-canvas-0 rounded-xl border border-ink-200 p-8 text-center text-ink-400 text-sm">
                      완료된 예측이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resolvedBets.slice(0, 10).map((bet) => {
                        const market = bet.market
                        const payout = bet.payout ?? 0
                        const profit = payout - bet.amount
                        const isWin = profit > 0
                        const isLoss = profit < 0

                        return (
                          <div
                            key={bet.id}
                            className="bg-canvas-0 rounded-xl border border-ink-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {market ? (
                                  <Link
                                    href={`/market/${market.id}`}
                                    className="text-sm font-medium text-ink-900 hover:text-primary line-clamp-2 transition-colors"
                                  >
                                    {market.title}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium text-ink-900">
                                    마켓 정보 없음
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      bet.outcome === 'YES'
                                        ? 'bg-teal-500/10 text-teal-600'
                                        : bet.outcome === 'NO'
                                        ? 'bg-scarlet-500/10 text-scarlet-600'
                                        : 'bg-primary/10 text-primary'
                                    }`}
                                  >
                                    {bet.outcome}
                                  </span>
                                  {market?.resolution && (
                                    <span className="text-xs text-ink-500">
                                      결과: {market.resolution}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-ink-900 tabular-nums">
                                  {bet.amount.toLocaleString()}포인트
                                </p>
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                  {isWin && (
                                    <TrendingUp className="h-3 w-3 text-teal-500" />
                                  )}
                                  {isLoss && (
                                    <TrendingDown className="h-3 w-3 text-scarlet-500" />
                                  )}
                                  <p
                                    className={`text-xs font-medium tabular-nums ${
                                      isWin
                                        ? 'text-teal-500'
                                        : isLoss
                                        ? 'text-scarlet-500'
                                        : 'text-ink-400'
                                    }`}
                                  >
                                    {profit >= 0 ? '+' : ''}
                                    {profit.toLocaleString()}포인트
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* 타 프로필일 땐 활동 요약만 보여줌 */}
            {!isSelf && (
              <div className="bg-canvas-0 rounded-xl border border-ink-200 p-6 flex items-center gap-3">
                <BarChart2 className="h-4 w-4 text-ink-400" />
                <span className="text-sm text-ink-600">누적 수익</span>
                <span
                  className={`ml-auto font-bold tabular-nums ${
                    netProfit >= 0 ? 'text-teal-500' : 'text-scarlet-500'
                  }`}
                >
                  {netProfit >= 0 ? '+' : ''}
                  {Math.round(netProfit).toLocaleString()}포인트
                </span>
              </div>
            )}
          </TabsContent>

          {/* ─── Markets 탭 ─────────────────────────── */}
          <TabsContent value="markets">
            {markets.length === 0 ? (
              <div className="py-12 text-center text-ink-400 text-sm bg-canvas-0 rounded-2xl border border-ink-200">
                생성한 마켓이 없습니다.
              </div>
            ) : (
              <ul className="space-y-3">
                {markets.map((market) => (
                  <li key={market.id}>
                    <Link
                      href={`/market/${market.id}`}
                      className="block bg-canvas-0 rounded-xl border border-ink-200 p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-900 line-clamp-2">{market.title}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
                            <span className="flex items-center gap-1 tabular-nums">
                              <TrendingUp className="h-3 w-3" />
                              {market.total_volume.toLocaleString()}포인트
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full font-medium ${
                                market.status === 'open'
                                  ? 'bg-teal-500/10 text-teal-600'
                                  : 'bg-ink-200 text-ink-600'
                              }`}
                            >
                              {market.status === 'open'
                                ? '진행 중'
                                : market.status === 'resolved'
                                ? '종료'
                                : '마감'}
                            </span>
                          </div>
                        </div>
                        {market.type === 'binary' && (
                          <div className="shrink-0 text-right">
                            <p className="text-base font-bold text-teal-500 tabular-nums">
                              {Math.round(market.yes_probability * 100)}%
                            </p>
                            <p className="text-xs text-ink-400">YES</p>
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ─── Trades 탭 ─────────────────────────── */}
          <TabsContent value="trades">
            {bets.length === 0 ? (
              <div className="py-12 text-center text-ink-400 text-sm bg-canvas-0 rounded-2xl border border-ink-200">
                예측 내역이 없습니다.
              </div>
            ) : (
              <ul className="space-y-3">
                {bets.map((bet) => {
                  const profit = (bet.payout ?? 0) - bet.amount
                  return (
                    <li
                      key={bet.id}
                      className="bg-canvas-0 rounded-xl border border-ink-200 p-4"
                    >
                      <p className="text-sm font-medium text-ink-900 line-clamp-1 mb-2">
                        {bet.market?.title ?? '(삭제된 마켓)'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-ink-500">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium ${
                              bet.outcome === 'yes' || bet.outcome === 'YES'
                                ? 'bg-teal-500/10 text-teal-600'
                                : 'bg-scarlet-500/10 text-scarlet-500'
                            }`}
                          >
                            {bet.outcome.toUpperCase()}
                          </span>
                          <span className="tabular-nums">
                            {bet.amount.toLocaleString()}포인트 예측
                          </span>
                        </div>
                        {bet.payout !== null ? (
                          <span
                            className={
                              profit >= 0
                                ? 'text-teal-500 font-medium tabular-nums'
                                : 'text-scarlet-500 font-medium tabular-nums'
                            }
                          >
                            {profit >= 0 ? '+' : ''}
                            {Math.round(profit).toLocaleString()}포인트
                          </span>
                        ) : (
                          <span className="text-ink-400">진행 중</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
