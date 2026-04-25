import Link from 'next/link'
import { TrendingUp, Users } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PointIcon from '@/components/ui/PointIcon'

async function getTrendingMarkets() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('markets')
    .select('id, slug, title, yes_probability, total_volume, type')
    .eq('status', 'open')
    .eq('is_hidden', false)
    .order('total_volume', { ascending: false })
    .limit(5)
  return data ?? []
}

async function getTopUsers() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('users')
    .select('id, username, display_name, points')
    .eq('is_banned', false)
    .order('points', { ascending: false })
    .limit(5)
  return data ?? []
}

export default async function Sidebar() {
  const [trendingMarkets, topUsers] = await Promise.all([
    getTrendingMarkets(),
    getTopUsers(),
  ])

  return (
    <aside className="space-y-4">
      {/* 트렌딩 마켓 */}
      <div className="bg-canvas-0 border border-ink-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-ink-900">인기 마켓</h3>
        </div>
        <div className="space-y-2">
          {trendingMarkets.length === 0 ? (
            <p className="text-xs text-ink-500">아직 마켓이 없습니다</p>
          ) : (
            trendingMarkets.map((market) => (
              <Link
                key={market.id}
                href={`/market/${market.slug}`}
                className="block group"
              >
                <p className="text-xs text-ink-800 group-hover:text-primary line-clamp-2 leading-snug">
                  {market.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-teal-500">
                    {Math.round(market.yes_probability * 100)}%
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-ink-500">
                    <PointIcon size={11} />{market.total_volume.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 포인트 랭킹 */}
      <div className="bg-canvas-0 border border-ink-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-ink-900">포인트 랭킹</h3>
        </div>
        <div className="space-y-2">
          {topUsers.map((user, i) => (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-2 group"
            >
              <span className="text-xs text-ink-400 w-4">{i + 1}</span>
              <span className="text-xs text-ink-800 group-hover:text-primary flex-1 truncate">
                {user.display_name}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-ink-700">
                <PointIcon size={11} />{user.points.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/leaderboard"
          className="block mt-3 text-xs text-primary hover:underline text-center"
        >
          전체 랭킹 보기
        </Link>
      </div>
    </aside>
  )
}
