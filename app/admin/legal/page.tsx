'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LegalKind = 'terms_of_service' | 'privacy_policy' | 'terms_of_use'

interface LegalDocument {
  id: string
  kind: LegalKind
  title: string
  content: string
  version: number
  updated_at: string
  updated_by: string | null
}

const KIND_LABELS: Record<LegalKind, string> = {
  terms_of_service: '서비스 약관',
  privacy_policy: '개인정보 처리방침',
  terms_of_use: '이용 약관',
}

const KIND_ORDER: LegalKind[] = ['terms_of_service', 'privacy_policy', 'terms_of_use']

interface DraftState {
  title: string
  content: string
  bumpVersion: boolean
}

export default function AdminLegalPage() {
  const [docs, setDocs] = useState<LegalDocument[]>([])
  const [drafts, setDrafts] = useState<Record<LegalKind, DraftState>>({} as Record<LegalKind, DraftState>)
  const [activeKind, setActiveKind] = useState<LegalKind>('terms_of_service')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/legal')
      const data = await res.json()
      if (data.success) {
        const docsList = data.data as LegalDocument[]
        setDocs(docsList)
        const initial: Record<string, DraftState> = {}
        for (const d of docsList) {
          initial[d.kind] = { title: d.title, content: d.content, bumpVersion: false }
        }
        setDrafts(initial as Record<LegalKind, DraftState>)
      } else {
        toast.error(data.error ?? '약관 로드 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const current = docs.find((d) => d.kind === activeKind)
  const draft = drafts[activeKind]
  const isDirty =
    !!current &&
    !!draft &&
    (draft.title !== current.title || draft.content !== current.content)

  async function handleSave() {
    if (!isDirty || !current || !draft) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/legal/${activeKind}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          bumpVersion: draft.bumpVersion,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${KIND_LABELS[activeKind]}이(가) 저장되었습니다.`)
        await load()
      } else {
        toast.error(data.error ?? '저장 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function updateDraft(patch: Partial<DraftState>) {
    setDrafts((prev) => ({
      ...prev,
      [activeKind]: { ...prev[activeKind], ...patch },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">약관 관리</h1>
          <p className="text-sm text-ink-500 mt-1">서비스 약관, 개인정보 처리방침, 이용 약관을 수정합니다.</p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? '저장 중...' : '변경사항 저장'}
        </Button>
      </div>

      {/* 탭 */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {KIND_ORDER.map((kind) => {
            const doc = docs.find((d) => d.kind === kind)
            const d = drafts[kind]
            const dirty =
              !!doc && !!d && (d.title !== doc.title || d.content !== doc.content)
            return (
              <button
                key={kind}
                onClick={() => setActiveKind(kind)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeKind === kind
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-600 hover:text-ink-900'
                }`}
              >
                {KIND_LABELS[kind]}
                {dirty && <span className="ml-1.5 text-primary">●</span>}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">불러오는 중...</p>
      ) : !current || !draft ? (
        <p className="text-sm text-ink-400">약관 데이터가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-ink-500">
            <span>버전 v{current.version}</span>
            <span>·</span>
            <span>마지막 수정: {new Date(current.updated_at).toLocaleString('ko-KR')}</span>
            <span>·</span>
            <a
              href={`/legal/${activeKind}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              공개 페이지 보기 ↗
            </a>
          </div>

          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>본문 (마크다운 지원)</Label>
            <textarea
              value={draft.content}
              onChange={(e) => updateDraft({ content: e.target.value })}
              className="w-full min-h-[480px] p-3 border border-border rounded-md text-sm font-mono leading-relaxed resize-y bg-canvas-0"
              placeholder="# 제목&#10;&#10;본문 내용..."
            />
            <p className="text-xs text-ink-400">
              마크다운 문법(#, ##, -, **굵게**)을 사용할 수 있습니다. 줄바꿈은 그대로 표시됩니다.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={draft.bumpVersion}
              onChange={(e) => updateDraft({ bumpVersion: e.target.checked })}
              className="h-4 w-4"
            />
            저장 시 버전 번호를 올립니다 (현재 v{current.version} → v{current.version + 1})
          </label>

          {isDirty && (
            <div className="text-xs text-brand-600">
              저장되지 않은 변경사항이 있습니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
