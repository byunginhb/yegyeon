'use client'

import { useEffect, useState } from 'react'
import {
  CalendarCheck,
  Flame,
  Target,
  Check,
  Loader2,
  ChevronRight,
  Sparkles,
  Gift,
  TrendingUp,
  MessageCircle,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import PointIcon from '@/components/ui/PointIcon'
import BookmarkQuestCard from '@/components/gamification/BookmarkQuestCard'
import { cn } from '@/lib/utils'

interface AttendanceData {
  checked_today: boolean
  streak_count: number
  points_earned_today: number | null
  next_reward: number
}

interface QuestItem {
  type: string
  title: string
  description: string
  points: number
  completed: boolean
}

interface QuestData {
  quests: QuestItem[]
  onetime_quests?: QuestItem[]
  total_points_today: number
  all_completed: boolean
}

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

export default function MobileGamificationStrip() {
  const [ready, setReady] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [quests, setQuests] = useState<QuestData | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function bootstrap() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || cancelled) return

      const [attRes, questRes] = await Promise.all([
        fetch('/api/attendance', { cache: 'no-store' }),
        fetch('/api/quests', { cache: 'no-store' }),
      ])
      if (cancelled) return

      const [attJson, questJson] = await Promise.all([attRes.json(), questRes.json()])
      if (cancelled) return

      if (attJson?.success) setAttendance(attJson.data)
      if (questJson?.success) setQuests(questJson.data)
      setReady(true)
    }

    bootstrap()
    return () => { cancelled = true }
  }, [])

  async function refreshQuests() {
    const refreshed = await fetch('/api/quests', { cache: 'no-store' })
      .then((r) => r.json())
      .catch(() => null)
    if (refreshed?.success) setQuests(refreshed.data)
  }

  async function handleCheckIn() {
    if (checkingIn) return
    setCheckingIn(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json().catch(() => null)

      if (res.status === 409) {
        toast.info('오늘은 이미 출석했습니다.')
        const updated = await fetch('/api/attendance', { cache: 'no-store' }).then(r => r.json())
        if (updated?.success) setAttendance(updated.data)
        return
      }
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? '출석 처리에 실패했습니다.')
        return
      }
      setAttendance(json.data)
      // 퀘스트 목록 즉시 갱신
      const questRes = await fetch('/api/quests', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      if (questRes?.success) setQuests(questRes.data)
      toast.success(`+${json.data.points_earned_today ?? 0}포인트 획득! ${json.data.streak_count}일 연속`)
    } catch (err) {
      console.error('MobileGamificationStrip check-in error:', err)
      toast.error('출석 처리 중 오류가 발생했습니다.')
    } finally {
      setCheckingIn(false)
    }
  }

  if (!ready) return null

  const completedCount = quests?.quests.filter(q => q.completed).length ?? 0
  const totalCount = quests?.quests.length ?? 4
  const nextQuest = quests?.quests.find(q => !q.completed)

  return (
    <div className="xl:hidden -mx-4 px-4 mb-4">
      {/* 바로가기 추가 미션 배너 (미완료 시에만, 1뎁스 없이 바로 노출) */}
      {quests?.onetime_quests
        ?.filter((quest) => !quest.completed)
        .map((quest) => (
          <div key={quest.type} className="mb-3">
            <BookmarkQuestCard quest={quest} variant="banner" onCompleted={refreshQuests} />
          </div>
        ))}

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* 출석 카드 */}
        <div className="snap-start shrink-0 w-[260px] rounded-2xl bg-canvas-0/50 backdrop-blur-sm border border-ink-200/60 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
              <CalendarCheck className="h-3.5 w-3.5 text-teal-500" />
              오늘의 출석
            </span>
            {attendance?.checked_today && (
              <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-medium">
                <Check className="h-3 w-3" />
                완료
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-ink-500">
              <Flame className="h-3 w-3 text-scarlet-500" />
              {attendance?.checked_today ? '연속 출석' : '현재 연속'}
            </span>
            <span className="font-bold text-ink-900">
              <span className="text-scarlet-500">{attendance?.streak_count ?? 0}</span>
              <span className="text-ink-600 ml-0.5">일</span>
            </span>
          </div>

          {attendance?.checked_today ? (
            <div className="flex items-center justify-center rounded-lg bg-teal-500/10 py-1.5 text-[11px] text-teal-600 dark:text-teal-400">
              <CalendarCheck className="mr-1 h-3 w-3" />
              오늘 완료 · 내일 +{attendance.next_reward}p
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="h-9 w-full bg-teal-500 text-white hover:bg-teal-600 text-xs gap-1.5"
            >
              {checkingIn ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CalendarCheck className="h-3.5 w-3.5" />
                  출석 체크인 +{attendance?.next_reward ?? 100}p
                </>
              )}
            </Button>
          )}
        </div>

        {/* 퀘스트 카드 */}
        <Sheet>
          <SheetTrigger className="snap-start shrink-0 w-[260px] rounded-2xl bg-canvas-0/50 backdrop-blur-sm border border-ink-200/60 p-3 flex flex-col gap-2 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
                  <Target className="h-3.5 w-3.5 text-violet-500" />
                  오늘의 퀘스트
                </span>
                <span className="text-[11px] text-ink-500 font-medium">
                  {completedCount}/{totalCount}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalCount }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      i < completedCount ? 'bg-violet-500' : 'bg-ink-200'
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-ink-500">
                <span className="truncate mr-1">
                  {quests?.all_completed
                    ? '모든 퀘스트 완료!'
                    : nextQuest?.title ?? '퀘스트 불러오는 중...'}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              </div>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl px-4 pb-8">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  오늘의 퀘스트
                </span>
                {quests && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-500 font-normal">
                    <PointIcon size={10} />+{quests.total_points_today}
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>

            {quests ? (
              <>
                <ul className="space-y-2">
                  {quests.quests.map(quest => (
                    <li
                      key={quest.type}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors',
                        quest.completed ? 'opacity-60' : 'bg-ink-100/40'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          quest.completed
                            ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                            : 'bg-ink-200/60 text-ink-500'
                        )}
                      >
                        {quest.completed ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <QuestIcon type={quest.type} className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium leading-tight', quest.completed ? 'text-ink-400 line-through' : 'text-ink-900')}>
                          {quest.title}
                        </p>
                        <p className="text-xs text-ink-400 leading-tight mt-0.5">{quest.description}</p>
                      </div>
                      <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium shrink-0', quest.completed ? 'text-ink-400' : 'text-ink-600')}>
                        <PointIcon size={10} />+{quest.points}
                      </span>
                    </li>
                  ))}
                </ul>

                {quests.onetime_quests
                  ?.filter((quest) => !quest.completed)
                  .map((quest) => (
                    <div key={quest.type} className="mt-3">
                      <BookmarkQuestCard quest={quest} onCompleted={refreshQuests} />
                    </div>
                  ))}

                {quests.all_completed && (
                  <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-teal-500/10 py-3 text-sm font-medium text-teal-600 dark:text-teal-400">
                    <Sparkles className="h-4 w-4" />
                    모든 퀘스트 완료!
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-400 text-center py-8">로딩 중...</p>
            )}
          </SheetContent>
        </Sheet>

      </div>
    </div>
  )
}
