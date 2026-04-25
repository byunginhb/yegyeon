'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'
import { Settings, User, AtSign, FileText } from 'lucide-react'

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

interface UserProfile {
  id: string
  username: string
  display_name: string
  bio: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function loadProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/auth/login')
        return
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select('id, username, display_name, bio')
        .eq('auth_id', authUser.id)
        .single()

      if (!dbUser) {
        router.push('/auth/login')
        return
      }

      const profile = dbUser as unknown as UserProfile
      reset({
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio ?? '',
      })
      setLoading(false)
    }

    loadProfile()
  }, [router, reset])

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
              {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <main className="min-h-screen bg-canvas-100">
      <div className="max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-ink-1000">설정</h1>
        </div>

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
