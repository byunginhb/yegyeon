import Link from 'next/link'
import { TrendingUp, Flame, Trophy } from 'lucide-react'
import { adminSupabase } from '@/lib/supabase/admin'
import PointIcon from '@/components/ui/PointIcon'

interface TrendingMarket {
  id: string
  slug: string | null
  title: string
  total_volume: number
  unique_traders: number
  yes_probability: number
  type: string
}

interface TopUser {
  id: string
  username: string
  display_name: string
  points: number
}

interface CategoryStat {
  id: number
  name: string
  slug: string
  icon: string
  color: string
  count: number
}

async function fetchSidebarData() {
  const [trendingRes, topUsersRes, categoriesRes, openMarketsRes] = await Promise.all([
    adminSupabase
      .from('markets')
      .select('id, slug, title, total_volume, unique_traders, yes_probability, type')
      .eq('is_hidden', false)
      .eq('status', 'open')
      .order('unique_traders', { ascending: false })
      .limit(5),
    adminSupabase
      .from('users')
      .select('id, username, display_name, points')
      .eq('is_banned', false)
      .order('points', { ascending: false })
      .limit(5),
    adminSupabase
      .from('categories')
      .select('id, name, slug, icon, color')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    adminSupabase
      .from('markets')
      .select('category_id', { count: 'exact', head: false })
      .eq('is_hidden', false)
      .eq('status', 'open'),
  ])

  const counts = new Map<number, number>()
  for (const row of openMarketsRes.data ?? []) {
    if (row.category_id != null) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
    }
  }

  const categoryStats: CategoryStat[] = (categoriesRes.data ?? []).map((c) => ({
    ...c,
    count: counts.get(c.id) ?? 0,
  }))

  return {
    trending: (trendingRes.data ?? []) as TrendingMarket[],
    topUsers: (topUsersRes.data ?? []) as TopUser[],
    categories: categoryStats,
  }
}

export default async function RightSidebar() {
  const { trending, topUsers, categories } = await fetchSidebarData()

  return (
    <aside className="hidden xl:block w-72 shrink-0 space-y-4 pl-4">
      {/* 인기 마켓 */}
      <section className="rounded-2xl bg-canvas-0/50 backdrop-blur-sm p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 mb-3">
          <Flame className="h-4 w-4 text-scarlet-500" />
          지금 인기 마켓
        </h2>
        <ul className="space-y-2">
          {trending.length === 0 ? (
            <li className="text-xs text-ink-400">아직 활성 마켓이 없습니다.</li>
          ) : (
            trending.map((m, idx) => (
              <li key={m.id}>
                <Link
                  href={`/market/${m.slug ?? m.id}`}
                  className="group flex items-start gap-2 text-xs text-ink-700 hover:text-primary"
                >
                  <span className="shrink-0 w-4 h-4 rounded-md bg-ink-200/50 text-ink-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 leading-snug group-hover:underline">{m.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-400">
                      <span>{m.unique_traders}명</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <PointIcon size={9} />
                        {m.total_volume >= 1000
                          ? `${(m.total_volume / 1000).toFixed(1)}K`
                          : m.total_volume.toLocaleString()}
                      </span>
                      {m.type === 'binary' && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-ink-600">
                            {Math.round(m.yes_probability * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* 카테고리 칩 */}
      <section className="rounded-2xl bg-canvas-0/50 backdrop-blur-sm p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          카테고리
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/?category=${c.slug}`}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors hover:scale-[1.02]"
              style={{ backgroundColor: `${c.color}15`, color: c.color }}
            >
              <span>{c.icon}</span>
              <span className="font-medium">{c.name}</span>
              {c.count > 0 && (
                <span className="text-[10px] opacity-70">{c.count}</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* 리더보드 */}
      <section className="rounded-2xl bg-canvas-0/50 backdrop-blur-sm p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 mb-3">
          <Trophy className="h-4 w-4 text-amber-500" />
          포인트 랭킹
        </h2>
        <ul className="space-y-2">
          {topUsers.length === 0 ? (
            <li className="text-xs text-ink-400">유저가 없습니다.</li>
          ) : (
            topUsers.map((u, idx) => (
              <li key={u.id}>
                <Link
                  href={`/profile/${u.username}`}
                  className="flex items-center justify-between text-xs hover:text-primary group"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 w-4 h-4 rounded-md bg-ink-200/50 text-ink-500 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate text-ink-700 group-hover:underline">
                      {u.display_name}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-ink-500 shrink-0">
                    <PointIcon size={10} />
                    {u.points >= 1000 ? `${(u.points / 1000).toFixed(1)}K` : u.points}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
        <Link
          href="/leaderboard"
          className="block mt-3 text-center text-[11px] text-ink-500 hover:text-primary"
        >
          전체 랭킹 →
        </Link>
      </section>
    </aside>
  )
}
