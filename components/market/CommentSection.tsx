'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageCircle, CornerDownRight } from 'lucide-react'
import type { Comment, CommentPosition } from '@/types'
import { ReportButton } from '@/components/common/ReportButton'
import PointIcon from '@/components/ui/PointIcon'
import { cn } from '@/lib/utils'

interface Props {
  marketId: string
  isLoggedIn: boolean
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function isOptimistic(id: string): boolean {
  return id.startsWith('optimistic-')
}

export default function CommentSection({ marketId, isLoggedIn }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 답글 작성 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?market_id=${marketId}`)
      const json = await res.json()
      if (json.success) setComments(json.data)
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // flat 리스트에서 스레드 구조 파생 — 최상위는 최신순, 답글은 시간순
  const topLevel = useMemo(
    () =>
      comments
        .filter((c) => !c.parent_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [comments]
  )
  const repliesByParent = useMemo(() => {
    const map: Record<string, Comment[]> = {}
    for (const c of comments) {
      if (c.parent_id) (map[c.parent_id] ??= []).push(c)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.created_at.localeCompare(b.created_at))
    }
    return map
  }, [comments])

  // 댓글/답글 공통 등록 로직 — 낙관적 업데이트 후 서버 응답으로 교체.
  // 성공 시 null, 실패 시 에러 메시지를 반환한다.
  const postComment = useCallback(
    async (text: string, parentId: string | null): Promise<string | null> => {
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const optimistic: Comment = {
        id: optimisticId,
        market_id: marketId,
        user_id: '',
        parent_id: parentId,
        content: text,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        embed_url: null,
        embed_title: null,
        embed_description: null,
        embed_image: null,
        user: undefined,
        author_position: null,
      }
      setComments((prev) => [...prev, optimistic])

      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market_id: marketId, content: text, parent_id: parentId }),
        })
        const json = await res.json()
        if (!json.success) {
          setComments((prev) => prev.filter((c) => c.id !== optimisticId))
          return json.error ?? '댓글 등록에 실패했습니다'
        }
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticId ? (json.data as Comment) : c))
        )
        return null
      } catch {
        setComments((prev) => prev.filter((c) => c.id !== optimisticId))
        return '댓글 등록에 실패했습니다'
      }
    },
    [marketId]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)
    setContent('')

    const err = await postComment(trimmed, null)
    if (err) {
      setError(err)
      setContent(trimmed)
    }
    setSubmitting(false)
  }

  function openReply(parentId: string) {
    setReplyingTo(parentId)
    setReplyContent('')
    setReplyError(null)
  }

  function cancelReply() {
    setReplyingTo(null)
    setReplyContent('')
    setReplyError(null)
  }

  async function handleReplySubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault()
    const trimmed = replyContent.trim()
    if (!trimmed || replySubmitting) return

    setReplySubmitting(true)
    setReplyError(null)

    const err = await postComment(trimmed, parentId)
    if (err) {
      setReplyError(err)
    } else {
      cancelReply()
    }
    setReplySubmitting(false)
  }

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-1000 mb-4">
        <MessageCircle className="h-5 w-5 text-ink-500" />
        댓글 {comments.length > 0 && <span className="text-ink-500 font-normal text-sm">({comments.length})</span>}
      </h2>

      {/* 입력 폼 */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 작성해주세요..."
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-canvas-0 text-ink-900 text-sm placeholder:text-ink-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-ink-400">{content.length}/500</span>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || submitting}
            >
              {submitting ? '등록 중...' : '댓글 등록'}
            </Button>
          </div>
          {error && (
            <p className="mt-1 text-xs text-scarlet-500">{error}</p>
          )}
        </form>
      ) : (
        <a
          href="/auth/login"
          className="mb-6 block px-4 py-3 rounded-xl border border-ink-200 bg-canvas-50 text-sm text-ink-500 text-center hover:border-primary hover:bg-canvas-100 hover:text-ink-700 transition-colors cursor-pointer"
        >
          <span className="text-primary font-medium">로그인</span> 후 댓글 작성이 가능합니다
        </a>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-ink-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-ink-200 rounded" />
                <div className="h-3 w-full bg-ink-200 rounded" />
                <div className="h-3 w-3/4 bg-ink-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="py-10 text-center text-ink-400 text-sm">
          아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
        </div>
      ) : (
        <ul className="space-y-5">
          {topLevel.map((comment) => {
            const replies = repliesByParent[comment.id] ?? []
            return (
              <li key={comment.id}>
                <CommentBody comment={comment} isLoggedIn={isLoggedIn} />

                {/* 답글 토글 + 답글 목록 */}
                <div className="ml-11 mt-1.5">
                  {isLoggedIn && !isOptimistic(comment.id) && (
                    <button
                      type="button"
                      onClick={() =>
                        replyingTo === comment.id ? cancelReply() : openReply(comment.id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-primary transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="h-3 w-3" />
                      {replyingTo === comment.id ? '취소' : '답글'}
                    </button>
                  )}

                  {/* 답글 입력 폼 */}
                  {replyingTo === comment.id && (
                    <form
                      onSubmit={(e) => handleReplySubmit(e, comment.id)}
                      className="mt-2"
                    >
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`${comment.user?.display_name ?? ''}님에게 답글...`}
                        maxLength={500}
                        rows={2}
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-canvas-0 text-ink-900 text-sm placeholder:text-ink-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                      />
                      <div className="flex items-center justify-end gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="text-xs text-ink-400 hover:text-ink-700 transition-colors cursor-pointer px-2 py-1"
                        >
                          취소
                        </button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!replyContent.trim() || replySubmitting}
                        >
                          {replySubmitting ? '등록 중...' : '답글 등록'}
                        </Button>
                      </div>
                      {replyError && (
                        <p className="mt-1 text-xs text-scarlet-500">{replyError}</p>
                      )}
                    </form>
                  )}

                  {/* 답글 목록 */}
                  {replies.length > 0 && (
                    <ul className="mt-2 space-y-3 border-l-2 border-ink-200/50 pl-3">
                      {replies.map((reply) => (
                        <li key={reply.id}>
                          <CommentBody comment={reply} isLoggedIn={isLoggedIn} compact />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function CommentBody({
  comment,
  isLoggedIn,
  compact = false,
}: {
  comment: Comment
  isLoggedIn: boolean
  compact?: boolean
}) {
  return (
    <div className="flex gap-3">
      <Avatar className={cn('shrink-0', compact ? 'h-6 w-6' : 'h-8 w-8')}>
        <AvatarImage src={comment.user?.avatar_url ?? undefined} alt={comment.user?.display_name ?? ''} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {(comment.user?.display_name ?? '?').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-ink-800">
            {comment.user?.display_name ?? '알 수 없음'}
          </span>
          {comment.author_position && (
            <PositionBadge position={comment.author_position} />
          )}
          <span className="text-xs text-ink-400">
            {formatRelativeTime(comment.created_at)}
          </span>
          {isLoggedIn && !isOptimistic(comment.id) && (
            <ReportButton
              type="comment"
              targetId={comment.id}
              targetLabel={comment.content.slice(0, 60)}
              variant="text"
              className="ml-auto"
            />
          )}
        </div>
        <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        {comment.embed_url && (
          <OgCard
            url={comment.embed_url}
            title={comment.embed_title}
            description={comment.embed_description}
            image={comment.embed_image}
          />
        )}
      </div>
    </div>
  )
}

function PositionBadge({ position }: { position: CommentPosition }) {
  const { kind, label, amount } = position
  const style =
    kind === 'yes'
      ? 'bg-teal-500/10 text-teal-600 border-teal-500/20'
      : kind === 'no'
        ? 'bg-scarlet-500/10 text-scarlet-600 border-scarlet-500/20'
        : 'bg-primary/10 text-primary border-primary/20'
  const display = kind === 'yes' ? '예' : kind === 'no' ? '아니오' : label

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        style
      )}
      title={`이 마켓에 ${display} ${amount.toLocaleString()}포인트 베팅`}
    >
      <span className="max-w-[7rem] truncate">{display}</span>
      <span className="inline-flex items-center gap-0.5 tabular-nums opacity-90">
        <PointIcon size={10} />
        {amount.toLocaleString()}
      </span>
    </span>
  )
}

function OgCard({
  url,
  title,
  description,
  image,
}: {
  url: string
  title: string | null
  description: string | null
  image: string | null
}) {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // 잘못된 URL이면 카드 자체를 안 그림
    return null
  }

  const hasMeta = !!(title || description || image)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="mt-2 flex gap-3 rounded-xl border border-ink-200 bg-canvas-0 overflow-hidden hover:border-primary/40 hover:bg-canvas-50 transition-colors max-w-md"
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading="lazy"
          className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 object-cover bg-canvas-100"
        />
      )}
      <div className="flex-1 min-w-0 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-ink-400 truncate">{host}</p>
        {title ? (
          <p className="text-sm font-semibold text-ink-1000 line-clamp-2 mt-0.5">{title}</p>
        ) : (
          <p className="text-sm font-medium text-ink-700 line-clamp-2 mt-0.5 break-all">{url}</p>
        )}
        {description && (
          <p className="text-xs text-ink-500 line-clamp-2 mt-1">{description}</p>
        )}
        {!hasMeta && (
          <p className="text-xs text-ink-400 mt-1">미리보기를 가져올 수 없는 링크예요.</p>
        )}
      </div>
    </a>
  )
}
