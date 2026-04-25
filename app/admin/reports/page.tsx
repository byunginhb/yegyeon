'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
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
import { Label } from '@/components/ui/label'

interface Report {
  id: string
  type: 'market' | 'comment' | 'user'
  target_id: string
  reason: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  note: string | null
  reviewed_at: string | null
  created_at: string
  reporter: { id: string; username: string; display_name: string } | null
  reviewer: { id: string; username: string; display_name: string } | null
}

const TYPE_LABELS: Record<Report['type'], string> = {
  market: '마켓',
  comment: '댓글',
  user: '유저',
}

const STATUS_LABELS: Record<Report['status'], string> = {
  pending: '대기 중',
  reviewed: '검토함',
  resolved: '처리 완료',
  dismissed: '기각됨',
}

const STATUS_BADGE: Record<Report['status'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-700',
  reviewed: 'bg-brand-500/10 text-brand-600',
  resolved: 'bg-teal-500/10 text-teal-700',
  dismissed: 'bg-ink-300/30 text-ink-500',
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function targetHref(report: Report): string | null {
  if (report.type === 'market') return `/market/${report.target_id}`
  if (report.type === 'user') return `/profile/${report.target_id}`
  return null
}

function ReviewDialog({
  report,
  onClose,
  onSaved,
}: {
  report: Report | null
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<Report['status']>('reviewed')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (report) {
      setStatus(report.status === 'pending' ? 'reviewed' : report.status)
      setNote(report.note ?? '')
    }
  }, [report])

  if (!report) return null

  async function handleSave() {
    if (!report) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: note.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('신고가 처리되었습니다.')
        onSaved()
        onClose()
      } else {
        toast.error(data.error ?? '처리 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>신고 처리</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-ink-500">타입:</span>{' '}
              <span className="font-medium">{TYPE_LABELS[report.type]}</span>
            </div>
            <div>
              <span className="text-ink-500">신고자:</span>{' '}
              <span>{report.reporter?.display_name ?? '알 수 없음'}</span>
            </div>
            <div>
              <span className="text-ink-500">사유:</span>
              <p className="mt-1 p-2 bg-canvas-100 rounded text-ink-700 text-sm whitespace-pre-wrap">
                {report.reason}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>처리 상태</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Report['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reviewed">검토함</SelectItem>
                <SelectItem value="resolved">처리 완료</SelectItem>
                <SelectItem value="dismissed">기각</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>관리자 메모</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="처리 사유나 메모를 입력하세요."
              className="w-full min-h-20 p-2 border border-border rounded-md text-sm resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [reviewTarget, setReviewTarget] = useState<Report | null>(null)

  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        type: typeFilter,
      })
      const res = await fetch(`/api/admin/reports?${params}`)
      const data = await res.json()
      if (data.success) {
        setReports(data.data)
        setTotal(data.meta.total)
      } else {
        toast.error(data.error ?? '신고 목록 로드 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, typeFilter])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">신고 관리</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">대기 중</SelectItem>
            <SelectItem value="reviewed">검토함</SelectItem>
            <SelectItem value="resolved">처리 완료</SelectItem>
            <SelectItem value="dismissed">기각됨</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 타입</SelectItem>
            <SelectItem value="market">마켓</SelectItem>
            <SelectItem value="comment">댓글</SelectItem>
            <SelectItem value="user">유저</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-ink-500">총 {total.toLocaleString()}건</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">타입</TableHead>
              <TableHead className="w-28">상태</TableHead>
              <TableHead>사유</TableHead>
              <TableHead className="w-28">신고자</TableHead>
              <TableHead className="w-28">대상</TableHead>
              <TableHead className="w-28">접수일</TableHead>
              <TableHead className="w-20">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-ink-400">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-ink-400">
                  신고가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => {
                const href = targetHref(r)
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink-200/50 text-ink-700">
                        {TYPE_LABELS[r.type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-ink-700 line-clamp-2">{r.reason}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-600">
                        {r.reporter?.display_name ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {href ? (
                        <Link href={href} className="text-xs text-brand-600 hover:underline">
                          보기 ↗
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-400 font-mono">{r.target_id.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-500">{formatDateTime(r.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => setReviewTarget(r)}
                      >
                        처리
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <span className="text-sm text-ink-600">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            다음
          </Button>
        </div>
      )}

      <ReviewDialog
        report={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSaved={load}
      />
    </div>
  )
}
