import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import type { User, Market, Bet } from '@/types'

interface ProfileData {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'points' | 'created_at'>
  markets: Market[]
  bets: (Bet & { market?: Pick<Market, 'id' | 'title'> })[]
  stats: {
    market_count: number
    bet_count: number
    total_profit: number
  }
}

interface Props {
  params: Promise<{ username: string }>
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { username } = await params

  const { data: user, error: userError } = await adminSupabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, points, created_at')
    .eq('username', username)
    .single()

  if (userError || !user) {
    return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다' }, { status: 404 })
  }

  const [marketsResult, betsResult] = await Promise.all([
    adminSupabase
      .from('markets')
      .select('id, slug, title, description, type, status, close_date, total_volume, unique_traders, yes_probability, created_at, updated_at, comment_count, yes_amount, no_amount, min_value, max_value, unit, numeric_tolerance, is_hidden, tags, creator_id, category_id, resolved_at, resolution')
      .eq('creator_id', user.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20),
    adminSupabase
      .from('bets')
      .select('id, user_id, market_id, option_id, outcome, amount, shares, payout, created_at, market:markets!market_id(id, title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const markets = (marketsResult.data ?? []) as unknown as Market[]
  const bets = (betsResult.data ?? []) as unknown as (Bet & { market?: Pick<Market, 'id' | 'title'> })[]

  const totalProfit = bets.reduce((acc, b) => acc + ((b.payout ?? 0) - b.amount), 0)

  const profileData: ProfileData = {
    user: user as unknown as ProfileData['user'],
    markets,
    bets,
    stats: {
      market_count: markets.length,
      bet_count: bets.length,
      total_profit: Math.round(totalProfit),
    },
  }

  return NextResponse.json({ success: true, data: profileData })
}
