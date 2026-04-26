'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MarketDetail {
  market: {
    id: string
    slug: string | null
    title: string
    description: string | null
    type: 'binary' | 'multiple_choice' | 'numeric'
    status: string
    creator_id: string | null
    close_date: string
    resolved_at: string | null
    resolution: string | null
    total_volume: number
    unique_traders: number
    comment_count: number | null
    yes_probability: number
    is_hidden: boolean
    tags: string[]
    created_at: string
    creator: { id: string; username: string; display_name: string; avatar_url: string | null } | null
    category: { id: number; name: string; icon: string; color: string } | null
    options: Array<{ id: string; text: string; color: string; probability: number; total_amount: number; sort_order: number }>
  }
  recentBets: Array<{
    id: string
    outcome: string
    amount: number
    shares: number
    payout: number | null
    created_at: string
    user: { id: string; username: string; display_name: string } | null
  }>
  recentComments: Array<{
    id: string
    content: string
    is_deleted: boolean
    created_at: string
    user: { id: string; username: string; display_name: string } | null
  }>
}

const STATUS_LABELS: Record<string, string> = {
  open: '진행 중',
  closed: '마감',
  resolved: '결과 입력됨',
  cancelled: '취소됨',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminMarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<MarketDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${id}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error ?? '마켓 조회 실패')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function patch(payload: Record<string, unknown>, successMsg: string) {
    try {
      const res = await fetch(`/api/admin/markets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(successMsg)
        load()
      } else {
        toast.error(json.error ?? '실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    }
  }

  if (loading) return <div className="text-sm text-ink-400">불러오는 중...</div>
  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/markets" className="text-sm text-ink-500 hover:text-ink-700">
          ← 마켓 목록
        </Link>
        <p className="text-sm text-ink-400">마켓을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const { market, recentBets, recentComments } = data

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/markets" className="text-sm text-ink-500 hover:text-ink-700">
          ← 마켓 목록
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink-900 leading-snug">{market.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
              {market.category && (
                <span className="inline-flex items-center gap-1">
                  <span>{market.category.icon}</span>
                  <span>{market.category.name}</span>
                </span>
              )}
              <span>·</span>
              <span>{STATUS_LABELS[market.status] ?? market.status}</span>
              <span>·</span>
              <span>마감 {formatDateTime(market.close_date)}</span>
              {market.is_hidden && (
                <>
                  <span>·</span>
                  <span className="text-scarlet-500">숨김 처리됨</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/market/${market.id}`}
              className="text-xs text-brand-600 hover:underline"
              target="_blank"
            >
              사용자 페이지 ↗
            </Link>
            <Button
              variant="outline"
              onClick={() =>
                patch(
                  { is_hidden: !market.is_hidden },
                  market.is_hidden ? '숨김이 해제되었습니다.' : '마켓이 숨김 처리되었습니다.'
                )
              }
            >
              {market.is_hidden ? '숨김 해제' : '숨기기'}
            </Button>
            {market.status === 'open' && (
              <Button
                variant="outline"
                onClick={() => patch({ status: 'closed' }, '마켓이 종료되었습니다.')}
              >
                강제 종료
              </Button>
            )}
          </div>
        </div>
      </div>

      {market.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">설명</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-700 whitespace-pre-wrap">{market.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">총 거래량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">
              {market.total_volume.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">참여자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">{market.unique_traders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">댓글</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">{market.comment_count ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">
              {market.type === 'binary' ? 'YES 확률' : '유형'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">
              {market.type === 'binary'
                ? `${Math.round(market.yes_probability * 100)}%`
                : market.type === 'multiple_choice'
                  ? '객관식'
                  : '숫자'}
            </div>
          </CardContent>
        </Card>
      </div>

      {market.options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">옵션별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {market.options
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span className="flex-1 text-ink-700">{opt.text}</span>
                    <span className="text-ink-500">{Math.round(opt.probability * 100)}%</span>
                    <span className="text-xs text-ink-400 w-24 text-right">
                      {opt.total_amount.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 베팅</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBets.length === 0 ? (
            <p className="text-sm text-ink-400">베팅이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유저</TableHead>
                  <TableHead className="w-20">선택</TableHead>
                  <TableHead className="w-24 text-right">투입</TableHead>
                  <TableHead className="w-24 text-right">지분</TableHead>
                  <TableHead className="w-24 text-right">정산</TableHead>
                  <TableHead className="w-32">시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBets.map((bet) => (
                  <TableRow key={bet.id}>
                    <TableCell>
                      {bet.user ? (
                        <Link
                          href={`/admin/users/${bet.user.id}`}
                          className="text-sm text-ink-700 hover:text-brand-600"
                        >
                          {bet.user.display_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-ink-400">(삭제)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ink-600">{bet.outcome}</TableCell>
                    <TableCell className="text-right text-sm">{bet.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-ink-500">
                      {bet.shares.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {bet.payout != null ? bet.payout.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-500">{formatDateTime(bet.created_at)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 댓글</CardTitle>
        </CardHeader>
        <CardContent>
          {recentComments.length === 0 ? (
            <p className="text-sm text-ink-400">댓글이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {recentComments.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    <span className="text-ink-700 font-medium">
                      {c.user?.display_name ?? '(삭제된 유저)'}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(c.created_at)}</span>
                    {c.is_deleted && (
                      <span className="ml-1 text-scarlet-500">(삭제됨)</span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-ink-700 ${c.is_deleted ? 'line-through opacity-60' : ''}`}>
                    {c.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
