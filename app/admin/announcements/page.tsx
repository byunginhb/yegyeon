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

interface Announcement {
  id: string
  title: string
  content: string
  type: 'banner' | 'popup'
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  creator: { id: string; username: string; display_name: string } | null
}

interface FormState {
  title: string
  content: string
  type: 'banner' | 'popup'
  is_active: boolean
  starts_at: string
  ends_at: string
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  type: 'banner',
  is_active: true,
  starts_at: '',
  ends_at: '',
}

function isoToInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const tz = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tz).toISOString().slice(0, 16)
}

function inputValueToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AnnouncementDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  initial: Announcement | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title,
        content: initial.content,
        type: initial.type,
        is_active: initial.is_active,
        starts_at: isoToInputValue(initial.starts_at),
        ends_at: isoToInputValue(initial.ends_at),
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [initial, open])

  async function handleSave() {
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        is_active: form.is_active,
        starts_at: inputValueToIso(form.starts_at),
        ends_at: inputValueToIso(form.ends_at),
      }
      const url = initial ? `/api/admin/announcements/${initial.id}` : '/api/admin/announcements'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(initial ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.')
        onSaved()
        onClose()
      } else {
        toast.error(data.error ?? '저장 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const isValid = form.title.trim() && form.content.trim()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? '공지 수정' : '공지 등록'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="공지 제목"
            />
          </div>
          <div className="space-y-1.5">
            <Label>내용</Label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="공지 내용을 입력하세요."
              className="w-full min-h-32 p-2 border border-border rounded-md text-sm resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>표시 유형</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: (v as 'banner' | 'popup') ?? 'banner' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">배너 (상단)</SelectItem>
                  <SelectItem value="popup">팝업 (모달)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700 pb-2 self-end">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              활성화
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>표시 시작</Label>
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>표시 종료</Label>
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-ink-400">
            시작/종료 시각을 비워두면 기간 제한 없이 활성 상태로 노출됩니다.
          </p>
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

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const data = await res.json()
      if (data.success) setItems(data.data)
      else toast.error(data.error ?? '공지 로드 실패')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('공지가 삭제되었습니다.')
        load()
      } else {
        toast.error(data.error ?? '삭제 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">공지사항 관리</h1>
        <Button
          onClick={() => {
            setEditTarget(null)
            setDialogOpen(true)
          }}
        >
          + 공지 등록
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">유형</TableHead>
              <TableHead>제목</TableHead>
              <TableHead className="w-20">상태</TableHead>
              <TableHead className="w-36">기간</TableHead>
              <TableHead className="w-28">생성일</TableHead>
              <TableHead className="w-32">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-400">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-ink-400">
                  공지가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink-200/50 text-ink-700">
                      {a.type === 'banner' ? '배너' : '팝업'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-ink-900 line-clamp-1">{a.title}</div>
                    <div className="text-xs text-ink-500 line-clamp-1 mt-0.5">{a.content}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.is_active
                          ? 'bg-teal-500/10 text-teal-700'
                          : 'bg-ink-300/30 text-ink-500'
                      }`}
                    >
                      {a.is_active ? '활성' : '비활성'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-ink-500 leading-tight">
                      <div>{formatDateTime(a.starts_at)}</div>
                      <div className="text-ink-400">~ {formatDateTime(a.ends_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-500">{formatDateTime(a.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          setEditTarget(a)
                          setDialogOpen(true)
                        }}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 text-scarlet-500 hover:text-scarlet-600"
                        onClick={() => setDeleteTarget(a)}
                      >
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AnnouncementDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-600 py-2">
            <span className="font-medium">{deleteTarget?.title}</span> 공지를 삭제하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
