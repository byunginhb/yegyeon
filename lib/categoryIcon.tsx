import {
  Landmark,
  BarChart2,
  Zap,
  Cpu,
  Film,
  Globe,
  Tag,
  Mic2,
  Newspaper,
  Scale,
  Gamepad2,
  Music,
  DollarSign,
  FlaskConical,
  Heart,
  Trophy,
  TrendingUp,
  Star,
  Vote,
  Plane,
  ShoppingCart,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

// 슬러그 → 아이콘 (기존 표시 로직용)
const SLUG_MAP: Record<string, LucideIcon> = {
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
  culture: Mic2,
  엔터: Film,
  international: Globe,
  global: Globe,
  world: Globe,
  국제: Globe,
  other: Tag,
  기타: Tag,
  fun: Tag,
}

// 관리자가 선택 가능한 아이콘 목록
export const AVAILABLE_ICONS: { name: string; Icon: LucideIcon; label: string }[] = [
  { name: 'Landmark', Icon: Landmark, label: '정치/사회' },
  { name: 'BarChart2', Icon: BarChart2, label: '경제/금융' },
  { name: 'Zap', Icon: Zap, label: '스포츠' },
  { name: 'Cpu', Icon: Cpu, label: 'IT/AI' },
  { name: 'Film', Icon: Film, label: '영화/연예' },
  { name: 'Mic2', Icon: Mic2, label: '음악/K-pop' },
  { name: 'Globe', Icon: Globe, label: '국제' },
  { name: 'Tag', Icon: Tag, label: '기타' },
  { name: 'Newspaper', Icon: Newspaper, label: '뉴스' },
  { name: 'Scale', Icon: Scale, label: '법률' },
  { name: 'Gamepad2', Icon: Gamepad2, label: '게임' },
  { name: 'Music', Icon: Music, label: '음악' },
  { name: 'DollarSign', Icon: DollarSign, label: '금융' },
  { name: 'FlaskConical', Icon: FlaskConical, label: '과학' },
  { name: 'Heart', Icon: Heart, label: '건강' },
  { name: 'Trophy', Icon: Trophy, label: '시상/순위' },
  { name: 'TrendingUp', Icon: TrendingUp, label: '트렌드' },
  { name: 'Star', Icon: Star, label: '인기' },
  { name: 'Vote', Icon: Vote, label: '선거' },
  { name: 'Plane', Icon: Plane, label: '여행' },
  { name: 'ShoppingCart', Icon: ShoppingCart, label: '쇼핑' },
  { name: 'Utensils', Icon: Utensils, label: '음식' },
]

// 아이콘 이름 → 컴포넌트 (DB 저장값 기반 조회)
const NAME_MAP: Record<string, LucideIcon> = Object.fromEntries(
  AVAILABLE_ICONS.map(({ name, Icon }) => [name, Icon])
)

export function getCategoryIcon(slug: string): LucideIcon {
  return SLUG_MAP[slug.toLowerCase()] ?? Tag
}

export function getCategoryIconByName(name: string): LucideIcon {
  return NAME_MAP[name] ?? Tag
}

export function CategoryIcon({ slug, className = 'h-3 w-3' }: { slug: string; className?: string }) {
  const Icon = getCategoryIcon(slug)
  return <Icon className={className} />
}

export function CategoryIconByName({ name, className = 'h-3 w-3' }: { name: string; className?: string }) {
  const Icon = getCategoryIconByName(name)
  return <Icon className={className} />
}
