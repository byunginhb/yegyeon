import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: dbUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
    if (!dbUser) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: '파일이 없습니다.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'JPEG, PNG, WebP 형식만 허용됩니다.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: '파일 크기는 2MB 이하여야 합니다.' }, { status: 400 })
    }

    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const storagePath = `${authUser.id}/avatar.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // 기존 파일 덮어쓰기 (upsert)
    const { error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('avatar upload error:', uploadError)
      return NextResponse.json({ success: false, error: '업로드에 실패했습니다.' }, { status: 500 })
    }

    const { data: urlData } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(storagePath)

    // 캐시 버스팅: 쿼리 파라미터로 타임스탬프 추가
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await adminSupabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', dbUser.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'DB 업데이트 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { avatar_url: publicUrl } })
  } catch (err) {
    console.error('avatar POST error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: dbUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
    if (!dbUser) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 모든 확장자 시도해서 삭제
    const paths = ['jpg', 'png', 'webp'].map((ext) => `${authUser.id}/avatar.${ext}`)
    await adminSupabase.storage.from('avatars').remove(paths)

    await adminSupabase
      .from('users')
      .update({ avatar_url: null })
      .eq('id', dbUser.id)

    return NextResponse.json({ success: true, data: { avatar_url: null } })
  } catch (err) {
    console.error('avatar DELETE error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
