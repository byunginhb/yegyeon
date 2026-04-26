'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { CategoryIcon } from '@/lib/categoryIcon'

export interface MarketOption {
  id: string
  text: string
  probability: number
  total_amount: number
  sort_order: number
}

export interface MarketDetail {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  is_hidden: boolean
  slug: string
  tags: string[] | null
  close_date: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolution: string | null
  resolution_criteria: string | null
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  yes_probability: number
  yes_amount: number
  no_amount: number
  total_volume: number
  unique_traders: number
  comment_count: number
  min_value: number | null
  max_value: number | null
  unit: string | null
  creator: { id: string; username: string; display_name: string; avatar_url: string | null } | null
  category: { id: number; name: string; slug: string; icon: string } | null
  options: MarketOption[]
}

interface Props {
  marketId: string | null
  marketIds?: string[]
  prefetchedData?: MarketDetail | null
  onClose: () => void
  onActionSuccess: () => void
  onNavigate?: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  binary: '이진',
  multiple_choice: '객관식',
  numeric: '숫자',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '승인 대기',
  open: '진행 중',
  closed: '마감',
  resolved: '종료됨',
  rejected: '거절됨',
  cancelled: '취소됨',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700',
  open: 'bg-teal-500/10 text-teal-700',
  closed: 'bg-ink-200 text-ink-600',
  resolved: 'bg-brand-500/10 text-brand-700',
  rejected: 'bg-scarlet-500/10 text-scarlet-700',
  cancelled: 'bg-ink-200 text-ink-600',
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-ink-100 last:border-0">
      <span className="text-xs text-ink-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-ink-800 flex-1 break-all">{value ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="bg-canvas-50 rounded-lg px-3 py-1">{children}</div>
    </div>
  )
}

function CopyValue({ value }: { value: string }) {
  function copy() {
    navigator.clipboard.writeText(value).then(() => toast.success('복사됨'))
  }
  return (
    <span className="flex items-center gap-1 group">
      <span className="font-mono">{value}</span>
      <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Copy className="h-3 w-3 text-ink-400 hover:text-ink-700" />
      </button>
    </span>
  )
}

export default function MarketDetailDialog({
  marketId,
  marketIds = [],
  prefetchedData,
  onClose,
  onActionSuccess,
  onNavigate,
}: Props) {
  const [fetchedDetail, setFetchedDetail] = useState<MarketDetail | null>(null)
  const [detailOverride, setDetailOverride] = useState<MarketDetail | null>(null)
  const detail = detailOverride ?? (prefetchedData?.id === marketId ? prefetchedData : fetchedDetail)

  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const currentIndex = marketId ? marketIds.indexOf(marketId) : -1

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true)
    setFetchedDetail(null)
    setDetailOverride(null)
    setRejectMode(false)
    setRejectReason('')
    try {
      const res = await fetch(`/api/admin/markets/${id}`)
      const json = await res.json()
      if (json.success) {
        setFetchedDetail(json.data.market)
      } else {
        toast.error(json.error ?? '마켓 정보를 불러오지 못했습니다.')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!marketId) return
    setDetailOverride(null)
    if (prefetchedData?.id === marketId) {
      setLoading(false)
      setRejectMode(false)
      setRejectReason('')
    } else {
      fetchDetail(marketId)
    }
  }, [marketId, prefetchedData, fetchDetail])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!marketId) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') { onClose(); return }

      if (onNavigate && marketIds.length > 0) {
        if (e.key === 'j' || e.key === 'ArrowRight') {
          const next = marketIds[currentIndex + 1]
          if (next) onNavigate(next)
        }
        if (e.key === 'k' || e.key === 'ArrowLeft') {
          const prev = marketIds[currentIndex - 1]
          if (prev) onNavigate(prev)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [marketId, marketIds, currentIndex, onClose, onNavigate])

  async function handleApprove() {
    if (!detail) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`"${detail.title}" 승인되었습니다.`)
        onActionSuccess()
        onClose()
      } else {
        toast.error(json.error ?? '승인 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!detail || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`"${detail.title}" 거절되었습니다.`)
        onActionSuccess()
        onClose()
      } else {
        toast.error(json.error ?? '거절 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleHideToggle() {
    if (!detail) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hide', is_hidden: !detail.is_hidden }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(detail.is_hidden ? '숨김이 해제되었습니다.' : '마켓이 숨겨졌습니다.')
        setDetailOverride({ ...detail, is_hidden: !detail.is_hidden })
        onActionSuccess()
      } else {
        toast.error(json.error ?? '처리 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Dialog open={!!marketId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[90vw] max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-ink-200 sticky top-0 bg-canvas-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {detail && (
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[detail.status] ?? 'bg-ink-100 text-ink-600'}`}>
                    {STATUS_LABELS[detail.status] ?? detail.status}
                  </span>
                  <span className="text-xs text-ink-400 bg-canvas-100 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[detail.type] ?? detail.type}
                  </span>
                  {detail.is_hidden && (
                    <span className="text-xs bg-scarlet-500/10 text-scarlet-600 px-2 py-0.5 rounded-full">
                      숨김
                    </span>
                  )}
                </div>
              )}
              <DialogTitle className="text-base font-semibold text-ink-900 leading-snug pr-4">
                {loading ? '불러오는 중...' : (detail?.title ?? '마켓 상세')}
              </DialogTitle>
            </div>

            {/* 목록 내비게이션 */}
            {marketIds.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7"
                  disabled={currentIndex <= 0}
                  onClick={() => onNavigate?.(marketIds[currentIndex - 1])}
                  title="이전 마켓 (K / ←)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-ink-400 tabular-nums w-12 text-center">
                  {currentIndex + 1} / {marketIds.length}
                </span>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7"
                  disabled={currentIndex >= marketIds.length - 1}
                  onClick={() => onNavigate?.(marketIds[currentIndex + 1])}
                  title="다음 마켓 (J / →)"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
            </div>
          ) : !detail ? null : (
            <>
              {/* 기본 정보 */}
              <Section title="기본 정보">
                <Row label="ID" value={<CopyValue value={detail.id} />} />
                <Row label="슬러그" value={<CopyValue value={detail.slug} />} />
                <Row label="카테고리" value={detail.category ? (
                  <span className="flex items-center gap-1.5">
                    <CategoryIcon slug={detail.category.slug} className="h-3 w-3" />
                    <span>{detail.category.name}</span>
                  </span>
                ) : null} />
                <Row label="태그" value={detail.tags?.length ? detail.tags.join(', ') : null} />
                <Row label="마감일" value={fmt(detail.close_date)} />
                <Row label="생성일" value={fmt(detail.created_at)} />
                <Row label="수정일" value={fmt(detail.updated_at)} />
              </Section>

              {/* 생성자 */}
              <Section title="생성자">
                <Row label="표시 이름" value={detail.creator?.display_name ?? '(삭제된 사용자)'} />
                <Row label="사용자명" value={
                  detail.creator ? (
                    <Link href={`/admin/users/${detail.creator.id}`} className="text-primary hover:underline" target="_blank">
                      @{detail.creator.username}
                    </Link>
                  ) : '—'
                } />
              </Section>

              {/* 마켓 본문 */}
              <Section title="마켓 본문">
                <Row label="설명" value={
                  detail.description
                    ? <span className="whitespace-pre-wrap">{detail.description}</span>
                    : null
                } />
                <Row label="결과 기준" value={
                  detail.resolution_criteria
                    ? <span className="whitespace-pre-wrap">{detail.resolution_criteria}</span>
                    : null
                } />
                {detail.type === 'numeric' && (
                  <>
                    <Row label="최솟값" value={detail.min_value?.toLocaleString()} />
                    <Row label="최댓값" value={detail.max_value?.toLocaleString()} />
                    <Row label="단위" value={detail.unit} />
                  </>
                )}
                {detail.type === 'multiple_choice' && detail.options.length > 0 && (
                  <Row label="선택지" value={
                    <div className="space-y-1">
                      {detail.options
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span>{opt.text}</span>
                            <span className="text-ink-400">({Math.round(opt.probability * 100)}%)</span>
                          </div>
                        ))}
                    </div>
                  } />
                )}
                {detail.type === 'binary' && (
                  <Row label="YES 확률" value={`${Math.round(detail.yes_probability * 100)}%`} />
                )}
              </Section>

              {/* 통계 (pending 외) */}
              {detail.status !== 'pending' && (
                <Section title="베팅 통계">
                  <Row label="총 거래량" value={`${detail.total_volume.toLocaleString()} 포인트`} />
                  <Row label="참여자" value={`${detail.unique_traders.toLocaleString()}명`} />
                  <Row label="댓글" value={`${detail.comment_count}개`} />
                  {detail.type === 'binary' && (
                    <>
                      <Row label="YES 풀" value={`${detail.yes_amount.toLocaleString()} 포인트`} />
                      <Row label="NO 풀" value={`${detail.no_amount.toLocaleString()} 포인트`} />
                    </>
                  )}
                </Section>
              )}

              {/* 관리 이력 */}
              <Section title="관리 이력">
                <Row label="숨김 여부" value={detail.is_hidden ? '숨김' : '공개'} />
                <Row label="검토자 ID" value={detail.reviewed_by} />
                <Row label="검토일시" value={fmt(detail.reviewed_at)} />
                <Row label="거절 사유" value={detail.rejection_reason} />
                <Row label="종료일시" value={fmt(detail.resolved_at)} />
                <Row label="종료 결과" value={detail.resolution} />
              </Section>

              {/* 거절 사유 입력 (rejectMode) */}
              {rejectMode && (
                <div className="mb-4 p-3 bg-scarlet-50 border border-scarlet-200 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-scarlet-700">거절 사유 (필수)</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
                    placeholder="마켓 생성자에게 표시될 거절 사유를 입력하세요."
                    rows={3}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-400">{rejectReason.length} / 500</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setRejectMode(false)} disabled={actionLoading}>
                        취소
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        disabled={!rejectReason.trim() || actionLoading}
                        onClick={handleReject}
                      >
                        {actionLoading ? '처리 중...' : '거절 확정'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-ink-200">
                {/* pending 전용 액션 */}
                {detail.status === 'pending' && !rejectMode && (
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-scarlet-400 text-scarlet-600 hover:bg-scarlet-50"
                      onClick={() => setRejectMode(true)}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      거절
                    </Button>
                  </>
                )}

                {/* 숨김 토글 (open/closed/resolved) */}
                {['open', 'closed', 'resolved'].includes(detail.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleHideToggle}
                    disabled={actionLoading}
                  >
                    {detail.is_hidden
                      ? <><Eye className="h-3.5 w-3.5" /> 숨김 해제</>
                      : <><EyeOff className="h-3.5 w-3.5" /> 숨기기</>
                    }
                  </Button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <Link href={`/admin/markets/${detail.id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                      전체 관리
                    </Button>
                  </Link>
                  <Link href={`/market/${detail.id}`} target="_blank">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-ink-500">
                      <ExternalLink className="h-3.5 w-3.5" />
                      사용자 화면
                    </Button>
                  </Link>
                </div>
              </div>

              {marketIds.length > 1 && (
                <p className="text-xs text-ink-400 mt-3 text-center">
                  J/→ 다음 · K/← 이전 · Esc 닫기
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
