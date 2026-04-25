'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
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

interface LogEntry {
  id: string
  action: string
  target_type: string
  target_id: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  created_at: string
  admin: { id: string; username: string; display_name: string } | null
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: '유저',
  market: '마켓',
  comment: '댓글',
  category: '카테고리',
  report: '신고',
  announcement: '공지',
  setting: '설정',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [targetTypeFilter, setTargetTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [openDetail, setOpenDetail] = useState<string | null>(null)

  const limit = 30

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        target_type: targetTypeFilter,
      })
      const res = await fetch(`/api/admin/logs?${params}`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.data)
        setTotal(data.meta.total)
      } else {
        toast.error(data.error ?? '로그 조회 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, targetTypeFilter])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">관리 로그</h1>

      <div className="flex items-center gap-3">
        <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 대상</SelectItem>
            {Object.entries(TARGET_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-ink-500">총 {total.toLocaleString()}건</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">시각</TableHead>
              <TableHead className="w-28">관리자</TableHead>
              <TableHead className="w-20">대상 유형</TableHead>
              <TableHead className="w-44">액션</TableHead>
              <TableHead>대상 ID</TableHead>
              <TableHead className="w-20">상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-400">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-400">
                  로그가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow>
                    <TableCell>
                      <span className="text-xs text-ink-500">{formatDateTime(log.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-700">
                        {log.admin?.display_name ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink-200/50 text-ink-700">
                        {TARGET_TYPE_LABELS[log.target_type] ?? log.target_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-ink-600">{log.action}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-ink-400">
                        {log.target_id.length > 16 ? `${log.target_id.slice(0, 16)}…` : log.target_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => setOpenDetail(openDetail === log.id ? null : log.id)}
                      >
                        {openDetail === log.id ? '닫기' : '보기'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {openDetail === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-canvas-100 py-3">
                        <div className="grid md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="font-medium text-ink-600 mb-1">변경 전</div>
                            <pre className="p-2 bg-canvas-0 border rounded overflow-auto max-h-48 text-ink-700">
                              {log.before_data ? JSON.stringify(log.before_data, null, 2) : '(없음)'}
                            </pre>
                          </div>
                          <div>
                            <div className="font-medium text-ink-600 mb-1">변경 후</div>
                            <pre className="p-2 bg-canvas-0 border rounded overflow-auto max-h-48 text-ink-700">
                              {log.after_data ? JSON.stringify(log.after_data, null, 2) : '(없음)'}
                            </pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
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
    </div>
  )
}
