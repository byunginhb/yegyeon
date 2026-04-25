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

interface UserDetail {
  user: {
    id: string
    auth_id: string
    username: string
    display_name: string
    email: string
    avatar_url: string | null
    bio: string | null
    points: number
    role: string
    is_banned: boolean
    created_at: string
    updated_at: string
  }
  recentBets: Array<{
    id: string
    outcome: string
    amount: number
    shares: number
    payout: number | null
    created_at: string
    market: { id: string; slug: string | null; title: string; status: string } | null
  }>
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    balance: number
    note: string | null
    created_at: string
  }>
  marketCount: number
}

const TX_LABELS: Record<string, string> = {
  signup_bonus: '가입 보너스',
  bet_placed: '베팅',
  bet_won: '베팅 승리',
  bet_refund: '베팅 환급',
  admin_adjust: '관리자 조정',
  resolution: '마켓 정산',
  market_created: '마켓 생성',
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

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error ?? '유저 조회 실패')
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
      const res = await fetch(`/api/admin/users/${id}`, {
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

  if (loading) {
    return <div className="text-sm text-ink-400">불러오는 중...</div>
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users" className="text-sm text-ink-500 hover:text-ink-700">
          ← 유저 목록
        </Link>
        <p className="text-sm text-ink-400">유저를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const { user, recentBets, recentTransactions, marketCount } = data

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-ink-500 hover:text-ink-700">
          ← 유저 목록
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">
              {user.display_name}
              <span className="ml-2 text-base font-normal text-ink-500">@{user.username}</span>
            </h1>
            <p className="text-sm text-ink-500 mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                patch({ role: user.role === 'admin' ? 'user' : 'admin' }, '역할이 변경되었습니다.')
              }
            >
              {user.role === 'admin' ? '관리자 해제' : '관리자 지정'}
            </Button>
            <Button
              variant={user.is_banned ? 'outline' : 'destructive'}
              onClick={() =>
                patch(
                  { is_banned: !user.is_banned },
                  user.is_banned ? '정지가 해제되었습니다.' : '유저가 정지되었습니다.'
                )
              }
            >
              {user.is_banned ? '정지 해제' : '계정 정지'}
            </Button>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">현재 포인트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">
              {user.points.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">역할</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">
              {user.role === 'admin' ? '관리자' : '일반'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">계정 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${user.is_banned ? 'text-scarlet-500' : 'text-teal-600'}`}>
              {user.is_banned ? '정지됨' : '정상'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-ink-500">생성한 마켓</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-ink-900">{marketCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 베팅</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBets.length === 0 ? (
            <p className="text-sm text-ink-400">베팅 기록이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>마켓</TableHead>
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
                      {bet.market ? (
                        <Link
                          href={`/market/${bet.market.slug ?? bet.market.id}`}
                          className="text-sm text-ink-700 hover:text-brand-600 line-clamp-1"
                        >
                          {bet.market.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-ink-400">(삭제된 마켓)</span>
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
          <CardTitle className="text-base">최근 포인트 트랜잭션</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-ink-400">트랜잭션이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">타입</TableHead>
                  <TableHead className="w-28 text-right">변동</TableHead>
                  <TableHead className="w-28 text-right">잔액</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="w-32">시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <span className="text-xs text-ink-700">{TX_LABELS[tx.type] ?? tx.type}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${tx.amount >= 0 ? 'text-teal-600' : 'text-scarlet-500'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-ink-600">
                      {tx.balance.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-500 line-clamp-1">{tx.note ?? '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-500">{formatDateTime(tx.created_at)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
