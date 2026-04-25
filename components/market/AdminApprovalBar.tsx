'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  marketId: string
}

export default function AdminApprovalBar({ marketId }: Props) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  async function handleApprove() {
    setApproving(true)
    try {
      const res = await fetch(`/api/admin/markets/${marketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('마켓이 승인되었습니다.')
        router.refresh()
      } else {
        toast.error(data.error ?? '승인 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!reason.trim()) return
    setRejecting(true)
    try {
      const res = await fetch(`/api/admin/markets/${marketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: reason.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('마켓이 거절되었습니다.')
        setRejectOpen(false)
        router.refresh()
      } else {
        toast.error(data.error ?? '거절 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <>
      <div className="mb-5 p-4 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0" />
          <span className="text-sm font-semibold text-brand-700">관리자 검토 패널</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-teal-400 text-teal-600 hover:bg-teal-50 hover:text-teal-700"
            onClick={handleApprove}
            disabled={approving || rejecting}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {approving ? '승인 중...' : '승인'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-scarlet-400 text-scarlet-600 hover:bg-scarlet-50 hover:text-scarlet-700"
            onClick={() => setRejectOpen(true)}
            disabled={approving || rejecting}
          >
            <XCircle className="h-3.5 w-3.5" />
            거절
          </Button>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={(o) => !o && setRejectOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>마켓 거절</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ink-600">거절 사유를 입력해주세요. 생성자에게 표시됩니다.</p>
            <textarea
              placeholder="거절 사유 입력 (최대 500자)"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-ink-400 text-right">{reason.length} / 500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || rejecting}
            >
              {rejecting ? '처리 중...' : '거절 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
