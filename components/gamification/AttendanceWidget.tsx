'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Flame, Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PointIcon from '@/components/ui/PointIcon'

interface AttendanceData {
  checked_today: boolean
  streak_count: number
  points_earned_today: number | null
  next_reward: number
}

type AuthState = 'unknown' | 'signed_in' | 'signed_out'

export default function AttendanceWidget() {
  const [authState, setAuthState] = useState<AuthState>('unknown')
  const [data, setData] = useState<AttendanceData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return

        if (!session?.user) {
          setAuthState('signed_out')
          setLoading(false)
          return
        }

        setAuthState('signed_in')
        await fetchAttendance(cancelled)
      } catch (err) {
        if (cancelled) return
        console.error('AttendanceWidget bootstrap error:', err)
        setLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  async function fetchAttendance(cancelled = false): Promise<AttendanceData | null> {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 401) {
          if (!cancelled) setAuthState('signed_out')
        }
        return null
      }
      const json = await res.json()
      if (!json?.success) return null
      const next: AttendanceData = json.data
      if (!cancelled) setData(next)
      return next
    } catch (err) {
      console.error('AttendanceWidget fetch error:', err)
      return null
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  async function handleCheckIn() {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json().catch(() => null)

      if (res.status === 409) {
        toast.info('오늘은 이미 출석했습니다.')
        await fetchAttendance()
        return
      }

      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? '출석 처리에 실패했습니다.')
        return
      }

      const result = json.data as AttendanceData
      setData(result)
      const points = result.points_earned_today ?? 0
      const streak = result.streak_count
      toast.success(`+${points}포인트 획득! 🔥 ${streak}일 연속`)
    } catch (err) {
      console.error('AttendanceWidget check-in error:', err)
      toast.error('출석 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authState === 'signed_out') return null
  if (authState === 'unknown') return null

  return (
    <section className="rounded-2xl bg-canvas-0/50 backdrop-blur-sm p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 mb-3">
        <CalendarCheck className="h-4 w-4 text-teal-500" />
        오늘의 출석
      </h2>

      {loading || !data ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : data.checked_today ? (
        <CheckedInView
          streak={data.streak_count}
          earned={data.points_earned_today ?? 0}
          nextReward={data.next_reward}
        />
      ) : (
        <NotCheckedInView
          streak={data.streak_count}
          nextReward={data.next_reward}
          submitting={submitting}
          onCheckIn={handleCheckIn}
        />
      )}
    </section>
  )
}

function CheckedInView({
  streak,
  earned,
  nextReward,
}: {
  streak: number
  earned: number
  nextReward: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-scarlet-500" />
          <span className="text-xs text-ink-500">연속 출석</span>
        </div>
        <span className="text-sm font-bold text-ink-900">
          <span className="text-base text-scarlet-500">{streak}</span>
          <span className="ml-0.5 text-ink-600">일</span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-ink-500">오늘 획득</span>
        </div>
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-ink-900">
          <PointIcon size={11} />+{earned}
        </span>
      </div>

      <div className="flex items-center justify-center rounded-lg bg-teal-500/10 px-3 py-2 text-[11px] text-teal-600 dark:text-teal-400">
        <CalendarCheck className="mr-1 h-3 w-3" />
        오늘 출석 완료 · 내일 +{nextReward}p
      </div>
    </div>
  )
}

function NotCheckedInView({
  streak,
  nextReward,
  submitting,
  onCheckIn,
}: {
  streak: number
  nextReward: number
  submitting: boolean
  onCheckIn: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-scarlet-500" />
          <span className="text-xs text-ink-500">현재 연속</span>
        </div>
        <span className="text-sm font-bold text-ink-900">
          <span className="text-base text-scarlet-500">{streak}</span>
          <span className="ml-0.5 text-ink-600">일</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-500">
        <span>오늘 체크인 보상</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-ink-700">
          <PointIcon size={10} />+{nextReward}
        </span>
      </div>

      <Button
        size="sm"
        onClick={onCheckIn}
        disabled={submitting}
        className="w-full bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>처리 중...</span>
          </>
        ) : (
          <>
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>출석 체크인</span>
          </>
        )}
      </Button>
    </div>
  )
}
