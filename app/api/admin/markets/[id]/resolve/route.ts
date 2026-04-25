import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ResolveSchema = z.object({
  resolution_value: z.string().min(1).max(200),
})

const RPC_ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  NOT_ADMIN: { status: 403, message: '권한이 없습니다.' },
  MARKET_NOT_FOUND: { status: 404, message: '마켓을 찾을 수 없습니다.' },
  ALREADY_RESOLVED: { status: 409, message: '이미 정산 완료된 마켓입니다.' },
  INVALID_RESOLUTION: { status: 400, message: '잘못된 결과값입니다.' },
  INVALID_OPTION: { status: 400, message: '잘못된 옵션 ID입니다.' },
  INVALID_NUMERIC: { status: 400, message: '숫자 값이 잘못되었습니다.' },
}

function mapRpcError(message: string | undefined): { status: number; error: string } {
  if (!message) return { status: 500, error: '서버 오류가 발생했습니다.' }
  for (const [code, info] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(code)) return { status: info.status, error: info.message }
  }
  return { status: 500, error: '정산 처리에 실패했습니다.' }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { id: marketId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const parsed = ResolveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 }
      )
    }

    const { data, error } = await adminSupabase.rpc('resolve_market', {
      p_admin_auth_id: authUser.id,
      p_market_id: marketId,
      p_resolution: parsed.data.resolution_value,
    })

    if (error) {
      const mapped = mapRpcError(error.message)
      console.error('resolve_market RPC error', { code: error.code, message: error.message })
      return NextResponse.json({ success: false, error: mapped.error }, { status: mapped.status })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('admin market resolve error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
