'use client'

import { FormEvent, useState, useSyncExternalStore } from 'react'
import { ExternalLink, Link2, Play, Plus } from 'lucide-react'
import type { TeslaVideo } from '@/types/tesla'
import { parseYouTubeVideoId } from './tesla-utils'
import styles from './TeslaHoguPage.module.css'

const STORAGE_KEY = 'tesla-hogu:last-youtube'
const STORAGE_EVENT = 'tesla-hogu:youtube-storage'

function subscribeSavedUrl(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(STORAGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(STORAGE_EVENT, callback)
  }
}

function getSavedUrl() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function getServerSavedUrl() {
  return ''
}

interface VideoLabProps {
  videos: TeslaVideo[]
}

export default function VideoLab({ videos }: VideoLabProps) {
  const savedUrl = useSyncExternalStore(subscribeSavedUrl, getSavedUrl, getServerSavedUrl)
  const [editedInput, setEditedInput] = useState<string | null>(null)
  const [submittedVideoId, setSubmittedVideoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const input = editedInput ?? savedUrl
  const customVideoId = submittedVideoId ?? parseYouTubeVideoId(savedUrl)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const videoId = parseYouTubeVideoId(input)
    if (!videoId) {
      setError('지원되는 YouTube URL을 입력해 주세요.')
      return
    }

    setError('')
    setSubmittedVideoId(videoId)
    try {
      window.localStorage.setItem(STORAGE_KEY, input.trim())
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch {
      setError('영상은 표시했지만 브라우저 저장소에는 보관하지 못했습니다.')
    }
  }

  const isDuplicate = videos.some((video) => video.embedUrl.includes(customVideoId ?? '__none__'))

  return (
    <section id="videos" className="py-20 sm:py-28">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={styles.sectionNumber}>04 / WATCH & COMPARE</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-5xl">영상으로 팩트 체크</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">기본 영상은 로컬 데이터에서 읽습니다. 붙여넣은 URL은 이 브라우저에 최근 1개만 저장됩니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <label htmlFor="tesla-youtube-url" className="mb-2 block text-xs font-black uppercase tracking-[0.13em] text-zinc-500">YouTube URL 붙여넣기</label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                id="tesla-youtube-url"
                value={input}
                onChange={(event) => setEditedInput(event.target.value)}
                placeholder="https://youtu.be/..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15"
              />
            </div>
            <button type="submit" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400">
              <Plus className="h-4 w-4" /> 추가
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-xs font-bold text-red-400">{error}</p>}
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {videos.map((video) => (
          <article key={video.id} className={`${styles.panel} overflow-hidden`}>
            <div className={styles.videoFrame}>
              <iframe
                src={video.embedUrl}
                title={`${video.channel} - ${video.title}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-red-400"><Play className="h-3.5 w-3.5" />{video.channel}</div>
              <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-zinc-100">{video.title}</h3>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">{video.tags.map((tag) => <span key={tag} className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-zinc-500">{tag}</span>)}</div>
                <a href={video.youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube 원문 열기" className="text-zinc-500 transition hover:text-white"><ExternalLink className="h-4 w-4" /></a>
              </div>
            </div>
          </article>
        ))}

        {customVideoId && !isDuplicate && (
          <article className={`${styles.panel} overflow-hidden ring-1 ring-red-500/50`}>
            <div className={styles.videoFrame}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${customVideoId}`}
                title="사용자가 추가한 YouTube 영상"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <div className="mb-2 text-xs font-bold text-red-400">내 브라우저 · 최근 URL</div>
              <h3 className="text-sm font-bold text-zinc-100">직접 추가한 Tesla 영상</h3>
              <a
                href={`https://www.youtube.com/watch?v=${customVideoId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 transition hover:text-white"
              >
                YouTube 원문 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}
