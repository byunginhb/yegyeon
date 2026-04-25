import Link from 'next/link'
import { adminSupabase } from '@/lib/supabase/admin'
import type { Market } from '@/types'

interface RelatedQuestionsProps {
  currentMarketId: string
  categoryId: number | null
}

export default async function RelatedQuestions({
  currentMarketId,
  categoryId,
}: RelatedQuestionsProps) {
  let query = adminSupabase
    .from('markets')
    .select(
      `id, slug, title, yes_probability, type, unique_traders,
       creator:users!creator_id(display_name, avatar_url)`
    )
    .eq('is_hidden', false)
    .eq('status', 'open')
    .neq('id', currentMarketId)
    .order('unique_traders', { ascending: false })
    .limit(10)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data } = await query
  const markets = (data ?? []) as unknown as (Market & {
    creator?: { display_name: string; avatar_url: string | null }
  })[]

  if (markets.length === 0) return null

  return (
    <div>
      <h3 className="text-base font-semibold text-ink-900 mb-4">관련 질문</h3>
      <div className="space-y-0 divide-y divide-ink-200">
        {markets.map((m) => {
          const yesPercent = Math.round(m.yes_probability * 100)
          const isHigh = yesPercent >= 60
          const isLow = yesPercent <= 40

          return (
            <Link
              key={m.id}
              href={`/market/${m.slug}`}
              className="flex items-start gap-3 py-3 hover:bg-canvas-50 rounded-lg px-2 -mx-2 transition-colors group"
            >
              {/* 생성자 아바타 */}
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary overflow-hidden">
                {m.creator?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.creator.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (m.creator?.display_name ?? '?').slice(0, 1).toUpperCase()
                )}
              </div>

              {/* 제목 + 확률 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 group-hover:text-primary leading-snug line-clamp-2">
                  {m.title}
                </p>
              </div>

              {/* 확률 */}
              {m.type === 'binary' && (
                <div className="shrink-0 text-right">
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      isHigh ? 'text-teal-500' : isLow ? 'text-scarlet-500' : 'text-ink-600'
                    }`}
                  >
                    {yesPercent}%
                  </span>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
