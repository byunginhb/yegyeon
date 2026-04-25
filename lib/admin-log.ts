import { adminSupabase } from '@/lib/supabase/admin'

export type AdminLogTargetType =
  | 'user'
  | 'market'
  | 'comment'
  | 'category'
  | 'report'
  | 'announcement'
  | 'setting'

export interface RecordAdminLogParams {
  adminId: string
  action: string
  targetType: AdminLogTargetType
  targetId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

export async function recordAdminLog({
  adminId,
  action,
  targetType,
  targetId,
  before = null,
  after = null,
}: RecordAdminLogParams): Promise<void> {
  const { error } = await adminSupabase.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    before_data: before,
    after_data: after,
  })

  if (error) {
    console.error('admin_logs insert failed', { action, targetType, targetId, error })
  }
}

export interface AdminContext {
  authUserId: string
  adminUserId: string
}

export async function verifyAdmin(): Promise<AdminContext | null> {
  const { createServerSupabaseClient } = await import('@/lib/supabase/server')
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await adminSupabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null

  return { authUserId: user.id, adminUserId: profile.id }
}
