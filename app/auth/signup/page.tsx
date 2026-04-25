'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import Image from 'next/image'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  async function handleOAuthLogin(provider: 'google' | 'kakao') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-100 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">이메일을 확인해 주세요</CardTitle>
            <CardDescription>
              {email}로 인증 링크를 발송했습니다.<br />
              링크를 클릭하면 1,000포인트와 함께 시작합니다!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Image src="/logo.png" alt="예견" width={56} height={56} className="rounded-xl" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">예견 가입</CardTitle>
          <CardDescription>가입 즉시 1,000포인트를 드립니다</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
              onClick={() => handleOAuthLogin('google')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 가입
            </button>
            <button
              type="button"
              style={{ backgroundColor: '#FEE500', color: '#3C1E1E' }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm hover:brightness-95 transition-all"
              onClick={() => handleOAuthLogin('kakao')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.08 4.04 6.52L5.1 20.5a.5.5 0 0 0 .72.55l4.18-2.77c.66.1 1.33.15 2 .15 5.523 0 10-3.477 10-7.63C22 6.477 17.523 3 12 3z"/>
              </svg>
              카카오로 가입
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-ink-500">또는 이메일로</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" placeholder="hello@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">비밀번호 (6자 이상)</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
            </div>
            {error && <p className="text-sm text-scarlet-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '가입 중...' : '이메일로 가입하기'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-ink-600">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">로그인</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
