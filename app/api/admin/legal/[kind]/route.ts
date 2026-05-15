import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

const VALID_KINDS = ['terms_of_service', 'privacy_policy', 'terms_of_use'] as const
type LegalKind = (typeof VALID_KINDS)[number]

function isValidKind(value: string): value is LegalKind {
  return (VALID_KINDS as readonly string[]).includes(value)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { kind } = await params
  if (!isValidKind(kind)) {
    return NextResponse.json({ success: false, error: '유효하지 않은 약관 종류입니다.' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('legal_documents')
    .select('*')
    .eq('kind', kind)
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: '약관을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { kind } = await params
  if (!isValidKind(kind)) {
    return NextResponse.json({ success: false, error: '유효하지 않은 약관 종류입니다.' }, { status: 400 })
  }

  let body: { title?: string; content?: string; bumpVersion?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const { data: before, error: beforeError } = await adminSupabase
    .from('legal_documents')
    .select('*')
    .eq('kind', kind)
    .single()

  if (beforeError || !before) {
    return NextResponse.json({ success: false, error: '약관을 찾을 수 없습니다.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {
    updated_by: ctx.adminUserId,
  }

  if (typeof body.title === 'string') {
    const trimmed = body.title.trim()
    if (!trimmed) {
      return NextResponse.json({ success: false, error: '제목은 비울 수 없습니다.' }, { status: 400 })
    }
    updatePayload.title = trimmed
  }

  if (typeof body.content === 'string') {
    updatePayload.content = body.content
  }

  if (body.bumpVersion === true) {
    updatePayload.version = (before.version ?? 1) + 1
  }

  const { data: after, error } = await adminSupabase
    .from('legal_documents')
    .update(updatePayload)
    .eq('kind', kind)
    .select('*')
    .single()

  if (error || !after) {
    console.error('admin legal PATCH error', error)
    return NextResponse.json({ success: false, error: '약관 수정 실패' }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'update_legal_document',
    targetType: 'legal_document',
    targetId: after.id,
    before,
    after,
  })

  return NextResponse.json({ success: true, data: after })
}
