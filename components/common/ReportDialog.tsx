'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export type ReportTargetType = 'market' | 'comment' | 'user'

const TARGET_LABELS: Record<ReportTargetType, string> = {
  market: '마켓',
  comment: '댓글',
  user: '유저',
}

const PRESET_REASONS: Record<ReportTargetType, string[]> = {
  market: [
    '허위/오해 소지가 있는 정보',
    '스팸/도배성 마켓',
    '혐오 표현',
    '저작권/개인정보 침해',
    '불법 콘텐츠',
  ],
  comment: ['스팸/도배', '혐오 표현', '욕설/비방', '개인정보 노출', '광고/홍보'],
  user: ['스팸/어뷰징 계정', '혐오 표현', '사칭', '기타'],
}

interface ReportDialogProps {
  open: boolean
  type: ReportTargetType
  targetId: string
  targetLabel?: string
  onClose: () => void
}

export function ReportDialog({ open, type, targetId, targetLabel, onClose }: ReportDialogProps) {
  const [preset, setPreset] = useState<string>('')
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setPreset('')
    setExtra('')
  }

  async function handleSubmit() {
    const reason = [preset, extra.trim()].filter(Boolean).join(' — ')
    if (reason.length < 5) {
      toast.error('신고 사유를 5자 이상 작성해 주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target_id: targetId, reason }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('신고가 접수되었습니다. 관리자가 검토 후 조치합니다.')
        reset()
        onClose()
      } else if (res.status === 401) {
        toast.error('로그인 후 신고할 수 있습니다.')
      } else {
        toast.error(data.error ?? '신고 접수 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TARGET_LABELS[type]} 신고</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {targetLabel && (
            <p className="text-sm text-ink-600 line-clamp-2">대상: {targetLabel}</p>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm">신고 사유</Label>
            <div className="space-y-1">
              {PRESET_REASONS[type].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={preset === r}
                    onChange={(e) => setPreset(e.target.value)}
                    className="h-4 w-4"
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">추가 설명 (선택)</Label>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="구체적인 상황을 적어 주시면 처리에 도움이 됩니다."
              maxLength={500}
              className="w-full min-h-20 p-2 border border-border rounded-md text-sm resize-y"
            />
            <p className="text-xs text-ink-400 text-right">{extra.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !preset}>
            {loading ? '접수 중...' : '신고하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
