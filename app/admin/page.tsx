'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardStats {
  totalUsers: number
  todayUsers: number
  totalMarkets: number
  activeMarkets: number
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
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string
  value: string | number
  sub?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-ink-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-ink-900">{value}</div>
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

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data)
        else setError(res.error ?? '통계 로드 실패')
      })
      .catch(() => setError('서버 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink-900">대시보드</h1>

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
          title="오늘 베팅 거래량"
          value={`${stats.todayBettingVolume.toLocaleString()}포인트`}
        />
        <StatCard
          title="총 포인트 유통량"
          value={`${stats.totalPointsCirculation.toLocaleString()}포인트`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
            <div className="space-y-3">
              {stats.recentMarkets.map((market) => (
                <div key={market.id} className="text-sm">
                  <div className="font-medium text-ink-900 line-clamp-1">{market.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-ink-400 text-xs">
                    <span>{market.creator?.display_name ?? '알 수 없음'}</span>
                    <span>·</span>
                    <span>{market.total_volume.toLocaleString()}포인트</span>
                    <span>·</span>
                    <span>{formatDate(market.created_at)}</span>
                  </div>
                </div>
              ))}
              {stats.recentMarkets.length === 0 && (
                <p className="text-ink-400 text-sm">최근 생성 마켓이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
