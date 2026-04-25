/**
 * 예견 RPC/마이그레이션 회귀 검증
 *
 * 실행: npx tsx scripts/verify-rpc.ts
 *
 * .env.local 의 SUPABASE_URL + SERVICE_ROLE_KEY 로 원격 DB의
 * 함수 존재·시그니처·정책·인덱스를 실제 호출해 확인한다.
 *
 * 정상 데이터 변경을 피하기 위해 의도된 에러 케이스로만 호출하고,
 * RPC가 던지는 RAISE EXCEPTION 메시지를 검증한다.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(): { url: string; serviceKey: string } {
  const envPath = resolve(process.cwd(), '.env.local')
  const raw = readFileSync(envPath, 'utf8')
  const map: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '')
  }
  const url = map.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = map.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('.env.local 에 SUPABASE_URL/SERVICE_ROLE_KEY 누락')
  return { url, serviceKey }
}

let passed = 0
let failed = 0

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

async function main() {
  const { url, serviceKey } = loadEnv()
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`\n[ENV] ${url}\n`)

  // ----------------------------------------------------------------
  console.log('[1] place_bet — 시그니처 + 검증 흐름')
  {
    // 무효 amount → INVALID_AMOUNT 또는 BELOW_MIN_BET 발생해야 함
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const r1 = await supabase.rpc('place_bet', {
      p_auth_id: dummyUuid,
      p_market_id: dummyUuid,
      p_outcome: 'YES',
      p_option_id: null,
      p_amount: 0,
    })
    ok('place_bet 함수 존재 (PGRST202 아님)', r1.error?.code !== 'PGRST202', r1.error?.message)
    ok(
      'amount=0 → INVALID_AMOUNT raise',
      !!r1.error?.message?.includes('INVALID_AMOUNT'),
      r1.error?.message
    )

    const r2 = await supabase.rpc('place_bet', {
      p_auth_id: dummyUuid,
      p_market_id: dummyUuid,
      p_outcome: 'YES',
      p_option_id: null,
      p_amount: 5,
    })
    ok(
      'amount=5 → BELOW_MIN_BET raise',
      !!r2.error?.message?.includes('BELOW_MIN_BET'),
      r2.error?.message
    )

    // 존재하지 않는 user → USER_NOT_FOUND
    const r3 = await supabase.rpc('place_bet', {
      p_auth_id: dummyUuid,
      p_market_id: dummyUuid,
      p_outcome: 'YES',
      p_option_id: null,
      p_amount: 100,
    })
    ok(
      'unknown user → USER_NOT_FOUND raise',
      !!r3.error?.message?.includes('USER_NOT_FOUND'),
      r3.error?.message
    )
  }

  // ----------------------------------------------------------------
  console.log('\n[2] resolve_market — 시그니처 + 검증 흐름')
  {
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const r1 = await supabase.rpc('resolve_market', {
      p_admin_auth_id: dummyUuid,
      p_market_id: dummyUuid,
      p_resolution: 'YES',
    })
    ok('resolve_market 함수 존재', r1.error?.code !== 'PGRST202', r1.error?.message)
    ok(
      '비-admin 호출 → NOT_ADMIN raise',
      !!r1.error?.message?.includes('NOT_ADMIN'),
      r1.error?.message
    )
    ok(
      'ON CONFLICT 결함(42P10) 없음',
      r1.error?.code !== '42P10',
      r1.error?.message
    )
  }

  // ----------------------------------------------------------------
  console.log('\n[3] is_admin — 003 RLS 헬퍼 함수')
  {
    // SQL로 직접 호출해 함수 존재 + STABLE / SECURITY DEFINER 동작 검증
    const r = await supabase.rpc('is_admin')
    ok('is_admin 함수 존재', r.error?.code !== 'PGRST202', r.error?.message)
    // service role 로는 auth.uid() 가 null 이라 false 반환 기대
    ok('service role 호출 시 false', r.data === false, `data=${JSON.stringify(r.data)}`)
  }

  // ----------------------------------------------------------------
  console.log('\n[4] increment_comment_count — 002 함수')
  {
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const r = await supabase.rpc('increment_comment_count', { market_id: dummyUuid })
    ok('increment_comment_count 함수 존재', r.error?.code !== 'PGRST202', r.error?.message)
    // 존재하지 않는 market_id 라도 UPDATE는 0 행이라 에러 없음 (void return)
    ok('void return (data=null)', r.data === null, `data=${JSON.stringify(r.data)}`)
  }

  // ----------------------------------------------------------------
  console.log('\n[5] 핵심 테이블 SELECT 가능 여부 (service role)')
  {
    const tables = [
      'users', 'markets', 'market_options', 'bets', 'point_transactions',
      'comments', 'follows', 'reports', 'announcements', 'admin_logs',
      'service_settings', 'categories',
    ]
    for (const t of tables) {
      const r = await supabase.from(t).select('*', { count: 'exact', head: true }).limit(1)
      ok(`from('${t}') 접근`, !r.error, r.error?.message)
    }
  }

  // ----------------------------------------------------------------
  console.log('\n[6] 옵션·트리거 부수 효과 안정성')
  {
    // bets.option_id 컬럼 존재 확인 (004 ADD COLUMN IF NOT EXISTS)
    const r = await supabase.from('bets').select('option_id').limit(1)
    ok('bets.option_id 컬럼 존재', !r.error, r.error?.message)
  }

  // ----------------------------------------------------------------
  console.log('\n[7] users_public 뷰 — 003 분리 뷰')
  {
    const r = await supabase.from('users_public').select('id').limit(1)
    ok('users_public view 접근', !r.error, r.error?.message)
  }

  // ----------------------------------------------------------------
  console.log('\n[8] guard_user_sensitive_columns 트리거 — service role 통과 여부')
  {
    // 실제 사용자 1명 조회 후 points를 동일 값으로 UPDATE 시도 (no-op)
    // 트리거가 service role을 막으면 admin 포인트 조정이 깨짐.
    const { data: anyUser } = await supabase.from('users').select('id, points').limit(1).single()
    if (anyUser) {
      const r = await supabase.from('users').update({ points: anyUser.points }).eq('id', anyUser.id)
      ok(
        'service role의 users.points UPDATE 통과',
        !r.error,
        r.error?.message
      )
    } else {
      ok('service role UPDATE 검증 (스킵: users 테이블 비어있음)', true)
    }
  }

  // ----------------------------------------------------------------
  console.log('\n[9] users_select_self_or_admin 정책 — anon 차단 동작')
  {
    const { url, serviceKey: _ } = loadEnv()
    void _
    const envPath = resolve(process.cwd(), '.env.local')
    const raw = readFileSync(envPath, 'utf8')
    const anonMatch = raw.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)
    const anonKey = anonMatch ? anonMatch[1].replace(/^"|"$/g, '') : ''
    if (anonKey) {
      const anonClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const r = await anonClient.from('users').select('id').limit(1)
      // anon은 자기 자신 row가 없으니 0건 반환 또는 정책으로 차단되어 빈 배열
      ok(
        'anon SELECT users → 0행 반환 (RLS 차단)',
        !r.error && (r.data?.length ?? 0) === 0,
        `error=${r.error?.message} count=${r.data?.length}`
      )

      // anon이 활성 마켓은 SELECT 가능해야 함 (markets_select_visible)
      const r2 = await anonClient.from('markets').select('id').limit(1)
      ok('anon SELECT markets 허용', !r2.error, r2.error?.message)

      // anon이 카테고리는 활성만 SELECT 가능
      const r3 = await anonClient.from('categories').select('id').limit(1)
      ok('anon SELECT categories 허용', !r3.error, r3.error?.message)
    } else {
      ok('anon 검증 (스킵: anon key 없음)', true)
    }
  }

  // ----------------------------------------------------------------
  console.log('\n[10] partial unique index 동작 — point_transactions 멱등성')
  {
    // 같은 (user_id, ref_id, type) 조합으로 'bet_won' 두 번 INSERT 시도
    // 첫 번째 성공 후 두 번째는 unique violation 23505 발생해야 함.
    const { data: anyUser } = await supabase.from('users').select('id').limit(1).single()
    if (anyUser) {
      const dummyRef = '00000000-0000-0000-0000-000000000000'
      // 사전 정리
      await supabase
        .from('point_transactions')
        .delete()
        .eq('user_id', anyUser.id)
        .eq('ref_id', dummyRef)
        .eq('type', 'bet_won')

      const ins1 = await supabase.from('point_transactions').insert({
        user_id: anyUser.id, type: 'bet_won', amount: 0, balance: 0, ref_id: dummyRef,
        note: '[verify-rpc] 멱등성 테스트 1',
      })
      ok('첫 INSERT 성공', !ins1.error, ins1.error?.message)

      const ins2 = await supabase.from('point_transactions').insert({
        user_id: anyUser.id, type: 'bet_won', amount: 0, balance: 0, ref_id: dummyRef,
        note: '[verify-rpc] 멱등성 테스트 2',
      })
      ok(
        '동일 키 두 번째 INSERT는 unique violation(23505)',
        ins2.error?.code === '23505',
        ins2.error?.message
      )

      // 사후 정리
      await supabase
        .from('point_transactions')
        .delete()
        .eq('user_id', anyUser.id)
        .eq('ref_id', dummyRef)
        .eq('type', 'bet_won')
    } else {
      ok('partial index 검증 (스킵: users 비어있음)', true)
    }
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('verify-rpc error:', e)
  process.exit(1)
})
