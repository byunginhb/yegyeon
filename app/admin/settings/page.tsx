'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string
}

const KEY_LABELS: Record<string, string> = {
  signup_bonus: '신규 가입 지급 포인트',
  market_creation_cost: '마켓 생성 비용',
  min_bet_amount: '최소 베팅 금액',
  initial_liquidity: 'Binary 마켓 초기 유동성',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
        const initial: Record<string, string> = {}
        for (const s of data.data as Setting[]) initial[s.key] = s.value
        setDrafts(initial)
      } else {
        toast.error(data.error ?? '설정 로드 실패')
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

  const dirtyKeys = settings
    .filter((s) => drafts[s.key] !== undefined && drafts[s.key] !== s.value)
    .map((s) => s.key)

  async function handleSave() {
    if (dirtyKeys.length === 0) return
    setSaving(true)
    try {
      const updates = dirtyKeys.map((key) => ({ key, value: drafts[key] }))
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (data.success) {
        const failed = (data.data as Array<{ key: string; success: boolean }>).filter((r) => !r.success)
        if (failed.length === 0) {
          toast.success('설정이 저장되었습니다.')
        } else {
          toast.warning(`${failed.length}개 항목 저장 실패: ${failed.map((f) => f.key).join(', ')}`)
        }
        load()
      } else {
        toast.error(data.error ?? '저장 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">서비스 설정</h1>
        <Button onClick={handleSave} disabled={dirtyKeys.length === 0 || saving}>
          {saving ? '저장 중...' : `변경사항 저장 (${dirtyKeys.length})`}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">불러오는 중...</p>
      ) : settings.length === 0 ? (
        <p className="text-sm text-ink-400">설정 항목이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {settings.map((s) => {
            const isDirty = drafts[s.key] !== s.value
            return (
              <Card key={s.key} className={isDirty ? 'border-brand-500/50' : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-ink-900">
                    {KEY_LABELS[s.key] ?? s.key}
                  </CardTitle>
                  {s.description && (
                    <p className="text-xs text-ink-500 mt-0.5">{s.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-ink-500 font-mono">{s.key}</Label>
                    <Input
                      value={drafts[s.key] ?? ''}
                      onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
                    />
                    {isDirty && (
                      <p className="text-xs text-brand-600">현재: {s.value} → {drafts[s.key]}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-ink-400">
        * 설정 변경은 즉시 적용됩니다. 변경 이력은 관리 로그에서 확인할 수 있습니다.
      </p>
    </div>
  )
}
