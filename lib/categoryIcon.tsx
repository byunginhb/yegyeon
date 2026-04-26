import {
  Landmark,
  BarChart2,
  Zap,
  Cpu,
  Film,
  Globe,
  Tag,
  Mic2,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  politics: Landmark,
  'politics-society': Landmark,
  정치: Landmark,
  economy: BarChart2,
  'economy-finance': BarChart2,
  경제: BarChart2,
  finance: BarChart2,
  sports: Zap,
  스포츠: Zap,
  tech: Cpu,
  'it-ai': Cpu,
  테크: Cpu,
  entertainment: Film,
  kpop: Mic2,
  '연예-k-문화': Mic2,
  엔터: Film,
  international: Globe,
  global: Globe,
  국제: Globe,
  other: Tag,
  기타: Tag,
  fun: Tag,
}

export function getCategoryIcon(slug: string): LucideIcon {
  return ICON_MAP[slug.toLowerCase()] ?? Tag
}

interface CategoryIconProps {
  slug: string
  className?: string
}

export function CategoryIcon({ slug, className = 'h-3 w-3' }: CategoryIconProps) {
  const Icon = getCategoryIcon(slug)
  return <Icon className={className} />
}
