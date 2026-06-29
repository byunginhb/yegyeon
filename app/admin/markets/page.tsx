'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search } from 'lucide-react'
import MarketDetailDialog, { type MarketDetail } from '@/components/admin/MarketDetailDialog'

interface Market {
  id: string
  title: string
  type: string
  status: string
  total_volume: number
  close_date: string
  created_at: string
  creator: { id: string; username: string; display_name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: '승인 대기',
  open: '진행 중',
  closed: '마감',
  resolved: '결과 입력됨',
  cancelled: '취소됨',
  rejected: '거절됨',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  open: 'bg-teal-500/10 text-teal-600',
  closed: 'bg-ink-300/30 text-ink-600',
  resolved: 'bg-brand-500/10 text-brand-600',
  cancelled: 'bg-scarlet-500/10 text-scarlet-600',
  rejected: 'bg-scarlet-500/10 text-scarlet-600',
}

const TYPE_LABELS: Record<string, string> = {
  binary: '이진',
  multiple_choice: '객관식',
  numeric: '숫자',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface MarketOption {
  id: string
  text: string
  probability: number
}

interface ResolveModalProps {
  market: Market | null
  onClose: () => void
  onResolved: () => void
}

function ResolveModal({ market, onClose, onResolved }: ResolveModalProps) {
  const [resolutionValue, setResolutionValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<MarketOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  useEffect(() => {
    setResolutionValue('')
    setOptions([])
    if (market?.type === 'multiple_choice') {
      setOptionsLoading(true)
      fetch(`/api/admin/markets/${market.id}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data?.market?.options) {
            setOptions(
              json.data.market.options
                .slice()
                .sort((a: MarketOption & { sort_order: number }, b: MarketOption & { sort_order: number }) => a.sort_order - b.sort_order)
            )
          }
        })
        .catch(() => {})
        .finally(() => setOptionsLoading(false))
    }
  }, [market])

  if (!market) return null

  async function handleResolve() {
    if (!resolutionValue.trim() || !market) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${market.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_value: resolutionValue.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('결과가 입력되었습니다.')
        onResolved()
        onClose()
      } else {
        toast.error(data.error ?? '결과 입력 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>결과 입력</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-ink-700 line-clamp-2">{market.title}</p>
          {market.type === 'binary' ? (
            <Select value={resolutionValue} onValueChange={(v) => setResolutionValue(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="결과 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YES">YES</SelectItem>
                <SelectItem value="NO">NO</SelectItem>
              </SelectContent>
            </Select>
          ) : market.type === 'multiple_choice' ? (
            optionsLoading ? (
              <div className="text-sm text-ink-400">옵션 불러오는 중...</div>
            ) : (
              <Select value={resolutionValue} onValueChange={(v) => setResolutionValue(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="당첨 옵션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.text} ({Math.round(opt.probability * 100)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <Input
              placeholder="최종 숫자 입력"
              value={resolutionValue}
              onChange={(e) => setResolutionValue(e.target.value)}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!resolutionValue.trim() || loading}
          >
            {loading ? '처리 중...' : '결과 확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
  variant?: 'default' | 'destructive'
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
  variant = 'default',
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-600 py-2">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? '처리 중...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminMarketsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [markets, setMarkets] = useState<Market[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? 'all')
  const [loading, setLoading] = useState(true)

  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Market | null>(null)
  const [closeTarget, setCloseTarget] = useState<Market | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Market | null>(null)
  const [approveTarget, setApproveTarget] = useState<Market | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Market | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const detailCache = useRef<Map<string, MarketDetail>>(new Map())

  const limit = 20

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        search,
      })
      const res = await fetch(`/api/admin/markets?${params}`)
      const data = await res.json()
      if (data.success) {
        setMarkets(data.data)
        setTotal(data.meta.total)
        // 백그라운드에서 마켓 상세 정보 사전 로딩
        for (const m of data.data) {
          if (!detailCache.current.has(m.id)) {
            fetch(`/api/admin/markets/${m.id}`)
              .then((r) => r.json())
              .then((json) => {
                if (json.success) detailCache.current.set(m.id, json.data.market)
              })
              .catch(() => {})
          }
        }
      } else {
        toast.error(data.error ?? '마켓 목록 로드 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  async function handleClose() {
    if (!closeTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${closeTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('마켓이 종료되었습니다.')
        fetchMarkets()
      } else {
        toast.error(data.error ?? '마켓 종료 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
      setCloseTarget(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('마켓이 삭제되었습니다.')
        fetchMarkets()
      } else {
        toast.error(data.error ?? '마켓 삭제 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
      setDeleteTarget(null)
    }
  }

  async function handleApprove() {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${approveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('마켓이 승인되었습니다.')
        fetchMarkets()
      } else {
        toast.error(data.error ?? '승인 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
      setApproveTarget(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('마켓이 거절되었습니다.')
        fetchMarkets()
      } else {
        toast.error(data.error ?? '거절 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">마켓 관리</h1>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="마켓 제목 검색..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-64"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            const next = v ?? 'all'
            setStatusFilter(next)
            setPage(1)
            const params = new URLSearchParams()
            if (next !== 'all') params.set('status', next)
            router.replace(`/admin/markets${params.size ? `?${params}` : ''}`)
          }}
        >
          <SelectTrigger className="w-36">
            <span>{STATUS_LABELS[statusFilter] ?? '전체'}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="pending">승인 대기</SelectItem>
            <SelectItem value="open">진행 중</SelectItem>
            <SelectItem value="closed">마감</SelectItem>
            <SelectItem value="resolved">결과 입력됨</SelectItem>
            <SelectItem value="rejected">거절됨</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-ink-500">총 {total.toLocaleString()}개</span>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead className="w-20">유형</TableHead>
              <TableHead className="w-24">상태</TableHead>
              <TableHead className="w-28 text-right">거래량</TableHead>
              <TableHead className="w-28">생성자</TableHead>
              <TableHead className="w-24">마감일</TableHead>
              <TableHead className="w-24">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-ink-200 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : markets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-ink-400">
                  마켓이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              markets.map((market) => (
                <TableRow key={market.id}>
                  <TableCell>
                    <button
                      onClick={() => setSelectedMarketId(market.id)}
                      className="text-left text-sm font-medium text-ink-900 hover:text-primary transition-colors line-clamp-1 w-full"
                    >
                      {market.title}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-500">
                      {TYPE_LABELS[market.type] ?? market.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[market.status] ?? ''}`}
                    >
                      {STATUS_LABELS[market.status] ?? market.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {market.total_volume.toLocaleString()}포인트
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-600">
                      {market.creator?.display_name ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-500">{formatDate(market.close_date)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1 text-ink-500 hover:text-ink-800"
                        onClick={() => setSelectedMarketId(market.id)}
                      >
                        <Search className="h-3 w-3" />
                        상세
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 p-0 rounded-md text-ink-400 hover:bg-accent hover:text-accent-foreground outline-none"
                          aria-label="더보기"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {market.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                className="text-teal-600 focus:text-teal-700 focus:bg-teal-50 cursor-pointer"
                                onClick={() => setApproveTarget(market)}
                              >
                                승인
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-scarlet-600 focus:text-scarlet-700 focus:bg-scarlet-50 cursor-pointer"
                                onClick={() => {
                                  setRejectTarget(market)
                                  setRejectReason('')
                                }}
                              >
                                거절
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {market.status === 'open' && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setCloseTarget(market)}
                            >
                              마켓 종료
                            </DropdownMenuItem>
                          )}
                          {(market.status === 'open' || market.status === 'closed') && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setResolveTarget(market)}
                            >
                              결과 입력
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-scarlet-600 focus:text-scarlet-700 focus:bg-scarlet-50 cursor-pointer"
                            onClick={() => setDeleteTarget(market)}
                          >
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-ink-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* 모달들 */}
      <ResolveModal
        market={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolved={fetchMarkets}
      />

      <ConfirmModal
        open={!!closeTarget}
        title="마켓 강제 종료"
        description={`"${closeTarget?.title}" 마켓을 강제 종료하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="종료"
        onConfirm={handleClose}
        onClose={() => setCloseTarget(null)}
        loading={actionLoading}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="마켓 삭제"
        description={`"${deleteTarget?.title}" 마켓을 삭제하시겠습니까? 관련 예측 데이터도 함께 삭제됩니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={actionLoading}
      />

      <ConfirmModal
        open={!!approveTarget}
        title="마켓 승인"
        description={`"${approveTarget?.title}" 마켓을 승인하시겠습니까? 승인 후 모든 사용자에게 공개됩니다.`}
        confirmLabel="승인"
        onConfirm={handleApprove}
        onClose={() => setApproveTarget(null)}
        loading={actionLoading}
      />

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
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-ink-400 text-right">{rejectReason.length} / 500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={actionLoading}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
            >
              {actionLoading ? '처리 중...' : '거절 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketDetailDialog
        marketId={selectedMarketId}
        marketIds={markets.map((m) => m.id)}
        prefetchedData={selectedMarketId ? detailCache.current.get(selectedMarketId) ?? null : null}
        onClose={() => setSelectedMarketId(null)}
        onActionSuccess={fetchMarkets}
        onNavigate={setSelectedMarketId}
      />
    </div>
  )
}
