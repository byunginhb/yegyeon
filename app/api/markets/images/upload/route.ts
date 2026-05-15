import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const VALID_KINDS = ['thumbnail', 'option'] as const
type Kind = (typeof VALID_KINDS)[number]

function isKind(value: string | null): value is Kind {
  return value != null && (VALID_KINDS as readonly string[]).includes(value)
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function randomId(): string {
  // 16바이트 hex
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: dbUser } = await adminSupabase
      .from('users')
      .select('id, is_banned')
      .eq('auth_id', authUser.id)
      .single()
    if (!dbUser) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (dbUser.is_banned) {
      return NextResponse.json({ success: false, error: '정지된 계정은 업로드할 수 없습니다.' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const kindRaw = formData.get('kind')
    const kind: Kind = isKind(typeof kindRaw === 'string' ? kindRaw : null) ? (kindRaw as Kind) : 'thumbnail'

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: '파일이 없습니다.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'JPEG, PNG, WebP 형식만 허용됩니다.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 })
    }

    const ext = extFromMime(file.type)
    const storagePath = `${authUser.id}/${kind}-${randomId()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await adminSupabase.storage
      .from('market-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('market image upload error:', uploadError)
      return NextResponse.json({ success: false, error: '업로드에 실패했습니다.' }, { status: 500 })
    }

    const { data: urlData } = adminSupabase.storage
      .from('market-images')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      data: { url: urlData.publicUrl, path: storagePath },
    })
  } catch (err) {
    console.error('market image POST error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
