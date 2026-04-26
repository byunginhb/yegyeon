import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'

export const metadata = {
  title: '랭킹 — 예견',
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  value: number
}

async function fetchLeaderboard(type: string) {
  const { data, error } = type === 'points'
    ? await adminSupabase
      .from('users')
      .select('id, username, display_name, avatar_url, points')
      .eq('is_banned', false)
      .order('points', { ascending: false })
      .limit(50)
    : { data: null, error: null }

  if (type === 'points') {
    if (error || !data) return []
    return (data ?? []).map((u, i): LeaderboardEntry => ({
      rank: i + 1,
      user_id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      value: u.points,
    }))
  }

  // bets / profit: 집계
  const { data: bets } = await adminSupabase
    .from('bets')
    .select('user_id, amount, payout')

  if (!bets || bets.length === 0) return []

  const map: Record<string, number> = {}
  for (const b of bets) {
    if (type === 'bets') {
      map[b.user_id] = (map[b.user_id] ?? 0) + 1
    } else {
      map[b.user_id] = (map[b.user_id] ?? 0) + ((b.payout ?? 0) - b.amount)
    }
  }

  const sorted = Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)

  if (sorted.length === 0) return []

  const { data: users } = await adminSupabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', sorted.map(([id]) => id))

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  return sorted
    .map(([id, value], i): LeaderboardEntry | null => {
      const u = userMap[id]
      if (!u) return null
      return { rank: i + 1, user_id: id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url, value: Math.round(value) }
    })
    .filter(Boolean) as LeaderboardEntry[]
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />
  if (rank === 2) return <Trophy className="h-4 w-4 text-ink-400" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-orange-400" />
  return <span className="text-sm font-medium text-ink-500 w-6 text-center">{rank}</span>
}

function LeaderboardTable({
  entries,
  currentUserId,
  valueLabel,
  valueFormatter,
}: {
  entries: LeaderboardEntry[]
  currentUserId: string | null
  valueLabel: string
  valueFormatter: (v: number) => string
}) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-ink-400 text-sm bg-canvas-0 rounded-2xl border border-ink-200">
        데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-canvas-0 rounded-2xl border border-ink-200 overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 border-b border-ink-100 text-xs text-ink-400 font-medium">
        <span>순위</span>
        <span>사용자</span>
        <span className="text-right">{valueLabel}</span>
      </div>
      <ul className="divide-y divide-ink-100">
        {entries.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId
          return (
            <li
              key={entry.user_id}
              className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3 ${isCurrentUser ? 'bg-primary/5' : 'hover:bg-canvas-50'
                } transition-colors`}
            >
              <div className="flex items-center justify-center w-6">
                <RankBadge rank={entry.rank} />
              </div>
              <Link
                href={`/profile/${entry.username}`}
                className="flex items-center gap-2 min-w-0"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {entry.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-ink-900'}`}>
                    {entry.display_name}
                    {isCurrentUser && <span className="ml-1 text-xs text-primary">(나)</span>}
                  </p>
                  <p className="text-xs text-ink-400 truncate">@{entry.username}</p>
                </div>
              </Link>
              <span className="text-sm font-bold text-ink-900 text-right">
                {valueFormatter(entry.value)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default async function LeaderboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let currentUserId: string | null = null
  if (authUser) {
    const { data: dbUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
    currentUserId = dbUser?.id ?? null
  }

  const [pointsEntries, betsEntries, profitEntries] = await Promise.all([
    fetchLeaderboard('points'),
    fetchLeaderboard('bets'),
    fetchLeaderboard('profit'),
  ])

  return (
    <PageShell>
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-ink-1000">랭킹</h1>
      </div>

      <Tabs defaultValue="points">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="points" className="flex-1">포인트 순위</TabsTrigger>
          <TabsTrigger value="profit" className="flex-1">수익률 순위</TabsTrigger>
          <TabsTrigger value="bets" className="flex-1">베팅 횟수</TabsTrigger>
        </TabsList>

        <TabsContent value="points">
          <LeaderboardTable
            entries={pointsEntries}
            currentUserId={currentUserId}
            valueLabel="보유 포인트"
            valueFormatter={(v) => `${v.toLocaleString()}포인트`}
          />
        </TabsContent>

        <TabsContent value="profit">
          <LeaderboardTable
            entries={profitEntries}
            currentUserId={currentUserId}
            valueLabel="총 수익"
            valueFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}포인트`}
          />
        </TabsContent>

        <TabsContent value="bets">
          <LeaderboardTable
            entries={betsEntries}
            currentUserId={currentUserId}
            valueLabel="베팅 횟수"
            valueFormatter={(v) => `${v.toLocaleString()}회`}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
