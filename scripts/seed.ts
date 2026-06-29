import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env.local 자동 로드 (tsx는 자동 로드하지 않음)
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
    }
  } catch {
    // .env.local 없으면 무시 (CI 등은 process.env로 직접 주입)
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('환경 변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('.env.local 에 설정하거나 export 후 다시 실행하세요.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function slug(title: string, suffix: string) {
  return title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') + '-' + suffix
}

async function createAuthUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error && !error.message.includes('already been registered')) throw error
  if (data?.user) return data.user.id
  // 이미 존재하면 조회
  const { data: list } = await admin.auth.admin.listUsers()
  return list.users.find(u => u.email === email)!.id
}

async function main() {
  console.log('🌱 시드 데이터 삽입 시작...\n')

  // 기존 시드 데이터 정리 (재실행 대비)
  console.log('🧹 기존 데이터 정리 중...')
  const seedEmails = ['admin@yegyeon.com','kimchul@example.com','leeyj@example.com','parksh@example.com','choims@example.com','hangjw@example.com','ohsb@example.com','junghr@example.com','baekjh@example.com','sonay@example.com','limtw@example.com']
  const { data: existingUsers } = await admin.from('users').select('id').in('email', seedEmails)
  if (existingUsers && existingUsers.length > 0) {
    const ids = existingUsers.map(u => u.id)
    await admin.from('follows').delete().or(`follower_id.in.(${ids.join(',')}),following_id.in.(${ids.join(',')})`)
    await admin.from('comments').delete().in('user_id', ids)
    const { data: userMarkets } = await admin.from('markets').select('id').in('creator_id', ids)
    if (userMarkets && userMarkets.length > 0) {
      const mids = userMarkets.map(m => m.id)
      await admin.from('bets').delete().in('market_id', mids)
      await admin.from('market_options').delete().in('market_id', mids)
      await admin.from('markets').delete().in('id', mids)
    }
    await admin.from('bets').delete().in('user_id', ids)
    await admin.from('point_transactions').delete().in('user_id', ids)
    await admin.from('users').delete().in('id', ids)
  }
  console.log('  → 완료\n')

  // ──────────────────────────────────────────
  // 1. Auth 유저 생성
  // ──────────────────────────────────────────
  console.log('👤 유저 생성 중...')
  const usersData = [
    { email: 'admin@yegyeon.com',   password: 'Admin1234!',  username: 'admin',      display_name: '관리자',       role: 'admin', points: 50000 },
    { email: 'kimchul@example.com', password: 'Test1234!',   username: 'kimchul',    display_name: '김철수',       role: 'user',  points: 12500 },
    { email: 'leeyj@example.com',   password: 'Test1234!',   username: 'leeyj',      display_name: '이영진',       role: 'user',  points: 8300  },
    { email: 'parksh@example.com',  password: 'Test1234!',   username: 'parksh',     display_name: '박수현',       role: 'user',  points: 21000 },
    { email: 'choims@example.com',  password: 'Test1234!',   username: 'choims',     display_name: '최민서',       role: 'user',  points: 4200  },
    { email: 'hangjw@example.com',  password: 'Test1234!',   username: 'hangjw',     display_name: '한지우',       role: 'user',  points: 35000 },
    { email: 'ohsb@example.com',    password: 'Test1234!',   username: 'ohsb',       display_name: '오승빈',       role: 'user',  points: 2800  },
    { email: 'junghr@example.com',  password: 'Test1234!',   username: 'junghr',     display_name: '정혜린',       role: 'user',  points: 9700  },
    { email: 'baekjh@example.com',  password: 'Test1234!',   username: 'baekjh',     display_name: '백준혁',       role: 'user',  points: 16200 },
    { email: 'sonay@example.com',   password: 'Test1234!',   username: 'sonay',      display_name: '손아영',       role: 'user',  points: 7400  },
    { email: 'limtw@example.com',   password: 'Test1234!',   username: 'limtw',      display_name: '임태원',       role: 'user',  points: 44000 },
  ]

  const authIds: Record<string, string> = {}
  for (const u of usersData) {
    authIds[u.username] = await createAuthUser(u.email, u.password)
    console.log(`  ✓ ${u.display_name} (${u.email})`)
  }

  // users 테이블 upsert
  const { data: insertedUsers, error: userErr } = await admin.from('users').upsert(
    usersData.map(u => ({
      auth_id: authIds[u.username],
      username: u.username,
      display_name: u.display_name,
      email: u.email,
      points: u.points,
      role: u.role,
      bio: u.role === 'admin' ? '예견 서비스 관리자입니다.' : `안녕하세요! 예측 마켓 ${u.display_name}입니다.`,
    })),
    { onConflict: 'auth_id', ignoreDuplicates: false }
  ).select('id, username')
  if (userErr) throw userErr

  const userMap: Record<string, string> = {}
  for (const u of insertedUsers!) userMap[u.username] = u.id
  console.log(`  → ${insertedUsers!.length}명 완료\n`)

  // ──────────────────────────────────────────
  // 2. 카테고리 확인
  // ──────────────────────────────────────────
  const { data: cats } = await admin.from('categories').select('id, slug')
  const catMap: Record<string, number> = {}
  for (const c of cats ?? []) catMap[c.slug] = c.id

  // 카테고리가 없으면 삽입
  if (Object.keys(catMap).length === 0) {
    const { data: newCats } = await admin.from('categories').insert([
      { name: '정치', slug: 'politics', icon: '🏛️', color: '#6366f1' },
      { name: '경제', slug: 'economy',  icon: '📈', color: '#10b981' },
      { name: '스포츠', slug: 'sports', icon: '⚽', color: '#f59e0b' },
      { name: '테크', slug: 'tech',     icon: '💻', color: '#3b82f6' },
      { name: '엔터', slug: 'entertainment', icon: '🎬', color: '#ec4899' },
      { name: '기타', slug: 'other',    icon: '🔮', color: '#8b5cf6' },
    ]).select('id, slug')
    for (const c of newCats ?? []) catMap[c.slug] = c.id
  }
  console.log('📂 카테고리 확인 완료\n')

  // ──────────────────────────────────────────
  // 3. 마켓 생성
  // ──────────────────────────────────────────
  console.log('🏪 마켓 생성 중...')
  const now = new Date()
  const days = (n: number) => new Date(now.getTime() + n * 86400000).toISOString()

  const marketsToInsert = [
    // ── 정치 Binary
    {
      title: '2025년 대선에서 야당 후보가 당선될까?',
      description: '2025년 대통령 선거에서 현재 야당 1위 후보가 최종 당선될지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['admin'], category_id: catMap['politics'],
      close_date: days(120), yes_probability: 0.54,
      yes_amount: 320000, no_amount: 280000,
      total_volume: 600000, unique_traders: 48,
      slug: 'election-2025-opposition',
      tags: ['대선', '정치', '2025'],
    },
    {
      title: '올해 안에 국회에서 AI 규제법이 통과될까?',
      description: '인공지능 관련 규제 법안이 올해 국회 본회의를 통과할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['kimchul'], category_id: catMap['politics'],
      close_date: days(60), yes_probability: 0.31,
      yes_amount: 88000, no_amount: 195000,
      total_volume: 283000, unique_traders: 29,
      slug: 'ai-regulation-bill-2025',
      tags: ['AI', '국회', '규제'],
    },
    // ── 경제 Binary
    {
      title: '2025년 말 코스피가 3000을 돌파할까?',
      description: '2025년 12월 31일 종가 기준으로 코스피 지수가 3000포인트를 초과할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['hangjw'], category_id: catMap['economy'],
      close_date: days(90), yes_probability: 0.42,
      yes_amount: 145000, no_amount: 200000,
      total_volume: 345000, unique_traders: 67,
      slug: 'kospi-3000-2025',
      tags: ['코스피', '주식', '경제'],
    },
    {
      title: '올해 한국 기준금리가 한 번 더 인하될까?',
      description: '한국은행이 2025년 말까지 기준금리를 추가로 인하할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['parksh'], category_id: catMap['economy'],
      close_date: days(180), yes_probability: 0.67,
      yes_amount: 234000, no_amount: 115000,
      total_volume: 349000, unique_traders: 41,
      slug: 'bok-rate-cut-2025',
      tags: ['기준금리', '한국은행', '경제'],
    },
    // ── 스포츠 Binary
    {
      title: '손흥민이 이번 시즌 EPL 20골을 넘길까?',
      description: '토트넘 홋스퍼의 손흥민 선수가 이번 EPL 시즌에서 20골 이상을 기록할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['leeyj'], category_id: catMap['sports'],
      close_date: days(45), yes_probability: 0.38,
      yes_amount: 98000, no_amount: 160000,
      total_volume: 258000, unique_traders: 55,
      slug: 'son-20-goals-epl',
      tags: ['손흥민', '토트넘', 'EPL'],
    },
    {
      title: 'KBO 한국시리즈에서 LG 트윈스가 우승할까?',
      description: '2025 KBO 한국시리즈에서 LG 트윈스가 우승을 차지할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['baekjh'], category_id: catMap['sports'],
      close_date: days(200), yes_probability: 0.23,
      yes_amount: 56000, no_amount: 187000,
      total_volume: 243000, unique_traders: 38,
      slug: 'kbo-lg-wins-2025',
      tags: ['KBO', 'LG트윈스', '한국시리즈'],
    },
    // ── 테크 Binary
    {
      title: 'GPT-5가 2025년 상반기에 출시될까?',
      description: 'OpenAI가 GPT-5를 2025년 6월 30일 이전에 공식 출시할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['limtw'], category_id: catMap['tech'],
      close_date: days(30), yes_probability: 0.71,
      yes_amount: 412000, no_amount: 168000,
      total_volume: 580000, unique_traders: 93,
      slug: 'gpt5-release-h1-2025',
      tags: ['GPT-5', 'OpenAI', 'AI'],
    },
    {
      title: '삼성전자가 올해 HBM4 양산에 성공할까?',
      description: '삼성전자가 2025년 내로 HBM4 메모리 반도체 양산을 시작할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['admin'], category_id: catMap['tech'],
      close_date: days(150), yes_probability: 0.58,
      yes_amount: 178000, no_amount: 129000,
      total_volume: 307000, unique_traders: 44,
      slug: 'samsung-hbm4-mass-production',
      tags: ['삼성전자', 'HBM4', '반도체'],
    },
    // ── 엔터 Binary
    {
      title: 'BTS가 2025년 완전체 컴백을 할까?',
      description: '방탄소년단이 2025년 내에 7명 완전체로 공식 컴백 활동을 할지 예측합니다.',
      type: 'binary', status: 'open',
      creator_id: userMap['sonay'], category_id: catMap['entertainment'],
      close_date: days(240), yes_probability: 0.82,
      yes_amount: 678000, no_amount: 148000,
      total_volume: 826000, unique_traders: 124,
      slug: 'bts-full-comeback-2025',
      tags: ['BTS', '방탄소년단', '케이팝'],
    },
    // ── 해결된 마켓
    {
      title: '2024 파리올림픽에서 한국이 금메달 5개 이상 획득할까?',
      description: '2024 파리 하계올림픽에서 대한민국이 금메달 5개 이상을 획득할지 예측했습니다.',
      type: 'binary', status: 'resolved',
      creator_id: userMap['admin'], category_id: catMap['sports'],
      close_date: days(-90), resolved_at: days(-88), resolution: 'YES',
      yes_probability: 1.0,
      yes_amount: 520000, no_amount: 180000,
      total_volume: 700000, unique_traders: 89,
      slug: 'paris-olympics-korea-5-gold',
      tags: ['올림픽', '파리', '금메달'],
    },
    // ── Multiple Choice
    {
      title: '2025 KBO 최종 우승팀은?',
      description: '2025 KBO 리그 한국시리즈 최종 우승팀을 맞춰보세요.',
      type: 'multiple_choice', status: 'open',
      creator_id: userMap['limtw'], category_id: catMap['sports'],
      close_date: days(200),
      yes_probability: 0.5,
      yes_amount: 0, no_amount: 0,
      total_volume: 485000, unique_traders: 71,
      slug: 'kbo-winner-2025',
      tags: ['KBO', '우승', '프로야구'],
    },
    {
      title: '다음 한국 스타트업 유니콘은 어느 분야에서 나올까?',
      description: '2025년 기업가치 1조원을 달성하는 다음 한국 스타트업의 업종을 예측합니다.',
      type: 'multiple_choice', status: 'open',
      creator_id: userMap['hangjw'], category_id: catMap['tech'],
      close_date: days(300),
      yes_probability: 0.5,
      yes_amount: 0, no_amount: 0,
      total_volume: 192000, unique_traders: 33,
      slug: 'next-korea-unicorn-sector',
      tags: ['스타트업', '유니콘', '투자'],
    },
    // ── Numeric
    {
      title: '2025년 말 달러/원 환율은 얼마일까?',
      description: '2025년 12월 31일 기준 USD/KRW 환율을 예측합니다.',
      type: 'numeric', status: 'open',
      creator_id: userMap['parksh'], category_id: catMap['economy'],
      close_date: days(90),
      min_value: 1200, max_value: 1600, unit: '원',
      yes_probability: 0.5,
      yes_amount: 0, no_amount: 0,
      total_volume: 156000, unique_traders: 28,
      slug: 'usd-krw-end-2025',
      tags: ['환율', '달러', '경제'],
    },
  ]

  const { data: insertedMarkets, error: mktErr } = await admin.from('markets').insert(marketsToInsert).select('id, slug, type')
  if (mktErr) throw mktErr
  const marketMap: Record<string, string> = {}
  for (const m of insertedMarkets!) marketMap[m.slug] = m.id
  console.log(`  → ${insertedMarkets!.length}개 완료\n`)

  // ──────────────────────────────────────────
  // 4. Multiple Choice 옵션
  // ──────────────────────────────────────────
  console.log('🎯 마켓 옵션 생성 중...')
  const kboOptions = [
    { text: 'LG 트윈스', color: '#C40C0C', probability: 0.18, total_amount: 87300, sort_order: 0 },
    { text: 'KT 위즈',   color: '#E23D00', probability: 0.22, total_amount: 106700, sort_order: 1 },
    { text: '삼성 라이온즈', color: '#074CA1', probability: 0.15, total_amount: 72750, sort_order: 2 },
    { text: 'SSG 랜더스', color: '#CE0E2D', probability: 0.20, total_amount: 97000, sort_order: 3 },
    { text: '두산 베어스', color: '#131230', probability: 0.14, total_amount: 67900, sort_order: 4 },
    { text: '기타',       color: '#6b7280', probability: 0.11, total_amount: 53350, sort_order: 5 },
  ].map(o => ({ ...o, market_id: marketMap['kbo-winner-2025'] }))

  const unicornOptions = [
    { text: 'AI/ML',     color: '#6366f1', probability: 0.35, total_amount: 67200, sort_order: 0 },
    { text: '핀테크',    color: '#10b981', probability: 0.25, total_amount: 48000, sort_order: 1 },
    { text: '헬스케어',  color: '#f59e0b', probability: 0.20, total_amount: 38400, sort_order: 2 },
    { text: '이커머스',  color: '#3b82f6', probability: 0.12, total_amount: 23040, sort_order: 3 },
    { text: '기타',      color: '#8b5cf6', probability: 0.08, total_amount: 15360, sort_order: 4 },
  ].map(o => ({ ...o, market_id: marketMap['next-korea-unicorn-sector'] }))

  const { data: insertedOptions, error: optErr } = await admin.from('market_options')
    .insert([...kboOptions, ...unicornOptions]).select('id, market_id, text')
  if (optErr) throw optErr
  console.log(`  → ${insertedOptions!.length}개 완료\n`)

  // ──────────────────────────────────────────
  // 5. 예측 데이터
  // ──────────────────────────────────────────
  console.log('💰 예측 데이터 생성 중...')

  const bets = [
    // BTS 마켓 (가장 인기)
    { user_id: userMap['kimchul'],  market_id: marketMap['bts-full-comeback-2025'], outcome: 'YES', amount: 5000,  shares: 6097 },
    { user_id: userMap['leeyj'],    market_id: marketMap['bts-full-comeback-2025'], outcome: 'YES', amount: 10000, shares: 12195 },
    { user_id: userMap['parksh'],   market_id: marketMap['bts-full-comeback-2025'], outcome: 'NO',  amount: 3000,  shares: 17647 },
    { user_id: userMap['choims'],   market_id: marketMap['bts-full-comeback-2025'], outcome: 'YES', amount: 2000,  shares: 2439 },
    { user_id: userMap['hangjw'],   market_id: marketMap['bts-full-comeback-2025'], outcome: 'YES', amount: 15000, shares: 18292 },
    { user_id: userMap['sonay'],    market_id: marketMap['bts-full-comeback-2025'], outcome: 'YES', amount: 8000,  shares: 9756 },

    // GPT-5 마켓
    { user_id: userMap['limtw'],    market_id: marketMap['gpt5-release-h1-2025'], outcome: 'YES', amount: 20000, shares: 28169 },
    { user_id: userMap['hangjw'],   market_id: marketMap['gpt5-release-h1-2025'], outcome: 'YES', amount: 10000, shares: 14084 },
    { user_id: userMap['baekjh'],   market_id: marketMap['gpt5-release-h1-2025'], outcome: 'NO',  amount: 5000,  shares: 17241 },
    { user_id: userMap['junghr'],   market_id: marketMap['gpt5-release-h1-2025'], outcome: 'YES', amount: 7000,  shares: 9859 },

    // 코스피 마켓
    { user_id: userMap['parksh'],   market_id: marketMap['kospi-3000-2025'], outcome: 'NO',  amount: 8000,  shares: 13793 },
    { user_id: userMap['hangjw'],   market_id: marketMap['kospi-3000-2025'], outcome: 'YES', amount: 5000,  shares: 11904 },
    { user_id: userMap['kimchul'],  market_id: marketMap['kospi-3000-2025'], outcome: 'NO',  amount: 3000,  shares: 5172  },
    { user_id: userMap['limtw'],    market_id: marketMap['kospi-3000-2025'], outcome: 'YES', amount: 12000, shares: 28571 },

    // 환율 마켓 (numeric)
    { user_id: userMap['baekjh'],   market_id: marketMap['usd-krw-end-2025'], outcome: '1380', amount: 5000,  shares: 5000 },
    { user_id: userMap['sonay'],    market_id: marketMap['usd-krw-end-2025'], outcome: '1420', amount: 3000,  shares: 3000 },
    { user_id: userMap['ohsb'],     market_id: marketMap['usd-krw-end-2025'], outcome: '1350', amount: 2000,  shares: 2000 },

    // 기준금리 마켓
    { user_id: userMap['junghr'],   market_id: marketMap['bok-rate-cut-2025'], outcome: 'YES', amount: 4000,  shares: 5970  },
    { user_id: userMap['ohsb'],     market_id: marketMap['bok-rate-cut-2025'], outcome: 'YES', amount: 6000,  shares: 8955  },
    { user_id: userMap['kimchul'],  market_id: marketMap['bok-rate-cut-2025'], outcome: 'NO',  amount: 2000,  shares: 6060  },

    // 해결된 마켓 (파리올림픽 - YES로 해결)
    { user_id: userMap['limtw'],    market_id: marketMap['paris-olympics-korea-5-gold'], outcome: 'YES', amount: 10000, shares: 19230, payout: 19230 },
    { user_id: userMap['hangjw'],   market_id: marketMap['paris-olympics-korea-5-gold'], outcome: 'YES', amount: 8000,  shares: 15384, payout: 15384 },
    { user_id: userMap['parksh'],   market_id: marketMap['paris-olympics-korea-5-gold'], outcome: 'NO',  amount: 5000,  shares: 27777, payout: 0     },
    { user_id: userMap['choims'],   market_id: marketMap['paris-olympics-korea-5-gold'], outcome: 'YES', amount: 3000,  shares: 5769,  payout: 5769  },

    // 손흥민 마켓
    { user_id: userMap['leeyj'],    market_id: marketMap['son-20-goals-epl'], outcome: 'YES', amount: 5000,  shares: 13157 },
    { user_id: userMap['baekjh'],   market_id: marketMap['son-20-goals-epl'], outcome: 'NO',  amount: 8000,  shares: 12903 },
    { user_id: userMap['sonay'],    market_id: marketMap['son-20-goals-epl'], outcome: 'YES', amount: 3000,  shares: 7894  },

    // 삼성 HBM4 마켓
    { user_id: userMap['limtw'],    market_id: marketMap['samsung-hbm4-mass-production'], outcome: 'YES', amount: 15000, shares: 25862 },
    { user_id: userMap['junghr'],   market_id: marketMap['samsung-hbm4-mass-production'], outcome: 'YES', amount: 6000,  shares: 10344 },
    { user_id: userMap['ohsb'],     market_id: marketMap['samsung-hbm4-mass-production'], outcome: 'NO',  amount: 4000,  shares: 9523  },
  ]

  const { error: betErr } = await admin.from('bets').insert(bets)
  if (betErr) throw betErr
  console.log(`  → ${bets.length}개 완료\n`)

  // ──────────────────────────────────────────
  // 6. 댓글
  // ──────────────────────────────────────────
  console.log('💬 댓글 생성 중...')
  const comments = [
    // BTS
    { user_id: userMap['kimchul'],  market_id: marketMap['bts-full-comeback-2025'], content: '전역 후 컴백은 확실한 거 아닌가요? 거의 기정사실 아님?' },
    { user_id: userMap['sonay'],    market_id: marketMap['bts-full-comeback-2025'], content: '공식 발표 전까지는 모르는 거죠ㅋㅋ 저도 기대하지만...' },
    { user_id: userMap['leeyj'],    market_id: marketMap['bts-full-comeback-2025'], content: '솔로 활동이 많아서 완전체 컴백은 좀 더 걸릴 수도 있을 것 같아요' },
    { user_id: userMap['hangjw'],   market_id: marketMap['bts-full-comeback-2025'], content: 'YES에 크게 걸었습니다. 확신이 있음 😎' },
    // GPT-5
    { user_id: userMap['limtw'],    market_id: marketMap['gpt5-release-h1-2025'], content: '이미 내부 테스트 중이라는 리크가 있었죠. YES 확률 더 올라갈 듯' },
    { user_id: userMap['baekjh'],   market_id: marketMap['gpt5-release-h1-2025'], content: 'Anthropic이 Claude 4로 OpenAI 압박하고 있으니 더 빨리 나올 것 같은데요' },
    { user_id: userMap['junghr'],   market_id: marketMap['gpt5-release-h1-2025'], content: '마케팅 타이밍상 여름 전에 내는 게 유리할 거예요' },
    // 코스피
    { user_id: userMap['parksh'],   market_id: marketMap['kospi-3000-2025'], content: '미국 금리 인하 속도가 관건이라고 봅니다. 아직 불확실성이 너무 커요' },
    { user_id: userMap['hangjw'],   market_id: marketMap['kospi-3000-2025'], content: '반도체 사이클 회복되면 충분히 가능하다고 봄. YES' },
    // 대선
    { user_id: userMap['ohsb'],     market_id: marketMap['election-2025-opposition'], content: '여론조사 믿기가 어렵죠... 실제 투표율이 변수' },
    { user_id: userMap['choims'],   market_id: marketMap['election-2025-opposition'], content: '2030 투표율이 핵심 변수가 될 것 같아요' },
    // 환율
    { user_id: userMap['baekjh'],   market_id: marketMap['usd-krw-end-2025'], content: '연말 환율은 미 연준 정책에 달려있는데 1350~1400 구간이 유력하지 않을까요' },
    { user_id: userMap['sonay'],    market_id: marketMap['usd-krw-end-2025'], content: '저는 1400 넘을 것 같습니다. 경상수지 적자 우려가 있어서요' },
  ]
  const { error: cmtErr } = await admin.from('comments').insert(comments)
  if (cmtErr) throw cmtErr
  console.log(`  → ${comments.length}개 완료\n`)

  // ──────────────────────────────────────────
  // 7. 팔로우
  // ──────────────────────────────────────────
  console.log('👥 팔로우 관계 생성 중...')
  const follows = [
    { follower_id: userMap['kimchul'], following_id: userMap['limtw']   },
    { follower_id: userMap['kimchul'], following_id: userMap['hangjw']  },
    { follower_id: userMap['leeyj'],   following_id: userMap['limtw']   },
    { follower_id: userMap['parksh'],  following_id: userMap['admin']   },
    { follower_id: userMap['choims'],  following_id: userMap['hangjw']  },
    { follower_id: userMap['sonay'],   following_id: userMap['kimchul'] },
    { follower_id: userMap['baekjh'],  following_id: userMap['limtw']   },
    { follower_id: userMap['junghr'],  following_id: userMap['parksh']  },
    { follower_id: userMap['ohsb'],    following_id: userMap['hangjw']  },
    { follower_id: userMap['limtw'],   following_id: userMap['admin']   },
  ]
  const { error: fwErr } = await admin.from('follows').insert(follows)
  if (fwErr) throw fwErr
  console.log(`  → ${follows.length}개 완료\n`)

  // ──────────────────────────────────────────
  // 8. 포인트 트랜잭션 (일부)
  // ──────────────────────────────────────────
  console.log('📊 포인트 트랜잭션 생성 중...')
  const txns = [
    { user_id: userMap['limtw'],   type: 'bet_won',     amount: 9230,  balance: 44000 + 9230,  note: '파리올림픽 금메달 5개+ 정산' },
    { user_id: userMap['hangjw'],  type: 'bet_won',     amount: 7384,  balance: 35000 + 7384,  note: '파리올림픽 금메달 5개+ 정산' },
    { user_id: userMap['choims'],  type: 'bet_won',     amount: 2769,  balance: 4200 + 2769,   note: '파리올림픽 금메달 5개+ 정산' },
    { user_id: userMap['kimchul'], type: 'bet_placed',  amount: -5000, balance: 12500 - 5000,  note: 'BTS 완전체 컴백 - YES' },
    { user_id: userMap['limtw'],   type: 'bet_placed',  amount: -20000, balance: 44000 - 20000, note: 'GPT-5 출시 - YES' },
    { user_id: userMap['hangjw'],  type: 'admin_adjust', amount: 5000, balance: 35000 + 5000,  note: '이벤트 보너스 지급' },
  ]
  const { error: txErr } = await admin.from('point_transactions').insert(txns)
  if (txErr) throw txErr
  console.log(`  → ${txns.length}개 완료\n`)

  console.log('✅ 시드 완료!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔑 관리자 계정')
  console.log('   이메일:    admin@yegyeon.com')
  console.log('   비밀번호:  Admin1234!')
  console.log('   관리자URL: http://localhost:3000/admin')
  console.log('')
  console.log('👤 테스트 유저 (비밀번호 공통: Test1234!)')
  for (const u of usersData.filter(u => u.role === 'user').slice(0, 5)) {
    console.log(`   ${u.display_name.padEnd(6)} (${u.email}) — ${u.points.toLocaleString()}₣`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(e => { console.error('❌ 오류:', e.message); process.exit(1) })
