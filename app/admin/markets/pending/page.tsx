'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import MarketDetailDialog from '@/components/admin/MarketDetailDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface PendingMarket {
  id: string
  slug: string
  title: string
  description: string | null
  type: string
  close_date: string
  created_at: string
  creator: { id: string; username: string; display_name: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  binary: '이진',
  multiple_choice: '객관식',
  numeric: '숫자',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function AdminPendingMarketsPage() {
  const [markets, setMarkets] = useState<PendingMarket[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [rejectTarget, setRejectTarget] = useState<PendingMarket | null>(null)
  const [reason, setReason] = useState('')
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)

  const limit = 20

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), status: 'pending' })
      const res = await fetch(`/api/admin/markets?${params}`)
      const data = await res.json()
      if (data.success) {
        setMarkets(data.data)
        setTotal(data.meta.total)
      } else {
        toast.error(data.error ?? '목록 로드 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchMarkets() }, [fetchMarkets])

  async function handleApprove(market: PendingMarket) {
    setActionLoading(market.id)
    try {
      const res = await fetch(`/api/admin/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`"${market.title}" 마켓이 승인되었습니다.`)
        fetchMarkets()
      } else {
        toast.error(data.error ?? '승인 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !reason.trim()) return
    setActionLoading(rejectTarget.id)
    try {
      const res = await fetch(`/api/admin/markets/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: reason.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`"${rejectTarget.title}" 마켓이 거절되었습니다.`)
        setRejectTarget(null)
        setReason('')
        fetchMarkets()
      } else {
        toast.error(data.error ?? '거절 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">승인 대기 마켓</h1>
          <p className="text-sm text-ink-500 mt-1">관리자 검토 후 승인된 마켓만 사용자에게 공개됩니다.</p>
        </div>
        {!loading && (
          <span className="text-sm text-ink-500 bg-amber-500/10 text-amber-700 px-3 py-1 rounded-full font-medium">
            {total.toLocaleString()}개 대기 중
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-ink-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-ink-400 gap-3">
          <Clock className="h-12 w-12 opacity-30" />
          <p className="text-sm">검토 대기 중인 마켓이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {markets.map((market) => (
            <div
              key={market.id}
              className="bg-canvas-0 border border-border rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABELS[market.type] ?? market.type}
                    </span>
                    <span className="text-xs text-ink-400">
                      {market.creator?.display_name ?? '알 수 없음'} · {formatDate(market.created_at)} 생성
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedMarketId(market.id)}
                    className="text-left font-semibold text-ink-900 hover:text-primary transition-colors line-clamp-2 w-full"
                  >
                    {market.title}
                  </button>
                  {market.description && (
                    <p className="text-sm text-ink-500 mt-1 line-clamp-2">{market.description}</p>
                  )}
                  <p className="text-xs text-ink-400 mt-1">마감일: {formatDate(market.close_date)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 px-2 text-xs text-ink-500 hover:text-ink-800 gap-1"
                  onClick={() => setSelectedMarketId(market.id)}
                >
                  <Search className="h-3.5 w-3.5" />
                  상세
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-teal-400 text-teal-600 hover:bg-teal-50"
                  onClick={() => handleApprove(market)}
                  disabled={actionLoading === market.id}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {actionLoading === market.id ? '처리 중...' : '승인'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-scarlet-400 text-scarlet-600 hover:bg-scarlet-50"
                  onClick={() => { setRejectTarget(market); setReason('') }}
                  disabled={actionLoading === market.id}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  거절
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-ink-400 ml-auto"
                  onClick={() => setSelectedMarketId(market.id)}
                >
                  전체 정보 보기
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <span className="text-sm text-ink-600">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            다음
          </Button>
        </div>
      )}

      {/* 거절 사유 모달 */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>마켓 거절</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {rejectTarget && (
              <p className="text-sm text-ink-700 font-medium line-clamp-2">{rejectTarget.title}</p>
            )}
            <p className="text-sm text-ink-600">거절 사유를 입력해주세요. 마켓 생성자에게 표시됩니다.</p>
            <textarea
              placeholder="거절 사유 (최대 500자)"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-ink-400 text-right">{reason.length} / 500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={!!actionLoading}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || !!actionLoading}
            >
              {actionLoading ? '처리 중...' : '거절 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketDetailDialog
        marketId={selectedMarketId}
        marketIds={markets.map((m) => m.id)}
        onClose={() => setSelectedMarketId(null)}
        onActionSuccess={fetchMarkets}
        onNavigate={setSelectedMarketId}
      />
    </div>
  )
}
