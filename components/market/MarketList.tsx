import { Search } from 'lucide-react'
import MarketCard from './MarketCard'
import type { Market } from '@/types/index'

interface MarketListProps {
  markets: Market[]
  emptyMessage?: string
}

export default function MarketList({
  markets,
  emptyMessage = '마켓이 없습니다.',
}: MarketListProps) {
  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-10 w-10 text-ink-300 mb-3" />
        <p className="text-ink-600 font-medium">{emptyMessage}</p>
        <p className="text-ink-400 text-sm mt-1">
          다른 카테고리나 검색어를 시도해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-ink-200/40">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
