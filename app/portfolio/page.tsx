import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  const { data: dbUser } = await adminSupabase
    .from('users')
    .select('username')
    .eq('auth_id', authUser.id)
    .single()

  if (!dbUser?.username) {
    redirect('/auth/login')
  }

  redirect(`/profile/${dbUser.username}`)
}
