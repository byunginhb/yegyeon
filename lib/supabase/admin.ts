import { createClient } from '@supabase/supabase-js'

// RLS 우회 클라이언트 — 서버 전용 (API Route, Server Action에서만 사용)
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
