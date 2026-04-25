'use client'

import { Clock } from 'lucide-react'

interface Props {
  isCreator: boolean
}

export default function PendingBanner({ isCreator }: Props) {
  return (
    <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
      <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-700">관리자 승인 대기 중</p>
        <p className="text-sm text-amber-600 mt-0.5">
          {isCreator
            ? '이 마켓은 관리자 검토 후 공개됩니다. 승인되면 다른 사용자에게 노출됩니다.'
            : '이 마켓은 현재 검토 중입니다.'}
        </p>
      </div>
    </div>
  )
}
