import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type LeaderboardType = 'points' | 'profit' | 'bets'

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  value: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = (searchParams.get('type') ?? 'points') as LeaderboardType

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

  if (type === 'points') {
    const { data, error } = await adminSupabase
      .from('users')
      .select('id, username, display_name, avatar_url, points')
      .eq('is_banned', false)
      .order('points', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const entries: LeaderboardEntry[] = (data ?? []).map((u, i) => ({
      rank: i + 1,
      user_id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      value: u.points,
    }))

    const currentRank = currentUserId
      ? entries.findIndex((e) => e.user_id === currentUserId) + 1
      : null

    return NextResponse.json({ success: true, data: { entries, currentRank, currentUserId } })
  }

  if (type === 'bets') {
    const { data, error } = await adminSupabase
      .from('bets')
      .select('user_id')

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 베팅 횟수 집계
    const countMap: Record<string, number> = {}
    for (const b of data ?? []) {
      countMap[b.user_id] = (countMap[b.user_id] ?? 0) + 1
    }

    const topUserIds = Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([id]) => id)

    if (topUserIds.length === 0) {
      return NextResponse.json({ success: true, data: { entries: [], currentRank: null, currentUserId } })
    }

    const { data: users } = await adminSupabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', topUserIds)

    const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

    const entries: LeaderboardEntry[] = topUserIds
      .map((id, i) => {
        const u = userMap[id]
        if (!u) return null
        return {
          rank: i + 1,
          user_id: id,
          username: u.username,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          value: countMap[id] ?? 0,
        }
      })
      .filter(Boolean) as LeaderboardEntry[]

    const currentRank = currentUserId
      ? entries.findIndex((e) => e.user_id === currentUserId) + 1
      : null

    return NextResponse.json({ success: true, data: { entries, currentRank, currentUserId } })
  }

  // profit 타입: payout - amount 합계
  const { data: bets, error } = await adminSupabase
    .from('bets')
    .select('user_id, amount, payout')
    .not('payout', 'is', null)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const profitMap: Record<string, number> = {}
  for (const b of bets ?? []) {
    profitMap[b.user_id] = (profitMap[b.user_id] ?? 0) + ((b.payout ?? 0) - b.amount)
  }

  const topUserIds = Object.entries(profitMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([id]) => id)

  if (topUserIds.length === 0) {
    return NextResponse.json({ success: true, data: { entries: [], currentRank: null, currentUserId } })
  }

  const { data: users } = await adminSupabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', topUserIds)

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  const entries: LeaderboardEntry[] = topUserIds
    .map((id, i) => {
      const u = userMap[id]
      if (!u) return null
      return {
        rank: i + 1,
        user_id: id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        value: Math.round(profitMap[id] ?? 0),
      }
    })
    .filter(Boolean) as LeaderboardEntry[]

  const currentRank = currentUserId
    ? entries.findIndex((e) => e.user_id === currentUserId) + 1
    : null

  return NextResponse.json({ success: true, data: { entries, currentRank, currentUserId } })
}
