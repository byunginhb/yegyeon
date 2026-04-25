'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'banner' | 'popup'
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

const DISMISS_KEY = 'yegyeon:announcement:dismissed'

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function setDismissed(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage unavailable — ignore
  }
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([])
  const [dismissed, setDismissedState] = useState<Set<string>>(new Set())
  const [popupOpen, setPopupOpen] = useState<Announcement | null>(null)

  useEffect(() => {
    setDismissedState(getDismissed())
    fetch('/api/announcements')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setItems(res.data)
      })
      .catch(() => {
        /* silent */
      })
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissedState(next)
    setDismissed(next)
  }

  const visibleBanners = items.filter((a) => a.type === 'banner' && !dismissed.has(a.id))
  const pendingPopup = items.find((a) => a.type === 'popup' && !dismissed.has(a.id)) ?? null

  useEffect(() => {
    if (pendingPopup && !popupOpen) {
      setPopupOpen(pendingPopup)
    }
  }, [pendingPopup, popupOpen])

  return (
    <>
      {visibleBanners.length > 0 && (
        <div className="space-y-1.5 px-4 pt-3 lg:px-6">
          {visibleBanners.map((banner) => (
            <div
              key={banner.id}
              className="relative flex items-start gap-3 rounded-md border border-brand-500/30 bg-brand-500/5 px-3 py-2 pr-8 text-sm"
              role="status"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink-900">{banner.title}</div>
                <p className="text-ink-700 line-clamp-2 text-xs mt-0.5 whitespace-pre-wrap">
                  {banner.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(banner.id)}
                className="absolute right-2 top-2 text-ink-400 hover:text-ink-700"
                aria-label="공지 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!popupOpen}
        onOpenChange={(o) => {
          if (!o && popupOpen) {
            dismiss(popupOpen.id)
            setPopupOpen(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{popupOpen?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-700 whitespace-pre-wrap py-2">{popupOpen?.content}</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
