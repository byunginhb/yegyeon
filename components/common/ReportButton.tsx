'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { ReportDialog, type ReportTargetType } from './ReportDialog'

interface ReportButtonProps {
  type: ReportTargetType
  targetId: string
  targetLabel?: string
  variant?: 'icon' | 'text' | 'menu'
  className?: string
}

export function ReportButton({
  type,
  targetId,
  targetLabel,
  variant = 'icon',
  className,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false)

  const baseClass = 'text-ink-400 hover:text-scarlet-500 transition-colors'
  const styles = {
    icon: 'inline-flex items-center justify-center h-7 w-7 rounded-full hover:bg-canvas-100',
    text: 'inline-flex items-center gap-1 text-xs',
    menu: 'flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-canvas-100 rounded-md',
  }[variant]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseClass} ${styles} ${className ?? ''}`}
        aria-label={`${type === 'market' ? '마켓' : type === 'comment' ? '댓글' : '유저'} 신고`}
        title="신고"
      >
        <Flag className={variant === 'icon' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {variant !== 'icon' && <span>신고</span>}
      </button>
      <ReportDialog
        open={open}
        type={type}
        targetId={targetId}
        targetLabel={targetLabel}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
