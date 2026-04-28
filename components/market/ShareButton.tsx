'use client'

import { useCallback, useEffect, useState } from 'react'
import { Share2, Link as LinkIcon, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  marketId: string
  marketTitle: string
  className?: string
  onShared?: () => void
  /** 공유 완료 시 daily_share 퀘스트 완료 API를 자동 호출 (기본: true) */
  triggerQuest?: boolean
}

interface KakaoShareLink {
  sendDefault: (params: Record<string, unknown>) => void
}

interface KakaoSDK {
  isInitialized: () => boolean
  init: (key: string) => void
  Share?: KakaoShareLink
  Link?: KakaoShareLink
}

declare global {
  interface Window {
    Kakao?: KakaoSDK
  }
}

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? ''

function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://yegyeon.vercel.app'
}

function buildShareText(marketTitle: string): string {
  return `예견에서 함께 예측해보세요: ${marketTitle}`
}

async function fireDailyShareQuest(): Promise<void> {
  try {
    await fetch('/api/quests/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_type: 'daily_share' }),
    })
  } catch (error) {
    // 퀘스트 실패는 공유 UX를 방해하면 안 되므로 조용히 무시
    console.error('daily_share 퀘스트 트리거 실패:', error)
  }
}

function trySafeNotifyShared(
  onShared: (() => void) | undefined,
  triggerQuest: boolean
) {
  try {
    onShared?.()
  } catch (error) {
    console.error('onShared 콜백 실패:', error)
  }
  if (triggerQuest) {
    void fireDailyShareQuest()
  }
}

function detectNativeShareSupport(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  )
}

function detectKakaoReadyInitial(): boolean {
  if (!KAKAO_APP_KEY) return false
  if (typeof window === 'undefined') return false
  if (!window.Kakao) return false
  if (!window.Kakao.isInitialized()) {
    try {
      window.Kakao.init(KAKAO_APP_KEY)
    } catch (error) {
      console.error('Kakao SDK 초기화 실패:', error)
      return false
    }
  }
  return true
}

export default function ShareButton({
  marketId,
  marketTitle,
  className,
  onShared,
  triggerQuest = true,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [kakaoReady, setKakaoReady] = useState<boolean>(detectKakaoReadyInitial)
  const [canNativeShare] = useState<boolean>(detectNativeShareSupport)

  useEffect(() => {
    if (!KAKAO_APP_KEY) return
    if (typeof window === 'undefined') return
    if (kakaoReady) return

    let cancelled = false

    const handleScriptReady = () => {
      if (cancelled) return
      if (window.Kakao && !window.Kakao.isInitialized()) {
        try {
          window.Kakao.init(KAKAO_APP_KEY)
        } catch (error) {
          console.error('Kakao SDK 초기화 실패:', error)
        }
      }
      setKakaoReady(Boolean(window.Kakao))
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-sdk="true"]'
    )
    if (existing) {
      existing.addEventListener('load', handleScriptReady)
      return () => {
        cancelled = true
        existing.removeEventListener('load', handleScriptReady)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'
    script.async = true
    script.dataset.kakaoSdk = 'true'
    script.onload = handleScriptReady
    script.onerror = () => {
      console.error('Kakao SDK 로드 실패')
    }
    document.head.appendChild(script)

    return () => {
      cancelled = true
      script.removeEventListener('load', handleScriptReady)
    }
  }, [kakaoReady])

  const url = `${getSiteUrl()}/market/${marketId}`
  const shareText = buildShareText(marketTitle)

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      } else {
        throw new Error('clipboard unavailable')
      }
      toast.success('링크 복사됨')
      trySafeNotifyShared(onShared, triggerQuest)
    } catch (error) {
      console.error('링크 복사 실패:', error)
      toast.error('링크 복사에 실패했습니다')
    } finally {
      setOpen(false)
    }
  }, [url, onShared, triggerQuest])

  const handleTwitter = useCallback(() => {
    try {
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(url)}`
      window.open(tweetUrl, '_blank', 'noopener,noreferrer')
      trySafeNotifyShared(onShared, triggerQuest)
    } catch (error) {
      console.error('X 공유 실패:', error)
      toast.error('공유에 실패했습니다')
    } finally {
      setOpen(false)
    }
  }, [shareText, url, onShared, triggerQuest])

  const handleKakao = useCallback(() => {
    try {
      const kakao = window.Kakao
      const sender = kakao?.Share ?? kakao?.Link
      if (!kakao || !sender) {
        void handleCopy()
        return
      }
      sender.sendDefault({
        objectType: 'feed',
        content: {
          title: marketTitle,
          description: shareText,
          imageUrl: `${getSiteUrl()}/yegeon_concept2_128.png`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [
          {
            title: '예견에서 보기',
            link: { mobileWebUrl: url, webUrl: url },
          },
        ],
      })
      trySafeNotifyShared(onShared, triggerQuest)
    } catch (error) {
      console.error('카카오 공유 실패:', error)
      void handleCopy()
    } finally {
      setOpen(false)
    }
  }, [handleCopy, marketTitle, shareText, url, onShared, triggerQuest])

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: marketTitle, text: shareText, url })
      trySafeNotifyShared(onShared, triggerQuest)
    } catch (error) {
      const isAbort =
        error instanceof DOMException && error.name === 'AbortError'
      if (!isAbort) {
        console.error('네이티브 공유 실패:', error)
      }
    } finally {
      setOpen(false)
    }
  }, [marketTitle, shareText, url, onShared, triggerQuest])

  const showKakao = Boolean(KAKAO_APP_KEY) && kakaoReady

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md',
          'text-xs font-medium text-ink-600',
          'hover:bg-canvas-100 hover:text-ink-900 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          className
        )}
        aria-label="마켓 공유"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>공유</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
        {canNativeShare && (
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="h-4 w-4" />
            <span>다른 앱으로 공유</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopy}>
          <LinkIcon className="h-4 w-4" />
          <span>링크 복사</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitter}>
          <span className="inline-flex h-4 w-4 items-center justify-center text-[11px] font-bold">
            X
          </span>
          <span>X에 공유</span>
        </DropdownMenuItem>
        {showKakao && (
          <DropdownMenuItem onClick={handleKakao}>
            <MessageCircle className="h-4 w-4" />
            <span>카카오톡으로 공유</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
