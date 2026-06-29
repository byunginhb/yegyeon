'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import MarketDetailDialog from '@/components/admin/MarketDetailDialog'

interface PendingMarket {
  id: string
  title: string
  type: string
  created_at: string
  creator: { username: string; display_name: string } | null
}

interface DashboardStats {
  totalUsers: number
  todayUsers: number
  totalMarkets: number
  activeMarkets: number
  pendingMarkets: number
  todayBettingVolume: number
  totalPointsCirculation: number
  recentUsers: Array<{
    id: string
    username: string
    display_name: string
    email: string
    created_at: string
    role: string
  }>
  recentMarkets: Array<{
    id: string
    title: string
    type: string
    status: string
    total_volume: number
    created_at: string
    creator: { username: string; display_name: string } | null
  }>
  pendingMarketsList: PendingMarket[]
}

const TYPE_LABELS: Record<string, string> = {
  binary: '이진',
  multiple_choice: '객관식',
  numeric: '숫자',
}

function StatCard({
  title,
  value,
  sub,
  highlight,
}: {
  title: string
  value: string | number
  sub?: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium ${highlight ? 'text-amber-700 dark:text-amber-400' : 'text-ink-600'}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-amber-700 dark:text-amber-400' : 'text-ink-900'}`}>{value}</div>
        {sub && <p className="text-xs text-ink-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)

  function fetchStats() {
    setLoading(true)
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data)
        else setError(res.error ?? '통계 로드 실패')
      })
      .catch(() => setError('서버 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink-900">대시보드</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-ink-300 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink-900">대시보드</h1>
        <div className="text-scarlet-500">{error}</div>
      </div>
    )
  }

  if (!stats) return null

  const pendingIds = stats.pendingMarketsList.map((m) => m.id)
  const recentIds = stats.recentMarkets.map((m) => m.id)
  const allDialogIds = [...new Set([...pendingIds, ...recentIds])]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink-900">대시보드</h1>

      {/* 승인 대기 배너 */}
      {stats.pendingMarkets > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg dark:bg-amber-950/30 dark:border-amber-700">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            승인 대기 중인 마켓이 <strong>{stats.pendingMarkets}개</strong> 있습니다.
          </span>
          <Link href="/admin/markets?status=pending" className="ml-auto">
            <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 text-xs">
              전체 보기
            </Button>
          </Link>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          title="전체 유저"
          value={stats.totalUsers.toLocaleString()}
          sub={`오늘 가입: +${stats.todayUsers}`}
        />
        <StatCard
          title="전체 마켓"
          value={stats.totalMarkets.toLocaleString()}
          sub={`진행 중: ${stats.activeMarkets}`}
        />
        <StatCard
          title="승인 대기"
          value={stats.pendingMarkets}
          sub="클릭하여 처리"
          highlight={stats.pendingMarkets > 0}
        />
        <StatCard
          title="오늘 예측 거래량"
          value={`${stats.todayBettingVolume.toLocaleString()}포인트`}
        />
        <StatCard
          title="총 포인트 유통량"
          value={`${stats.totalPointsCirculation.toLocaleString()}포인트`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 승인 대기 마켓 */}
        {stats.pendingMarketsList.length > 0 && (
          <Card className="border-amber-300 dark:border-amber-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                  승인 대기 마켓
                </CardTitle>
                <Link href="/admin/markets?status=pending">
                  <span className="text-xs text-amber-600 hover:underline">전체 보기</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.pendingMarketsList.map((market) => (
                  <button
                    key={market.id}
                    onClick={() => setSelectedMarketId(market.id)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors">
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                        {TYPE_LABELS[market.type] ?? market.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900 group-hover:text-amber-700 dark:group-hover:text-amber-400 line-clamp-1 transition-colors">
                          {market.title}
                        </p>
                        <p className="text-xs text-ink-400 mt-0.5">
                          {market.creator?.display_name ?? '알 수 없음'} · {formatDate(market.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 가입 유저 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 가입 유저</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-ink-900">{user.display_name}</span>
                    <span className="text-ink-500 ml-1">@{user.username}</span>
                    {user.role === 'admin' && (
                      <span className="ml-1 text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded">
                        관리자
                      </span>
                    )}
                  </div>
                  <span className="text-ink-400 text-xs">{formatDate(user.created_at)}</span>
                </div>
              ))}
              {stats.recentUsers.length === 0 && (
                <p className="text-ink-400 text-sm">최근 가입 유저가 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 생성 마켓 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 생성 마켓</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.recentMarkets.map((market) => (
                <button
                  key={market.id}
                  onClick={() => setSelectedMarketId(market.id)}
                  className="w-full text-left group"
                >
                  <div className="py-2 px-2 rounded-lg hover:bg-canvas-100 transition-colors">
                    <div className="font-medium text-sm text-ink-900 group-hover:text-primary line-clamp-1 transition-colors">
                      {market.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-ink-400 text-xs">
                      <span>{market.creator?.display_name ?? '알 수 없음'}</span>
                      <span>·</span>
                      <span>{market.total_volume.toLocaleString()}포인트</span>
                      <span>·</span>
                      <span>{formatDate(market.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
              {stats.recentMarkets.length === 0 && (
                <p className="text-ink-400 text-sm">최근 생성 마켓이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <MarketDetailDialog
        marketId={selectedMarketId}
        marketIds={allDialogIds}
        onClose={() => setSelectedMarketId(null)}
        onActionSuccess={() => {
          setSelectedMarketId(null)
          fetchStats()
        }}
        onNavigate={setSelectedMarketId}
      />
    </div>
  )
}
