import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const VALID_KINDS = ['terms_of_service', 'privacy_policy', 'terms_of_use'] as const
type LegalKind = (typeof VALID_KINDS)[number]

const KIND_LABELS: Record<LegalKind, string> = {
  terms_of_service: '서비스 약관',
  privacy_policy: '개인정보 처리방침',
  terms_of_use: '이용 약관',
}

const KIND_ORDER: LegalKind[] = ['terms_of_service', 'privacy_policy', 'terms_of_use']

function isValidKind(value: string): value is LegalKind {
  return (VALID_KINDS as readonly string[]).includes(value)
}

export async function generateMetadata(
  { params }: { params: Promise<{ kind: string }> }
): Promise<Metadata> {
  const { kind } = await params
  if (!isValidKind(kind)) {
    return { title: '예견 — 약관' }
  }
  return {
    title: `${KIND_LABELS[kind]} — 예견`,
    description: `예견 서비스의 ${KIND_LABELS[kind]}입니다.`,
  }
}

function renderMarkdown(content: string): React.ReactElement {
  // 간단한 마크다운 렌더러: #, ##, ###, -, **굵게**, *기울임*
  const lines = content.split('\n')
  const blocks: React.ReactElement[] = []
  let listBuffer: string[] = []
  let keyCounter = 0

  function flushList() {
    if (listBuffer.length === 0) return
    blocks.push(
      <ul key={`list-${keyCounter++}`} className="list-disc list-inside space-y-1.5 my-3 text-ink-700 text-sm leading-relaxed">
        {listBuffer.map((item, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </ul>
    )
    listBuffer = []
  }

  function inlineFormat(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith('# ')) {
      flushList()
      blocks.push(
        <h1 key={`h1-${keyCounter++}`} className="text-2xl font-bold text-ink-900 mt-6 mb-3 first:mt-0">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      blocks.push(
        <h2 key={`h2-${keyCounter++}`} className="text-lg font-semibold text-ink-900 mt-6 mb-2">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      blocks.push(
        <h3 key={`h3-${keyCounter++}`} className="text-base font-semibold text-ink-900 mt-4 mb-1.5">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else if (line === '') {
      flushList()
    } else {
      flushList()
      blocks.push(
        <p
          key={`p-${keyCounter++}`}
          className="text-sm text-ink-700 leading-relaxed my-2"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
        />
      )
    }
  }
  flushList()

  return <div>{blocks}</div>
}

export default async function LegalPage(
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params
  if (!isValidKind(kind)) {
    notFound()
  }

  const supabase = await createServerSupabaseClient()
  const { data: doc } = await supabase
    .from('legal_documents')
    .select('title, content, version, updated_at')
    .eq('kind', kind)
    .single()

  if (!doc) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-canvas-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 약관 종류 탭 */}
        <nav className="flex gap-1 mb-4 border-b border-ink-200 overflow-x-auto">
          {KIND_ORDER.map((k) => (
            <Link
              key={k}
              href={`/legal/${k}`}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                k === kind
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-600 hover:text-ink-900'
              }`}
            >
              {KIND_LABELS[k]}
            </Link>
          ))}
        </nav>

        <article className="bg-canvas-0 border border-ink-200 rounded-xl p-6 sm:p-8">
          <header className="mb-6 pb-4 border-b border-ink-200">
            <h1 className="text-2xl font-bold text-ink-900">{doc.title}</h1>
            <p className="text-xs text-ink-500 mt-2">
              버전 v{doc.version} · 최종 수정 {new Date(doc.updated_at).toLocaleDateString('ko-KR')}
            </p>
          </header>
          <div className="prose-yegyeon">{renderMarkdown(doc.content)}</div>
        </article>
      </div>
    </div>
  )
}
