'use client'

import { XCircle } from 'lucide-react'

interface Props {
  reason: string | null
  reviewedAt: string | null
}

export default function RejectedBanner({ reason, reviewedAt }: Props) {
  const date = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="mb-5 p-4 rounded-xl bg-scarlet-500/10 border border-scarlet-500/25 flex items-start gap-3">
      <XCircle className="h-5 w-5 text-scarlet-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-scarlet-700">마켓 승인이 거절되었습니다</p>
        {reason && (
          <p className="text-sm text-scarlet-600 mt-1 whitespace-pre-line break-words">{reason}</p>
        )}
        {date && (
          <p className="text-xs text-scarlet-500 mt-1">{date} 검토</p>
        )}
        <p className="text-xs text-scarlet-500 mt-2">이 마켓은 다른 사용자에게 표시되지 않습니다.</p>
      </div>
    </div>
  )
}
