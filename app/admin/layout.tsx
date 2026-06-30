import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { AdminSidebar, AdminMobileHeader } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await adminSupabase
    .from('users')
    .select('role, display_name')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex bg-canvas-100">
      {/* 사이드바 (데스크탑 lg+) */}
      <AdminSidebar displayName={profile.display_name} />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* 모바일 헤더 (lg 미만) */}
        <AdminMobileHeader displayName={profile.display_name} />
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
