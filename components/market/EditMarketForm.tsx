'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { CategoryIcon } from '@/lib/categoryIcon'
import MarketImagePicker from './MarketImagePicker'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category, Market } from '@/types'

interface Props {
  market: Market
  categories: Category[]
}

interface FormState {
  title: string
  description: string
  thumbnail_url: string | null
  category_id: string
  resolution_criteria: string
  tags: string[]
}

export default function EditMarketForm({ market, categories }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState<FormState>({
    title: market.title ?? '',
    description: market.description ?? '',
    thumbnail_url: market.thumbnail_url ?? null,
    category_id: market.category_id != null ? String(market.category_id) : '',
    resolution_criteria: market.resolution_criteria ?? '',
    tags: market.tags ?? [],
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function addTag() {
    const trimmed = tagInput.trim().replace(/^#/, '')
    if (!trimmed) return
    if (form.tags.includes(trimmed)) {
      setTagInput('')
      return
    }
    if (form.tags.length >= 10) {
      setError('태그는 최대 10개까지 입력할 수 있습니다.')
      return
    }
    if (trimmed.length > 40) {
      setError('태그는 40자 이내로 입력해주세요.')
      return
    }
    update('tags', [...form.tags, trimmed])
    setTagInput('')
  }

  function removeTag(tag: string) {
    update('tags', form.tags.filter((t) => t !== tag))
  }

  function validate(): string | null {
    if (!form.title.trim() || form.title.trim().length < 5)
      return '마켓 제목은 5자 이상이어야 합니다.'
    if (form.title.length > 200) return '제목은 200자 이하로 입력해주세요.'
    if (!form.category_id) return '카테고리를 선택해주세요.'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        thumbnail_url: form.thumbnail_url,
        category_id: parseInt(form.category_id, 10),
        resolution_criteria: form.resolution_criteria.trim() || null,
        tags: form.tags,
      }

      const res = await fetch(`/api/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '마켓 수정에 실패했습니다.')
        return
      }

      router.push(`/market/${market.id}`)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-ink-1000 mb-2">마켓 정보 수정</h1>
      <p className="text-sm text-ink-500 mb-8">
        제목·설명·카테고리·이미지·태그·결과 기준만 수정할 수 있어요.
        마켓 유형이나 마감일, 선택지 같은 베팅 관련 설정은 바꿀 수 없습니다.
      </p>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-ink-800 font-medium">
            마켓 제목 <span className="text-scarlet-500">*</span>
          </Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            maxLength={200}
            className="h-10"
          />
          <p className="text-xs text-ink-500 text-right">{form.title.length}/200</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-ink-800 font-medium">
            설명 <span className="text-ink-400 font-normal">(선택)</span>
          </Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="마켓에 대한 추가 설명을 입력하세요."
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-ink-800 font-medium">
            썸네일 이미지 <span className="text-ink-400 font-normal">(선택)</span>
          </Label>
          <div className="rounded-lg border border-ink-200 bg-canvas-0 p-3">
            <MarketImagePicker
              value={form.thumbnail_url}
              onChange={(url) => update('thumbnail_url', url)}
              kind="thumbnail"
              size="lg"
              label="마켓 카드와 상세 페이지에 표시됩니다."
            />
            <p className="text-xs text-ink-400 mt-2">
              이미지를 넣지 않으면 예견 로고가 기본으로 표시됩니다.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-ink-800 font-medium">
            카테고리 <span className="text-scarlet-500">*</span>
          </Label>
          <Select
            value={form.category_id}
            onValueChange={(val) => update('category_id', val ?? '')}
          >
            <SelectTrigger className="h-10 w-full">
              {form.category_id ? (
                (() => {
                  const selected = categories.find((c) => String(c.id) === form.category_id)
                  return selected ? (
                    <span className="flex items-center gap-1.5 text-sm flex-1">
                      <CategoryIcon slug={selected.slug} className="h-3.5 w-3.5 shrink-0" />
                      <span>{selected.name}</span>
                    </span>
                  ) : (
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  )
                })()
              ) : (
                <SelectValue placeholder="카테고리를 선택하세요" />
              )}
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  <CategoryIcon slug={cat.slug} className="h-3.5 w-3.5 shrink-0" />
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resolution_criteria" className="text-ink-800 font-medium">
            결과 확인 기준 <span className="text-ink-400 font-normal">(선택)</span>
          </Label>
          <textarea
            id="resolution_criteria"
            value={form.resolution_criteria}
            onChange={(e) => update('resolution_criteria', e.target.value)}
            placeholder="이 마켓의 결과를 어떻게 판단할지 명확하게 설명해주세요."
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-ink-800 font-medium">
            태그 <span className="text-ink-400 font-normal">(선택 · 최대 10개)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="태그 입력 후 Enter"
              maxLength={40}
              className="h-10 flex-1"
            />
            <Button type="button" variant="ghost" onClick={addTag}>
              추가
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-canvas-100 border border-ink-200 text-ink-600"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-ink-400 hover:text-scarlet-500"
                    aria-label={`${tag} 태그 제거`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-scarlet-500/10 border border-scarlet-500/30 text-scarlet-600 dark:text-scarlet-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between mt-8 pt-6 border-t border-ink-200">
        <Link
          href={`/market/${market.id}`}
          className={buttonVariants({ variant: 'ghost' })}
        >
          취소
        </Link>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="min-w-24"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )
}
