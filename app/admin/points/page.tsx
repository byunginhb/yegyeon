'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PointTransaction {
  id: string
  type: string
  amount: number
  balance: number
  note: string | null
  created_at: string
  user: { id: string; username: string; display_name: string } | null
}

interface Meta {
  total: number
  page: number
  limit: number
  hasMore: boolean
  todayBonusTotal: number
  todayBetsTotal: number
}

const TYPE_LABELS: Record<string, string> = {
  signup_bonus: '가입 보너스',
  bet_placed: '예측',
  bet_won: '예측 승리',
  bet_refund: '예측 환급',
  admin_adjust: '관리자 조정',
  resolution: '마켓 정산',
  market_created: '마켓 생성',
}

const TYPE_BADGE: Record<string, string> = {
  signup_bonus: 'bg-teal-500/10 text-teal-700',
  bet_placed: 'bg-ink-200/50 text-ink-600',
  bet_won: 'bg-teal-500/10 text-teal-700',
  bet_refund: 'bg-ink-200/50 text-ink-600',
  admin_adjust: 'bg-brand-500/10 text-brand-600',
  resolution: 'bg-teal-500/10 text-teal-700',
  market_created: 'bg-ink-200/50 text-ink-600',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminPointsPage() {
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const limit = 20

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        type: typeFilter,
      })
      const res = await fetch(`/api/admin/points?${params}`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data)
        setMeta(data.meta)
      } else {
        toast.error(data.error ?? '포인트 내역 로드 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const totalPages = meta ? Math.ceil(meta.total / limit) : 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">포인트 관리</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ink-600">오늘 지급된 보너스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {(meta?.todayBonusTotal ?? 0).toLocaleString()}포인트
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ink-600">오늘 예측 총액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink-900">
              {(meta?.todayBetsTotal ?? 0).toLocaleString()}포인트
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3">
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v ?? 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 타입</SelectItem>
            <SelectItem value="signup_bonus">가입 보너스</SelectItem>
            <SelectItem value="bet_placed">예측</SelectItem>
            <SelectItem value="resolution">마켓 정산</SelectItem>
            <SelectItem value="admin_adjust">관리자 조정</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-ink-500">총 {(meta?.total ?? 0).toLocaleString()}건</span>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유저</TableHead>
              <TableHead className="w-28">타입</TableHead>
              <TableHead className="w-28 text-right">금액</TableHead>
              <TableHead className="w-28 text-right">잔액</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-36">시간</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-ink-200 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-400">
                  거래 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium text-ink-900">
                        {tx.user?.display_name ?? '알 수 없음'}
                      </span>
                      {tx.user && (
                        <span className="text-xs text-ink-400 ml-1">@{tx.user.username}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[tx.type] ?? 'bg-ink-200/50 text-ink-600'}`}
                    >
                      {TYPE_LABELS[tx.type] ?? tx.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`text-sm font-medium ${tx.amount >= 0 ? 'text-teal-600' : 'text-scarlet-500'}`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}포인트
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-ink-600">
                    {tx.balance.toLocaleString()}포인트
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-500 line-clamp-1">{tx.note ?? '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-400">{formatDateTime(tx.created_at)}</span>
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
    </div>
  )
}
