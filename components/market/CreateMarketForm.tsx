'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, BarChart2, List, Hash } from 'lucide-react'
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
import type { Category, MarketType } from '@/types'

interface Props {
  categories: Category[]
}

interface FormState {
  type: MarketType | null
  title: string
  description: string
  category_id: string
  close_date: string
  resolution_criteria: string
  yes_probability: number
  options: string[]
  min_value: string
  max_value: string
  unit: string
}

const MARKET_TYPES: { value: MarketType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'binary',
    label: 'YES / NO',
    desc: '두 가지 결과 중 하나를 예측합니다.',
    icon: <BarChart2 className="h-6 w-6" />,
  },
  {
    value: 'multiple_choice',
    label: '다중 선택',
    desc: '여러 선택지 중 하나의 결과를 예측합니다.',
    icon: <List className="h-6 w-6" />,
  },
  {
    value: 'numeric',
    label: '수치 예측',
    desc: '특정 숫자 범위 안의 값을 예측합니다.',
    icon: <Hash className="h-6 w-6" />,
  },
]

function getTomorrowDatetimeLocal(): string {
  // KST 기준 내일 같은 시각으로 datetime-local 포맷 (YYYY-MM-DDTHH:mm)
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const tz = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tz).toISOString().slice(0, 16)
}

function getMinDatetimeLocal(): string {
  // 최소 1시간 후
  const d = new Date(Date.now() + 60 * 60 * 1000)
  const tz = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tz).toISOString().slice(0, 16)
}

export default function CreateMarketForm({ categories }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    type: null,
    title: '',
    description: '',
    category_id: '',
    close_date: getTomorrowDatetimeLocal(),
    resolution_criteria: '',
    yes_probability: 50,
    options: ['', ''],
    min_value: '',
    max_value: '',
    unit: '',
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  // Step 1 검증
  function validateStep1(): string | null {
    if (!form.type) return '마켓 유형을 선택해주세요.'
    return null
  }

  // Step 2 검증
  function validateStep2(): string | null {
    if (!form.title.trim() || form.title.trim().length < 5)
      return '마켓 제목은 5자 이상이어야 합니다.'
    if (form.title.length > 200) return '제목은 200자 이하로 입력해주세요.'
    if (!form.close_date) return '마감일을 선택해주세요.'
    const close = new Date(form.close_date)
    if (Number.isNaN(close.getTime())) return '마감일 형식이 잘못되었습니다.'
    if (close.getTime() <= Date.now() + 60 * 60 * 1000)
      return '마감일은 최소 1시간 이후여야 합니다.'
    return null
  }

  // Step 3 검증
  function validateStep3(): string | null {
    if (form.type === 'binary') {
      if (form.yes_probability < 1 || form.yes_probability > 99) {
        return '초기 확률은 1%~99% 사이여야 합니다.'
      }
    }
    if (form.type === 'multiple_choice') {
      const filled = form.options.filter(o => o.trim().length > 0)
      if (filled.length < 2) return '선택지는 최소 2개 이상 입력해야 합니다.'
    }
    if (form.type === 'numeric') {
      if (!form.min_value) return '최솟값을 입력해주세요.'
      if (!form.max_value) return '최댓값을 입력해주세요.'
      if (parseFloat(form.min_value) >= parseFloat(form.max_value)) {
        return '최솟값은 최댓값보다 작아야 합니다.'
      }
    }
    return null
  }

  function handleNext() {
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
      setStep(2)
    } else if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
      setStep(3)
    }
  }

  function handleBack() {
    setError(null)
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  function addOption() {
    if (form.options.length >= 8) return
    update('options', [...form.options, ''])
  }

  function removeOption(idx: number) {
    if (form.options.length <= 2) return
    update('options', form.options.filter((_, i) => i !== idx))
  }

  function updateOption(idx: number, value: string) {
    const next = form.options.map((o, i) => (i === idx ? value : o))
    update('options', next)
  }

  async function handleSubmit() {
    const err = validateStep3()
    if (err) { setError(err); return }

    setIsSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category_id: form.category_id ? parseInt(form.category_id, 10) : undefined,
        type: form.type,
        close_date: form.close_date,
        resolution_criteria: form.resolution_criteria.trim() || undefined,
      }

      if (form.type === 'binary') {
        body.yes_probability = form.yes_probability / 100
      }
      if (form.type === 'multiple_choice') {
        body.options = form.options
          .filter(o => o.trim().length > 0)
          .map(o => ({ text: o.trim() }))
      }
      if (form.type === 'numeric') {
        body.min_value = parseFloat(form.min_value)
        body.max_value = parseFloat(form.max_value)
        if (form.unit.trim()) body.unit = form.unit.trim()
      }

      const res = await fetch('/api/markets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '마켓 생성에 실패했습니다.')
        return
      }

      router.push(`/market/${json.data.id}`)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-primary text-white'
                  : s < step
                  ? 'bg-teal-500 text-white'
                  : 'bg-canvas-100 text-ink-500 border border-ink-300'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-0.5 w-12 ${s < step ? 'bg-teal-500' : 'bg-ink-300'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-ink-600">
          {step === 1 && '마켓 유형 선택'}
          {step === 2 && '기본 정보 입력'}
          {step === 3 && '세부 설정'}
        </span>
      </div>

      {/* Step 1: 유형 선택 */}
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold text-ink-1000 mb-2">마켓 유형을 선택하세요</h1>
          <p className="text-ink-600 mb-6">예측하려는 질문의 형태에 맞는 유형을 고르세요.</p>
          <div className="grid gap-3">
            {MARKET_TYPES.map(({ value, label, desc, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => update('type', value)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  form.type === value
                    ? 'border-primary bg-primary/5'
                    : 'border-ink-300 bg-canvas-0 hover:border-primary/50'
                }`}
              >
                <span className={`mt-0.5 ${form.type === value ? 'text-primary' : 'text-ink-500'}`}>
                  {icon}
                </span>
                <div>
                  <p className="font-semibold text-ink-1000">{label}</p>
                  <p className="text-sm text-ink-600 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 기본 정보 */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold text-ink-1000 mb-6">기본 정보를 입력하세요</h1>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-ink-800 font-medium">
                마켓 제목 <span className="text-scarlet-500">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="예: 2024년 말까지 비트코인이 10만 달러를 돌파할까?"
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
                onChange={e => update('description', e.target.value)}
                placeholder="마켓에 대한 추가 설명을 입력하세요."
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-ink-800 font-medium">
                카테고리 <span className="text-ink-400 font-normal">(선택)</span>
              </Label>
              <Select
                value={form.category_id}
                onValueChange={val => update('category_id', val ?? '')}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="close_date" className="text-ink-800 font-medium">
                마감일 <span className="text-scarlet-500">*</span>
              </Label>
              <Input
                id="close_date"
                type="datetime-local"
                value={form.close_date}
                onChange={e => update('close_date', e.target.value)}
                min={getMinDatetimeLocal()}
                className="h-10"
              />
              <p className="text-xs text-ink-500">
                최소 1시간 이후, 최대 5년 이내
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resolution_criteria" className="text-ink-800 font-medium">
                결과 확인 기준 <span className="text-ink-400 font-normal">(선택)</span>
              </Label>
              <textarea
                id="resolution_criteria"
                value={form.resolution_criteria}
                onChange={e => update('resolution_criteria', e.target.value)}
                placeholder="이 마켓의 결과를 어떻게 판단할지 명확하게 설명해주세요."
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: 유형별 세부 설정 */}
      {step === 3 && (
        <div>
          <h1 className="text-2xl font-bold text-ink-1000 mb-6">세부 설정</h1>

          {/* Binary */}
          {form.type === 'binary' && (
            <div className="space-y-4">
              <p className="text-ink-700">YES 결과의 초기 확률을 설정하세요.</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-teal-600">YES</span>
                  <span className="text-2xl font-bold text-ink-1000">{form.yes_probability}%</span>
                  <span className="text-scarlet-500">NO {100 - form.yes_probability}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={form.yes_probability}
                  onChange={e => update('yes_probability', parseInt(e.target.value, 10))}
                  className="w-full h-2 accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-ink-500">
                  <span>1%</span>
                  <span>50%</span>
                  <span>99%</span>
                </div>
              </div>
            </div>
          )}

          {/* Multiple Choice */}
          {form.type === 'multiple_choice' && (
            <div className="space-y-4">
              <p className="text-ink-700">선택지를 2개 이상 입력하세요 (최대 8개).</p>
              <div className="space-y-2">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-sm text-ink-500 w-6 text-right">{idx + 1}.</span>
                    <Input
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      placeholder={`선택지 ${idx + 1}`}
                      className="h-10 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      disabled={form.options.length <= 2}
                      className="p-2 text-ink-400 hover:text-scarlet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {form.options.length < 8 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOption}
                  className="text-primary hover:text-primary/80"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  선택지 추가
                </Button>
              )}
            </div>
          )}

          {/* Numeric */}
          {form.type === 'numeric' && (
            <div className="space-y-4">
              <p className="text-ink-700">예측할 수치의 범위를 설정하세요.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min_value" className="text-ink-800 font-medium">
                    최솟값 <span className="text-scarlet-500">*</span>
                  </Label>
                  <Input
                    id="min_value"
                    type="number"
                    value={form.min_value}
                    onChange={e => update('min_value', e.target.value)}
                    placeholder="0"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_value" className="text-ink-800 font-medium">
                    최댓값 <span className="text-scarlet-500">*</span>
                  </Label>
                  <Input
                    id="max_value"
                    type="number"
                    value={form.max_value}
                    onChange={e => update('max_value', e.target.value)}
                    placeholder="100"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-ink-800 font-medium">
                  단위 <span className="text-ink-400 font-normal">(선택)</span>
                </Label>
                <Input
                  id="unit"
                  value={form.unit}
                  onChange={e => update('unit', e.target.value)}
                  placeholder="예: %, 달러, 명"
                  className="h-10"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-scarlet-500/10 border border-scarlet-500/30 text-scarlet-600 dark:text-scarlet-400 text-sm">
          {error}
        </div>
      )}

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between mt-8 pt-6 border-t border-ink-200">
        {step > 1 ? (
          <Button type="button" variant="ghost" onClick={handleBack}>
            이전
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button type="button" onClick={handleNext}>
            다음
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-24"
          >
            {isSubmitting ? '생성 중...' : '마켓 생성하기'}
          </Button>
        )}
      </div>
    </div>
  )
}
