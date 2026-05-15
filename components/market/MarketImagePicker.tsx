'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MarketImagePickerProps {
  value: string | null
  onChange: (url: string | null) => void
  kind: 'thumbnail' | 'option'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  disabled?: boolean
}

const SIZE_CLASSES: Record<NonNullable<MarketImagePickerProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
}

export default function MarketImagePicker({
  value,
  onChange,
  kind,
  size = 'md',
  label,
  disabled,
}: MarketImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('JPEG, PNG, WebP 형식만 가능합니다.')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/markets/images/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (data.success) {
        onChange(data.data.url)
      } else {
        toast.error(data.error ?? '업로드 실패')
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative shrink-0 rounded-lg border border-dashed border-ink-300 bg-canvas-100 overflow-hidden',
          'hover:border-primary hover:bg-canvas-50 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center',
          SIZE_CLASSES[size]
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : uploading ? (
          <Loader2 className="h-5 w-5 text-ink-400 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5 text-ink-400" />
        )}
        {uploading && value && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </div>
        )}
      </button>

      <div className="flex flex-col gap-1">
        {label && <span className="text-xs text-ink-500">{label}</span>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {value ? '변경' : '이미지 선택'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-0.5 text-xs text-ink-500 hover:text-scarlet-500 disabled:opacity-50"
            >
              <X className="h-3 w-3" /> 제거
            </button>
          )}
        </div>
        <p className="text-[10px] text-ink-400">JPEG/PNG/WebP · 최대 5MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
