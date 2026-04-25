import { adminSupabase } from '@/lib/supabase/admin'
import { Sparkles, Users, TrendingUp } from 'lucide-react'
import PointIcon from '@/components/ui/PointIcon'

async function fetchHeaderStats() {
  const [marketsRes, usersRes, txRes] = await Promise.all([
    adminSupabase
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('is_hidden', false)
      .eq('status', 'open'),
    adminSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_banned', false),
    adminSupabase
      .from('point_transactions')
      .select('amount')
      .eq('type', 'bet_placed'),
  ])

  const totalVolume = (txRes.data ?? []).reduce(
    (sum: number, t: { amount: number }) => sum + Math.abs(t.amount),
    0
  )

  return {
    activeMarkets: marketsRes.count ?? 0,
    activeUsers: usersRes.count ?? 0,
    totalVolume,
  }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default async function HomeHeader() {
  const stats = await fetchHeaderStats()

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent px-5 py-5">
        {/* 배경 장식 */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-semibold mb-2.5">
            <Sparkles className="h-3 w-3" />
            예측의 가치를 측정하세요
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-1000 leading-tight">
            한국에서 일어날 모든 일에
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              포인트로 베팅하세요
            </span>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-lg">
            정치·경제·스포츠·테크. 누구나 질문을 만들고, 군중의 지혜로 미래를 그려봅니다.
          </p>

          {/* 통계 */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-600">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
              <span className="font-bold text-ink-900 tabular-nums">
                {formatCompact(stats.activeMarkets)}
              </span>
              개 마켓 진행 중
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-ink-900 tabular-nums">
                {formatCompact(stats.activeUsers)}
              </span>
              명 참여
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PointIcon size={14} />
              <span className="font-bold text-ink-900 tabular-nums">
                {formatCompact(stats.totalVolume)}
              </span>
              누적 거래량
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
