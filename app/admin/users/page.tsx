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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: string
  username: string
  display_name: string
  email: string
  points: number
  role: string
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface RoleModalProps {
  user: User | null
  onClose: () => void
  onUpdated: () => void
}

function RoleModal({ user, onClose, onUpdated }: RoleModalProps) {
  const [role, setRole] = useState(user?.role ?? 'user')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) setRole(user.role)
  }, [user])

  if (!user) return null

  async function handleSave() {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('역할이 변경되었습니다.')
        onUpdated()
        onClose()
      } else {
        toast.error(data.error ?? '역할 변경 실패')
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
          <DialogTitle>역할 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-ink-700">
            <span className="font-medium">{user.display_name}</span>
            <span className="text-ink-500 ml-1">(@{user.username})</span>
          </p>
          <div className="space-y-1.5">
            <Label>역할</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? 'user')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">일반 유저</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading || role === user.role}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PointsModalProps {
  user: User | null
  onClose: () => void
  onUpdated: () => void
}

function PointsModal({ user, onClose, onUpdated }: PointsModalProps) {
  const [delta, setDelta] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDelta('')
  }, [user])

  if (!user) return null

  const deltaNum = parseFloat(delta)
  const isValid = !isNaN(deltaNum) && deltaNum !== 0

  async function handleSave() {
    if (!user || !isValid) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points_delta: deltaNum }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('포인트가 조정되었습니다.')
        onUpdated()
        onClose()
      } else {
        toast.error(data.error ?? '포인트 조정 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const preview = isValid ? user.points + deltaNum : user.points

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>포인트 직접 수정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-ink-700">
            <span className="font-medium">{user.display_name}</span>
            <span className="text-ink-500 ml-1">— 현재 {user.points.toLocaleString()}포인트</span>
          </p>
          <div className="space-y-1.5">
            <Label>조정 금액 (음수 입력 시 차감)</Label>
            <Input
              type="number"
              placeholder="예: 1000 또는 -500"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </div>
          {isValid && (
            <p className="text-sm text-ink-500">
              조정 후: {preview.toLocaleString()}포인트
              <span className={deltaNum > 0 ? 'text-teal-600 ml-2' : 'text-scarlet-500 ml-2'}>
                ({deltaNum > 0 ? '+' : ''}{deltaNum.toLocaleString()})
              </span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!isValid || loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [pointsTarget, setPointsTarget] = useState<User | null>(null)

  const limit = 20

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      })
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
        setTotal(data.meta.total)
      } else {
        toast.error(data.error ?? '유저 목록 로드 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">유저 관리</h1>

      {/* 검색 */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="이름, 유저네임, 이메일 검색..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-72"
        />
        <span className="text-sm text-ink-500">총 {total.toLocaleString()}명</span>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="w-28 text-right">포인트</TableHead>
              <TableHead className="w-20">역할</TableHead>
              <TableHead className="w-24">가입일</TableHead>
              <TableHead className="w-36">액션</TableHead>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-400">
                  유저가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium text-ink-900">{user.display_name}</span>
                      <span className="text-xs text-ink-400 ml-1">@{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-ink-600">{user.email}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {user.points.toLocaleString()}포인트
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-brand-500/10 text-brand-600'
                          : 'bg-ink-200/50 text-ink-600'
                      }`}
                    >
                      {user.role === 'admin' ? '관리자' : '일반'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-500">{formatDate(user.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => setRoleTarget(user)}
                      >
                        역할
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => setPointsTarget(user)}
                      >
                        포인트
                      </Button>
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

      {/* 모달 */}
      <RoleModal
        user={roleTarget}
        onClose={() => setRoleTarget(null)}
        onUpdated={fetchUsers}
      />
      <PointsModal
        user={pointsTarget}
        onClose={() => setPointsTarget(null)}
        onUpdated={fetchUsers}
      />
    </div>
  )
}
