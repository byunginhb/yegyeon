'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookmarkPlus,
  Monitor,
  Smartphone,
  Share,
  Loader2,
  Check,
  ChevronRight,
  Home,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import PointIcon from '@/components/ui/PointIcon'

interface BookmarkQuest {
  type: string
  title: string
  description: string
  points: number
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'desktop' | 'ios' | 'android'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/**
 * 북마크(PC)/홈 화면 추가(모바일) 1회성 퀘스트 카드
 * - Android Chrome: beforeinstallprompt 로 실제 설치 프롬프트 → appinstalled 시 자동 완료
 * - 그 외: 플랫폼별 안내 후 사용자가 완료 버튼으로 보상 수령
 */
export default function BookmarkQuestCard({
  quest,
  variant = 'row',
  onCompleted,
}: {
  quest: BookmarkQuest
  /** row: 퀘스트 목록용 컴팩트 행 / banner: 홈 상단 강조 배너 / icon: 헤더 아이콘 버튼 */
  variant?: 'row' | 'banner' | 'icon'
  onCompleted?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [standalone, setStandalone] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // null: 미확인(조회 중), false: 미수령, true: 이미 보상 수령
  const [claimed, setClaimed] = useState<boolean | null>(null)

  useEffect(() => {
    setPlatform(detectPlatform())
    setStandalone(window.matchMedia('(display-mode: standalone)').matches)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      claimReward()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 다이얼로그 열기: 비로그인 → 로그인 페이지 이동, 로그인 → 열고 보상 수령 여부 조회
   */
  async function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false)
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/auth/login')
        return
      }
    } catch (error) {
      console.error('바로가기 다이얼로그 세션 확인 실패:', error)
      router.push('/auth/login')
      return
    }

    setOpen(true)

    // 계정 기준 완료 여부 조회 (다른 기기에서 수령한 경우 포함)
    try {
      const res = await fetch('/api/quests', { cache: 'no-store' })
      const json = await res.json()
      const matched = (
        json?.data?.onetime_quests as { type: string; completed: boolean }[] | undefined
      )?.find((q) => q.type === quest.type)
      setClaimed(Boolean(matched?.completed))
    } catch {
      setClaimed(false)
    }
  }

  async function claimReward() {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_type: quest.type }),
      })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? '보상 지급에 실패했습니다.')
        return
      }

      if (json.data?.already_completed) {
        toast.info('이미 보상을 받은 퀘스트입니다.')
      } else {
        toast.success(`바로가기 추가 보상 +${quest.points.toLocaleString()} 포인트 획득!`)
      }

      setClaimed(true)
      setOpen(false)
      window.dispatchEvent(new Event('refresh-quests'))
      onCompleted?.()
    } catch (error) {
      console.error('bookmark_home 퀘스트 완료 실패:', error)
      toast.error('보상 지급 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInstallClick() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        // appinstalled 이벤트에서 claimReward 가 호출됨 (미발화 대비 직접 호출해도 중복 지급은 서버가 차단)
        claimReward()
      }
      setInstallPrompt(null)
    } catch (error) {
      console.error('PWA 설치 프롬프트 실패:', error)
    }
  }

  // 이미 설치된 PWA(standalone)에서는 헤더 아이콘을 숨김
  if (variant === 'icon' && standalone) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {variant === 'icon' ? (
        <DialogTrigger
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-700 transition-colors hover:bg-canvas-50 hover:text-ink-1000"
          title={`바로가기 추가하고 ${quest.points.toLocaleString()}포인트 받기`}
          aria-label="바로가기 추가"
        >
          <BookmarkPlus className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </DialogTrigger>
      ) : variant === 'banner' ? (
        <DialogTrigger className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-violet-500 px-4 py-3 text-left text-white shadow-sm transition-transform active:scale-[0.99]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <BookmarkPlus className="h-5 w-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold leading-tight">{quest.title}</span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-white/85">
              지금 추가하면
              <span className="inline-flex items-center gap-0.5 font-bold text-white">
                <PointIcon size={11} />+{quest.points.toLocaleString()}
              </span>
              포인트!
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/70" />
        </DialogTrigger>
      ) : (
        <DialogTrigger className="flex w-full items-center gap-2 rounded-xl bg-primary/10 px-2.5 py-2 text-left transition-colors hover:bg-primary/15 active:scale-[0.98]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <BookmarkPlus className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-medium leading-tight text-ink-900">{quest.title}</span>
            <span className="block truncate text-[11px] leading-tight text-ink-500">
              {quest.description}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-primary">
            <PointIcon size={10} />+{quest.points.toLocaleString()}
          </span>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookmarkPlus className="h-4 w-4 text-primary" />
            예견 바로가기 추가하기
          </DialogTitle>
          <DialogDescription>
            {claimed ? (
              <>이미 보상을 받은 계정이에요. 바로가기는 아래 안내로 계속 추가할 수 있습니다.</>
            ) : (
              <>
                바로가기를 추가하면{' '}
                <span className="font-semibold text-primary">
                  +{quest.points.toLocaleString()} 포인트
                </span>
                를 드립니다. (1회 한정)
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-ink-700">
          {platform === 'desktop' && installPrompt && (
            <div className="flex items-start gap-3 rounded-xl bg-ink-100/40 p-3">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
              <p className="leading-relaxed">
                아래 버튼을 누르면 예견 앱이 <span className="font-semibold">바탕화면에 바로 설치</span>
                됩니다.
              </p>
            </div>
          )}

          {platform === 'desktop' && !installPrompt && (
            <div className="flex items-start gap-3 rounded-xl bg-ink-100/40 p-3">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
              <p className="leading-relaxed">
                키보드에서{' '}
                <kbd className="rounded border border-ink-300 bg-canvas-0 px-1.5 py-0.5 text-xs font-semibold">
                  Ctrl
                </kbd>
                {' + '}
                <kbd className="rounded border border-ink-300 bg-canvas-0 px-1.5 py-0.5 text-xs font-semibold">
                  D
                </kbd>{' '}
                (Mac은{' '}
                <kbd className="rounded border border-ink-300 bg-canvas-0 px-1.5 py-0.5 text-xs font-semibold">
                  ⌘ + D
                </kbd>
                )를 눌러 예견을 북마크에 추가하세요.{' '}
                <span className="text-ink-500">
                  지금 보고 있는 페이지가 저장되므로, 메인페이지에서 눌러야 메인이 북마크됩니다.
                </span>
              </p>
            </div>
          )}

          {platform === 'ios' && (
            <div className="flex items-start gap-3 rounded-xl bg-ink-100/40 p-3">
              <Share className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
              <p className="leading-relaxed">
                Safari 하단의 <span className="font-semibold">공유 버튼</span>을 누른 뒤{' '}
                <span className="font-semibold">&lsquo;홈 화면에 추가&rsquo;</span>를 선택하면 예견
                아이콘이 홈 화면에 생깁니다.
              </p>
            </div>
          )}

          {platform === 'android' && (
            <div className="flex items-start gap-3 rounded-xl bg-ink-100/40 p-3">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
              <p className="leading-relaxed">
                {installPrompt
                  ? '아래 버튼을 눌러 예견을 홈 화면에 바로 추가할 수 있습니다.'
                  : '브라우저 메뉴에서 ‘홈 화면에 추가’를 선택하면 예견 아이콘이 홈 화면에 생깁니다.'}
              </p>
            </div>
          )}

          {/* 수동 추가 경로(Ctrl+D, iOS 공유)는 현재 페이지가 저장되므로 메인 이동 버튼 제공 */}
          {pathname !== '/' &&
            ((platform === 'desktop' && !installPrompt) || platform === 'ios') && (
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full gap-1.5"
              >
                <Home className="h-4 w-4" />
                메인페이지로 이동해서 추가하기
              </Button>
            )}

          {installPrompt && (
            <Button onClick={handleInstallClick} disabled={submitting} className="w-full gap-1.5">
              {platform === 'desktop' ? (
                <>
                  <Monitor className="h-4 w-4" />
                  바탕화면에 앱 설치하기
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  홈 화면에 추가하기
                </>
              )}
            </Button>
          )}

          {/* 보상 버튼은 아직 보상을 받지 않은 계정에만 노출 (수령 여부 조회 중에는 숨김) */}
          {claimed === false && (
            <Button
              onClick={claimReward}
              disabled={submitting}
              variant={installPrompt ? 'outline' : 'default'}
              className="w-full gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  추가 완료! 보상 받기
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
