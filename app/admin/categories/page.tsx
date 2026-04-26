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
import { AVAILABLE_ICONS, getCategoryIcon, getCategoryIconByName } from '@/lib/categoryIcon'

interface Category {
  id: number
  name: string
  slug: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

interface CategoryFormState {
  name: string
  slug: string
  icon: string
  color: string
  sort_order: string
  is_active: boolean
}

const EMPTY_FORM: CategoryFormState = {
  name: '',
  slug: '',
  icon: 'Tag',
  color: '#6366f1',
  sort_order: '0',
  is_active: true,
}

function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1 p-2 rounded-lg border border-input bg-background max-h-40 overflow-y-auto">
      {AVAILABLE_ICONS.map(({ name, Icon, label }) => (
        <button
          key={name}
          type="button"
          title={label}
          onClick={() => onChange(name)}
          className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-md transition-colors text-[10px] leading-tight ${
            value === name
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-ink-100 text-ink-600'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </button>
      ))}
    </div>
  )
}

function CategoryDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  initial: Category | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        slug: initial.slug,
        icon: initial.icon,
        color: initial.color,
        sort_order: String(initial.sort_order),
        is_active: initial.is_active,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [initial, open])

  async function handleSave() {
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        icon: form.icon,
        color: form.color.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      const url = initial ? `/api/admin/categories/${initial.id}` : '/api/admin/categories'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(initial ? '카테고리가 수정되었습니다.' : '카테고리가 추가되었습니다.')
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

  const isValid = form.name.trim() && form.slug.trim() && form.icon && form.color.trim()
  const SelectedIcon = getCategoryIconByName(form.icon)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? '카테고리 수정' : '카테고리 추가'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>이름</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 정치/사회"
            />
          </div>
          <div className="space-y-1.5">
            <Label>슬러그</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="politics"
              disabled={!!initial}
            />
          </div>

          {/* 아이콘 피커 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>아이콘</Label>
              <span className="flex items-center gap-1 text-xs text-ink-500 bg-ink-100 px-2 py-0.5 rounded-full">
                <SelectedIcon className="h-3 w-3" />
                {form.icon}
              </span>
            </div>
            <IconPicker value={form.icon} onChange={(name) => setForm({ ...form, icon: name })} />
          </div>

          <div className="space-y-1.5">
            <Label>색상</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-14 h-9 p-1"
              />
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              활성화
            </label>
          </div>
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      const data = await res.json()
      if (data.success) setCategories(data.data)
      else toast.error(data.error ?? '카테고리 로드 실패')
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
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('카테고리가 삭제되었습니다.')
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
        <h1 className="text-2xl font-bold text-ink-900">카테고리 관리</h1>
        <Button
          onClick={() => {
            setEditTarget(null)
            setDialogOpen(true)
          }}
        >
          + 카테고리 추가
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">아이콘</TableHead>
              <TableHead>이름</TableHead>
              <TableHead className="w-32">슬러그</TableHead>
              <TableHead className="w-24">색상</TableHead>
              <TableHead className="w-20 text-right">순서</TableHead>
              <TableHead className="w-20">상태</TableHead>
              <TableHead className="w-32">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-ink-400">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-ink-400">
                  카테고리가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => {
                // icon 필드가 아이콘 이름이면 name-based 조회, 아니면(이모지 등) slug 폴백
                const IconComp = AVAILABLE_ICONS.some(a => a.name === c.icon)
                  ? getCategoryIconByName(c.icon)
                  : getCategoryIcon(c.slug)
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md"
                        style={{ backgroundColor: `${c.color}20` }}
                      >
                        <IconComp className="h-4 w-4" style={{ color: c.color }} />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-ink-900">{c.name}</TableCell>
                    <TableCell className="text-xs text-ink-500 font-mono">{c.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-4 h-4 rounded-sm border border-border"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-xs text-ink-500 font-mono">{c.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-ink-600">{c.sort_order}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.is_active
                            ? 'bg-teal-500/10 text-teal-700'
                            : 'bg-ink-300/30 text-ink-500'
                        }`}
                      >
                        {c.is_active ? '활성' : '비활성'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            setEditTarget(c)
                            setDialogOpen(true)
                          }}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 text-scarlet-500 hover:text-scarlet-600"
                          onClick={() => setDeleteTarget(c)}
                        >
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-600 py-2">
            <span className="font-medium">{deleteTarget?.name}</span> 카테고리를 삭제하시겠습니까?
            연결된 마켓의 카테고리는 비워집니다.
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
