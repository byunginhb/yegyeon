'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'
import { Settings, User, AtSign, FileText, Camera, Trash2 } from 'lucide-react'
import Image from 'next/image'

const settingsSchema = z.object({
  display_name: z.string().min(1, '표시명을 입력해주세요').max(50, '표시명은 50자 이하여야 합니다'),
  username: z
    .string()
    .min(2, '유저네임은 2자 이상이어야 합니다')
    .max(30, '유저네임은 30자 이하여야 합니다')
    .regex(/^[a-zA-Z0-9_]+$/, '영문자, 숫자, 언더스코어(_)만 사용 가능합니다'),
  bio: z.string().max(200, '소개는 200자 이하여야 합니다').optional(),
})

type SettingsForm = z.infer<typeof settingsSchema>

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayNameLocal] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema) })

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function loadProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/auth/login'); return }

      const { data: dbUser } = await supabase
        .from('users')
        .select('id, username, display_name, bio, avatar_url')
        .eq('auth_id', authUser.id)
        .single()

      if (!dbUser) { router.push('/auth/login'); return }

      reset({
        display_name: dbUser.display_name,
        username: dbUser.username,
        bio: dbUser.bio ?? '',
      })
      setDisplayNameLocal(dbUser.display_name)
      setAvatarUrl(dbUser.avatar_url ?? null)
      setLoading(false)
    }

    loadProfile()
  }, [router, reset])

  async function uploadAvatar(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('JPEG, PNG, WebP 형식만 허용됩니다.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('파일 크기는 2MB 이하여야 합니다.')
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/settings/avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setAvatarUrl(data.data.avatar_url)
        toast.success('프로필 사진이 업데이트되었습니다.')
      } else {
        toast.error(data.error ?? '업로드 실패')
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleDeleteAvatar() {
    setAvatarUploading(true)
    try {
      const res = await fetch('/api/settings/avatar', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setAvatarUrl(null)
        toast.success('프로필 사진이 삭제되었습니다.')
      } else {
        toast.error(data.error ?? '삭제 실패')
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadAvatar(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadAvatar(file)
  }

  async function onSubmit(values: SettingsForm) {
    setSubmitting(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error ?? '설정 업데이트에 실패했습니다')
        return
      }
      toast.success('설정이 저장되었습니다')
      reset(values)
    } catch {
      toast.error('네트워크 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-canvas-100">
        <div className="max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-8 bg-ink-200 rounded w-24 mb-6 animate-pulse" />
          <div className="bg-canvas-0 border border-ink-200 rounded-2xl p-6 animate-pulse">
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-ink-100 rounded w-20 mb-2" />
                  <div className="h-10 bg-ink-100 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <main className="min-h-screen bg-canvas-100">
      <div className="max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-ink-1000">설정</h1>
        </div>

        {/* 프로필 사진 섹션 */}
        <div className="bg-canvas-0 border border-ink-200 rounded-2xl p-6 mb-4">
          <h2 className="text-base font-semibold text-ink-900 border-b border-ink-100 pb-3 mb-5">
            프로필 사진
          </h2>

          <div className="flex items-center gap-6 flex-wrap">
            {/* 현재 사진 미리보기 */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="프로필 사진"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">{initials}</span>
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* 업로드 영역 */}
            <div className="flex-1 min-w-0">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-ink-200 hover:border-primary/50 hover:bg-canvas-50'
                }`}
              >
                <Camera className="h-6 w-6 text-ink-400 mx-auto mb-1.5" />
                <p className="text-sm text-ink-600 font-medium">클릭하거나 드래그해서 업로드</p>
                <p className="text-xs text-ink-400 mt-0.5">JPEG, PNG, WebP · 최대 2MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                aria-label="프로필 사진 파일 선택"
              />
            </div>

            {/* 삭제 버튼 */}
            {avatarUrl && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={avatarUploading}
                className="flex items-center gap-1.5 text-sm text-scarlet-500 hover:text-scarlet-600 disabled:opacity-50 transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                기본 이미지로
              </button>
            )}
          </div>
        </div>

        {/* 프로필 정보 섹션 */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-canvas-0 border border-ink-200 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-ink-900 border-b border-ink-100 pb-3">
              프로필 설정
            </h2>

            {/* 표시명 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700 mb-1.5">
                <User className="h-3.5 w-3.5" />
                표시명
              </label>
              <input
                {...register('display_name')}
                type="text"
                placeholder="표시될 이름을 입력하세요"
                className="w-full px-3 py-2 text-sm bg-canvas-50 border border-ink-200 rounded-lg text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              {errors.display_name && (
                <p className="mt-1 text-xs text-scarlet-500">{errors.display_name.message}</p>
              )}
            </div>

            {/* 유저네임 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700 mb-1.5">
                <AtSign className="h-3.5 w-3.5" />
                유저네임
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">@</span>
                <input
                  {...register('username')}
                  type="text"
                  placeholder="username"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-canvas-50 border border-ink-200 rounded-lg text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-scarlet-500">{errors.username.message}</p>
              )}
              <p className="mt-1 text-xs text-ink-400">영문자, 숫자, 언더스코어(_)만 사용 가능합니다</p>
            </div>

            {/* 소개 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700 mb-1.5">
                <FileText className="h-3.5 w-3.5" />
                소개
                <span className="text-ink-400 font-normal">(선택)</span>
              </label>
              <textarea
                {...register('bio')}
                rows={3}
                placeholder="자신을 소개해주세요"
                className="w-full px-3 py-2 text-sm bg-canvas-50 border border-ink-200 rounded-lg text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
              {errors.bio && (
                <p className="mt-1 text-xs text-scarlet-500">{errors.bio.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-ink-100">
              <button
                type="submit"
                disabled={submitting || !isDirty}
                className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '저장 중...' : '변경사항 저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
