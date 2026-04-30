'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Gift,
  CalendarCheck,
  TrendingUp,
  MessageCircle,
  Share2,
  Check,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import PointIcon from '@/components/ui/PointIcon'
import { cn } from '@/lib/utils'

interface QuestItem {
  type: string
  title: string
  description: string
  points: number
  icon: string
  completed: boolean
  completed_at: string | null
}

interface QuestData {
  quests: QuestItem[]
  total_points_today: number
  all_completed: boolean
}

type AuthState = 'unknown' | 'signed_in' | 'signed_out'

const QUEST_ICON_MAP: Record<string, LucideIcon> = {
  daily_checkin: CalendarCheck,
  daily_bet: TrendingUp,
  daily_comment: MessageCircle,
  daily_share: Share2,
}

function QuestIcon({ type, className }: { type: string; className?: string }) {
  const Icon = QUEST_ICON_MAP[type] ?? Gift
  return <Icon className={className} />
}

export default function QuestPanel() {
  const [authState, setAuthState] = useState<AuthState>('unknown')
  const [data, setData] = useState<QuestData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const fetchQuestsRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function fetchQuests() {
      setLoading(true)
      try {
        const res = await fetch('/api/quests', { cache: 'no-store' })
        if (!res.ok) {
          if (res.status === 401 && !cancelled) setAuthState('signed_out')
          return
        }
        const json = await res.json()
        if (!json?.success) return
        if (!cancelled) setData(json.data as QuestData)
      } catch (err) {
        console.error('QuestPanel fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchQuestsRef.current = fetchQuests

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
        await fetchQuests()
      } catch (err) {
        if (cancelled) return
        console.error('QuestPanel bootstrap error:', err)
        setLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  // 출석 체크인 완료 시 퀘스트 목록 즉시 갱신
  useEffect(() => {
    const handleRefresh = () => fetchQuestsRef.current?.()
    window.addEventListener('refresh-quests', handleRefresh)
    return () => window.removeEventListener('refresh-quests', handleRefresh)
  }, [])

  if (authState === 'signed_out') return null
  if (authState === 'unknown') return null

  return (
    <section className="rounded-2xl bg-canvas-0/50 backdrop-blur-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Gift className="h-4 w-4 text-primary" />
          오늘의 퀘스트
        </h2>
        {data && !loading && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-500">
            <PointIcon size={10} />+{data.total_points_today}
          </span>
        )}
      </div>

      {loading || !data ? (
        <ul className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-8" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="space-y-1.5">
            {data.quests.map((quest) => (
              <QuestRow key={quest.type} quest={quest} />
            ))}
          </ul>

          {data.all_completed && (
            <div className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-500/10 px-3 py-2 text-[11px] font-medium text-teal-600 dark:text-teal-400">
              <Sparkles className="h-3 w-3" />
              모든 퀘스트 완료!
            </div>
          )}
        </>
      )}
    </section>
  )
}

function QuestRow({ quest }: { quest: QuestItem }) {
  const completed = quest.completed

  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors',
        completed && 'opacity-60'
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          completed
            ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
            : 'bg-ink-200/40 text-ink-500'
        )}
      >
        {completed ? (
          <Check className="h-3 w-3" />
        ) : (
          <QuestIcon type={quest.type} className="h-3 w-3" />
        )}
      </span>

      <span
        className={cn(
          'flex-1 text-xs leading-tight',
          completed ? 'text-ink-400 line-through' : 'text-ink-700'
        )}
      >
        {quest.title}
      </span>

      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-[11px] font-medium shrink-0',
          completed ? 'text-ink-400' : 'text-ink-600'
        )}
      >
        <PointIcon size={9} />+{quest.points}
      </span>
    </li>
  )
}
