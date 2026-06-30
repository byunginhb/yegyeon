'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Edit,
  Eye,
  Filter,
  Flag,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  LineChart,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Minus,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import WelcomePopup from '@/components/common/WelcomePopup'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* -------------------------------------------------------------------------- */
/*                                 데이터 정의                                */
/* -------------------------------------------------------------------------- */

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'colors', label: '1. 색상 팔레트' },
  { id: 'typography', label: '2. 타이포그래피' },
  { id: 'buttons', label: '3. 버튼' },
  { id: 'inputs', label: '4. 인풋 / 폼' },
  { id: 'badges', label: '5. 배지 / 상태' },
  { id: 'cards', label: '6. 카드 / 컨테이너' },
  { id: 'spacing', label: '7. 간격 / 스페이싱' },
  { id: 'icons', label: '8. 아이콘' },
  { id: 'dialog', label: '9. 다이얼로그' },
  { id: 'toast', label: '10. 토스트' },
]

const INK_SCALE = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const
const CANVAS_SCALE = [0, 50, 100] as const
const SEMANTIC_COLORS = [
  { name: 'background', cls: 'bg-background', label: 'background', textCls: 'text-foreground' },
  { name: 'foreground', cls: 'bg-foreground', label: 'foreground', textCls: 'text-background' },
  { name: 'card', cls: 'bg-card', label: 'card', textCls: 'text-card-foreground' },
  { name: 'popover', cls: 'bg-popover', label: 'popover', textCls: 'text-popover-foreground' },
  { name: 'primary', cls: 'bg-primary', label: 'primary', textCls: 'text-primary-foreground' },
  { name: 'secondary', cls: 'bg-secondary', label: 'secondary', textCls: 'text-secondary-foreground' },
  { name: 'muted', cls: 'bg-muted', label: 'muted', textCls: 'text-muted-foreground' },
  { name: 'accent', cls: 'bg-accent', label: 'accent', textCls: 'text-accent-foreground' },
  { name: 'destructive', cls: 'bg-destructive', label: 'destructive', textCls: 'text-white' },
  { name: 'border', cls: 'bg-border', label: 'border', textCls: 'text-foreground' },
] as const

const TEAL_SCALE = [300, 400, 500, 600, 700] as const
const SCARLET_SCALE = [300, 400, 500, 600, 700] as const
const BRAND_SCALE = [500, 600] as const

const SPACING_TOKENS: Array<{ key: string; px: number; cls: string }> = [
  { key: '1', px: 4, cls: 'w-1' },
  { key: '2', px: 8, cls: 'w-2' },
  { key: '3', px: 12, cls: 'w-3' },
  { key: '4', px: 16, cls: 'w-4' },
  { key: '5', px: 20, cls: 'w-5' },
  { key: '6', px: 24, cls: 'w-6' },
  { key: '8', px: 32, cls: 'w-8' },
  { key: '10', px: 40, cls: 'w-10' },
  { key: '12', px: 48, cls: 'w-12' },
  { key: '16', px: 64, cls: 'w-16' },
]

const ICON_SET = [
  { Icon: Home, name: 'Home' },
  { Icon: Search, name: 'Search' },
  { Icon: User, name: 'User' },
  { Icon: Users, name: 'Users' },
  { Icon: Bell, name: 'Bell' },
  { Icon: Settings, name: 'Settings' },
  { Icon: LayoutDashboard, name: 'LayoutDashboard' },
  { Icon: Activity, name: 'Activity' },
  { Icon: TrendingUp, name: 'TrendingUp' },
  { Icon: TrendingDown, name: 'TrendingDown' },
  { Icon: LineChart, name: 'LineChart' },
  { Icon: Coins, name: 'Coins' },
  { Icon: Calendar, name: 'Calendar' },
  { Icon: Clock, name: 'Clock' },
  { Icon: Filter, name: 'Filter' },
  { Icon: Flag, name: 'Flag' },
  { Icon: Heart, name: 'Heart' },
  { Icon: Bookmark, name: 'Bookmark' },
  { Icon: Star, name: 'Star' },
  { Icon: MessageCircle, name: 'MessageCircle' },
  { Icon: Share2, name: 'Share2' },
  { Icon: Mail, name: 'Mail' },
  { Icon: Lock, name: 'Lock' },
  { Icon: LogIn, name: 'LogIn' },
  { Icon: LogOut, name: 'LogOut' },
  { Icon: Eye, name: 'Eye' },
  { Icon: Edit, name: 'Edit' },
  { Icon: Plus, name: 'Plus' },
  { Icon: Minus, name: 'Minus' },
  { Icon: Trash2, name: 'Trash2' },
  { Icon: Check, name: 'Check' },
  { Icon: CheckCircle2, name: 'CheckCircle2' },
  { Icon: X, name: 'X' },
  { Icon: XCircle, name: 'XCircle' },
  { Icon: Info, name: 'Info' },
  { Icon: AlertCircle, name: 'AlertCircle' },
  { Icon: ArrowRight, name: 'ArrowRight' },
  { Icon: ChevronDown, name: 'ChevronDown' },
  { Icon: ChevronRight, name: 'ChevronRight' },
  { Icon: MoreHorizontal, name: 'MoreHorizontal' },
  { Icon: Sun, name: 'Sun' },
  { Icon: Moon, name: 'Moon' },
  { Icon: Loader2, name: 'Loader2' },
] as const

/* -------------------------------------------------------------------------- */
/*                              재사용 서브 컴포넌트                          */
/* -------------------------------------------------------------------------- */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="space-y-1 border-b border-border pb-3">
        <h2 className="text-2xl font-semibold text-ink-1000">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function SubGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-ink-700">{title}</h3>
      {children}
    </div>
  )
}

function ColorSwatch({
  cls,
  label,
  token,
  textCls = 'text-ink-1000',
}: {
  cls: string
  label: string
  token: string
  textCls?: string
}) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-border">
      <div className={`h-16 w-full ${cls}`} />
      <div className="space-y-0.5 bg-card p-2">
        <div className={`text-xs font-medium ${textCls}`}>{label}</div>
        <code className="block text-[11px] text-muted-foreground">
          {token}
        </code>
      </div>
    </div>
  )
}

function StatusMarketBadge({
  status,
}: {
  status: '승인대기' | '진행중' | '마감' | '종료' | '거절'
}) {
  const map: Record<typeof status, string> = {
    승인대기: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30',
    진행중: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30',
    마감: 'bg-ink-300/40 text-ink-700 ring-1 ring-ink-300/60',
    종료: 'bg-ink-200/60 text-ink-600 ring-1 ring-ink-300',
    거절: 'bg-scarlet-500/15 text-scarlet-700 dark:text-scarlet-300 ring-1 ring-scarlet-500/30',
  }
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${map[status]}`}
    >
      {status}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  메인 페이지                               */
/* -------------------------------------------------------------------------- */

export default function DesignSystemPage() {
  const [inputValue, setInputValue] = useState('')
  const [textareaValue, setTextareaValue] = useState('')
  const [checked, setChecked] = useState(true)
  const [selectValue, setSelectValue] = useState<string | null>('option-1')
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)

  return (
    <div className="min-h-screen bg-canvas-100">
      {/* 페이지 헤더 */}
      <header className="border-b border-border bg-canvas-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-ink-1000">
                디자인 시스템 — 예견
              </h1>
              <p className="text-sm text-muted-foreground">
                Manifold Markets 토큰 기반의 한국판 예측 시장 UI 시스템
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* 좌측 sticky 목차 */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav
            aria-label="섹션 목차"
            className="sticky top-8 space-y-1 rounded-xl border border-border bg-canvas-0 p-3"
          >
            <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              섹션
            </div>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-2 py-1.5 text-sm text-ink-700 transition-colors hover:bg-muted hover:text-ink-1000"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* 본문 */}
        <main className="flex-1 space-y-12">
          {/* 1. 색상 팔레트 ────────────────────────────── */}
          <Section
            id="colors"
            title="1. 색상 팔레트"
            description="모든 색상은 Tailwind v4 토큰으로 정의되어 있으며 다크/라이트 모드 자동 전환됩니다. 하드코딩된 hex 사용 금지."
          >
            <SubGroup title="시맨틱 컬러 (shadcn 호환)">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {SEMANTIC_COLORS.map((c) => (
                  <ColorSwatch
                    key={c.name}
                    cls={c.cls}
                    label={c.label}
                    token={`var(--${c.name})`}
                  />
                ))}
              </div>
            </SubGroup>

            <SubGroup title="ink — 텍스트 / 경계선 (0 → 1000)">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
                {INK_SCALE.map((n) => (
                  <ColorSwatch
                    key={n}
                    cls={`bg-ink-${n}`}
                    label={`ink-${n}`}
                    token={`var(--ink-${n})`}
                  />
                ))}
              </div>
            </SubGroup>

            <SubGroup title="canvas — 배경">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {CANVAS_SCALE.map((n) => (
                  <ColorSwatch
                    key={n}
                    cls={`bg-canvas-${n}`}
                    label={`canvas-${n}`}
                    token={`var(--canvas-${n})`}
                  />
                ))}
              </div>
            </SubGroup>

            <SubGroup title="teal — YES / 승인 / 성공">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {TEAL_SCALE.map((n) => (
                  <ColorSwatch
                    key={n}
                    cls={`bg-teal-${n}`}
                    label={`teal-${n}`}
                    token={`var(--yes-${n})`}
                  />
                ))}
              </div>
            </SubGroup>

            <SubGroup title="scarlet — NO / 위험 / 거절">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {SCARLET_SCALE.map((n) => (
                  <ColorSwatch
                    key={n}
                    cls={`bg-scarlet-${n}`}
                    label={`scarlet-${n}`}
                    token={`var(--no-${n})`}
                  />
                ))}
              </div>
            </SubGroup>

            <SubGroup title="brand — 브랜드 액센트">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BRAND_SCALE.map((n) => (
                  <ColorSwatch
                    key={n}
                    cls={`bg-brand-${n}`}
                    label={`brand-${n}`}
                    token={`#${n === 500 ? '6366f1' : '4f46e5'}`}
                  />
                ))}
              </div>
            </SubGroup>

            <SubGroup title="amber — 경고 / 대기 (Tailwind 기본 팔레트)">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[300, 400, 500, 600, 700].map((n) => (
                  <ColorSwatch
                    key={n}
                    cls={`bg-amber-${n}`}
                    label={`amber-${n}`}
                    token={`tailwind/amber-${n}`}
                  />
                ))}
              </div>
            </SubGroup>
          </Section>

          {/* 2. 타이포그래피 ────────────────────────────── */}
          <Section
            id="typography"
            title="2. 타이포그래피"
            description="Figtree(라틴) + Noto Sans KR(한글). 폰트 사이즈는 기본 +2px 확장된 체계."
          >
            <div className="space-y-4 rounded-xl border border-border bg-canvas-0 p-6">
              <div className="space-y-1">
                <h1 className="text-5xl font-bold text-ink-1000">
                  H1 — 50px 가장 큰 제목
                </h1>
                <code className="text-xs text-muted-foreground">
                  text-5xl font-bold
                </code>
              </div>
              <Separator />
              <div className="space-y-1">
                <h2 className="text-4xl font-semibold text-ink-1000">
                  H2 — 38px 페이지 제목
                </h2>
                <code className="text-xs text-muted-foreground">
                  text-4xl font-semibold
                </code>
              </div>
              <Separator />
              <div className="space-y-1">
                <h3 className="text-3xl font-semibold text-ink-1000">
                  H3 — 32px 섹션 제목
                </h3>
                <code className="text-xs text-muted-foreground">
                  text-3xl font-semibold
                </code>
              </div>
              <Separator />
              <div className="space-y-1">
                <h4 className="text-2xl font-medium text-ink-1000">
                  H4 — 26px 서브섹션
                </h4>
                <code className="text-xs text-muted-foreground">
                  text-2xl font-medium
                </code>
              </div>
              <Separator />
              <div className="space-y-1">
                <h5 className="text-xl font-medium text-ink-900">
                  H5 — 22px 강조 텍스트
                </h5>
                <code className="text-xs text-muted-foreground">
                  text-xl font-medium
                </code>
              </div>
              <Separator />
              <div className="space-y-1">
                <h6 className="text-lg font-medium text-ink-900">
                  H6 — 20px 카드 타이틀
                </h6>
                <code className="text-xs text-muted-foreground">
                  text-lg font-medium
                </code>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-base text-ink-800">
                  Body — 18px 본문 단락. 한국판 예측 시장 플랫폼 예견은 Manifold
                  Markets의 디자인을 한국에 맞게 현지화했습니다. 내부 포인트(₣)
                  시스템을 사용합니다.
                </p>
                <code className="text-xs text-muted-foreground">text-base</code>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-ink-700">
                  Small — 16px 보조 본문. 카드 설명, 폼 도움말 등에 사용됩니다.
                </p>
                <code className="text-xs text-muted-foreground">text-sm</code>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Caption — 14px 메타 정보, 타임스탬프, 라벨용
                </p>
                <code className="text-xs text-muted-foreground">text-xs</code>
              </div>
              <Separator />
              <div className="space-y-1">
                <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm text-ink-1000">
                  const probability = calculateCpmm(yes, no)
                </code>
                <div>
                  <code className="text-xs text-muted-foreground">
                    inline code — font-mono bg-muted
                  </code>
                </div>
              </div>
            </div>
          </Section>

          {/* 3. 버튼 ────────────────────────────── */}
          <Section
            id="buttons"
            title="3. 버튼"
            description="Button 컴포넌트의 모든 variant × size 조합. 아이콘 버튼 포함."
          >
            <SubGroup title="Variants">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-canvas-0 p-5">
                <Button variant="default">Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
                <Button disabled>Disabled</Button>
              </div>
            </SubGroup>

            <SubGroup title="Sizes">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-canvas-0 p-5">
                <Button size="xs">xs</Button>
                <Button size="sm">sm</Button>
                <Button size="default">default</Button>
                <Button size="lg">lg</Button>
              </div>
            </SubGroup>

            <SubGroup title="Icon Buttons">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-canvas-0 p-5">
                <Button size="icon-xs" variant="outline">
                  <Plus />
                </Button>
                <Button size="icon-sm" variant="outline">
                  <Plus />
                </Button>
                <Button size="icon" variant="outline">
                  <Plus />
                </Button>
                <Button size="icon-lg" variant="outline">
                  <Plus />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button size="icon" variant="ghost">
                  <Heart />
                </Button>
                <Button size="icon" variant="ghost">
                  <Bookmark />
                </Button>
                <Button size="icon" variant="ghost">
                  <Share2 />
                </Button>
                <Button size="icon" variant="destructive">
                  <Trash2 />
                </Button>
              </div>
            </SubGroup>

            <SubGroup title="아이콘 + 텍스트">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-canvas-0 p-5">
                <Button>
                  <Plus />
                  새 마켓 만들기
                </Button>
                <Button variant="outline">
                  <Filter />
                  필터
                </Button>
                <Button variant="secondary">
                  자세히 보기
                  <ArrowRight />
                </Button>
                <Button variant="ghost">
                  <Loader2 className="animate-spin" />
                  로딩 중...
                </Button>
              </div>
            </SubGroup>

            <SubGroup title="버튼 그리드 (variant × size)">
              <div className="overflow-x-auto rounded-xl border border-border bg-canvas-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="p-3 text-xs font-medium text-muted-foreground">
                        variant \ size
                      </th>
                      <th className="p-3 text-xs font-medium text-muted-foreground">
                        sm
                      </th>
                      <th className="p-3 text-xs font-medium text-muted-foreground">
                        default
                      </th>
                      <th className="p-3 text-xs font-medium text-muted-foreground">
                        lg
                      </th>
                      <th className="p-3 text-xs font-medium text-muted-foreground">
                        icon
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['default', 'outline', 'secondary', 'ghost', 'destructive'] as const).map(
                      (v) => (
                        <tr key={v} className="border-b border-border last:border-b-0">
                          <td className="p-3 font-mono text-xs text-ink-700">
                            {v}
                          </td>
                          <td className="p-3">
                            <Button variant={v} size="sm">
                              버튼
                            </Button>
                          </td>
                          <td className="p-3">
                            <Button variant={v}>버튼</Button>
                          </td>
                          <td className="p-3">
                            <Button variant={v} size="lg">
                              버튼
                            </Button>
                          </td>
                          <td className="p-3">
                            <Button variant={v} size="icon">
                              <Plus />
                            </Button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </SubGroup>
          </Section>

          {/* 4. 인풋 / 폼 ────────────────────────────── */}
          <Section
            id="inputs"
            title="4. 인풋 / 폼"
            description="Input, Select, Textarea, Checkbox, Label 폼 요소 모음."
          >
            <div className="grid gap-6 rounded-xl border border-border bg-canvas-0 p-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds-input-default">Input — 기본</Label>
                <Input
                  id="ds-input-default"
                  placeholder="값을 입력하세요"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  현재 값: {inputValue || '—'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-input-disabled">Input — 비활성</Label>
                <Input
                  id="ds-input-disabled"
                  disabled
                  defaultValue="입력 불가"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-input-error">Input — 에러 상태</Label>
                <Input
                  id="ds-input-error"
                  aria-invalid
                  defaultValue="잘못된 값"
                />
                <p className="text-xs text-destructive">
                  올바른 형식이 아닙니다
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-input-search">Input — 아이콘 인접</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ds-input-search"
                    className="pl-8"
                    placeholder="마켓 검색..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-select">Select</Label>
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger id="ds-select" className="w-full">
                    <SelectValue placeholder="옵션을 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>카테고리</SelectLabel>
                      <SelectItem value="option-1">정치</SelectItem>
                      <SelectItem value="option-2">스포츠</SelectItem>
                      <SelectItem value="option-3">경제</SelectItem>
                      <SelectItem value="option-4">기술</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  선택값: {selectValue ?? '—'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ds-textarea">Textarea</Label>
                <textarea
                  id="ds-textarea"
                  rows={4}
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  placeholder="마켓 설명을 입력하세요..."
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
                />
                <p className="text-xs text-muted-foreground">
                  {textareaValue.length}자
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <span>이용 약관에 동의합니다 ({checked ? '체크됨' : '미체크'})</span>
                </Label>
                <Label className="cursor-pointer opacity-50">
                  <input
                    type="checkbox"
                    disabled
                    className="size-4 rounded border-input accent-primary"
                  />
                  <span>비활성화 항목</span>
                </Label>
              </div>
            </div>
          </Section>

          {/* 5. 배지 ────────────────────────────── */}
          <Section
            id="badges"
            title="5. 배지 / 상태 표시"
            description="Badge variant와 마켓 상태 배지 (승인대기 / 진행중 / 마감 / 종료 / 거절)."
          >
            <SubGroup title="Badge — Variants">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-canvas-0 p-5">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="ghost">Ghost</Badge>
                <Badge variant="link">Link</Badge>
              </div>
            </SubGroup>

            <SubGroup title="마켓 상태 배지">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-canvas-0 p-5">
                <StatusMarketBadge status="승인대기" />
                <StatusMarketBadge status="진행중" />
                <StatusMarketBadge status="마감" />
                <StatusMarketBadge status="종료" />
                <StatusMarketBadge status="거절" />
              </div>
            </SubGroup>

            <SubGroup title="아이콘 + 텍스트 배지">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-canvas-0 p-5">
                <Badge variant="outline">
                  <TrendingUp />
                  YES 62%
                </Badge>
                <Badge variant="outline">
                  <TrendingDown />
                  NO 38%
                </Badge>
                <Badge>
                  <Coins />
                  ₣ 12,400
                </Badge>
                <Badge variant="secondary">
                  <Users />
                  127명 참여
                </Badge>
                <Badge variant="destructive">
                  <Flag />
                  신고됨
                </Badge>
              </div>
            </SubGroup>
          </Section>

          {/* 6. 카드 ────────────────────────────── */}
          <Section
            id="cards"
            title="6. 카드 / 컨테이너"
            description="Card 컴포넌트와 마켓 카드 패턴, 정보 박스 스타일."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>기본 카드</CardTitle>
                  <CardDescription>
                    Header / Content / Footer 구조의 표준 카드
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-ink-700">
                    카드 본문 내용. 여기에 임의의 컨텐츠를 배치할 수 있습니다.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline">
                    자세히
                  </Button>
                </CardFooter>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Compact 카드</CardTitle>
                  <CardDescription>size=&quot;sm&quot;</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-ink-700">간격이 줄어든 컴팩트 카드</p>
                </CardContent>
              </Card>

              {/* 마켓 카드 예시 */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2">
                      2026년 12월 31일까지 비트코인 1억 원 돌파할까?
                    </CardTitle>
                    <StatusMarketBadge status="진행중" />
                  </div>
                  <CardDescription>경제 · 마감까지 14일</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-teal-600">YES</span>
                        <span className="font-mono text-ink-1000">62%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-200">
                        <div
                          className="h-full bg-teal-500"
                          style={{ width: '62%' }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      127명
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Coins className="size-3" />
                      ₣ 12,400
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <SubGroup title="정보 박스 (Info / Warning / Error / Success)">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-ink-700" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-ink-1000">정보</div>
                    <p className="text-xs text-muted-foreground">
                      포인트는 실제 화폐가 아닌 내부 가상 화폐(₣)입니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      주의
                    </div>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                      마감 시간 이후에는 예측을 취소할 수 없습니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border border-scarlet-500/30 bg-scarlet-500/10 p-4">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-scarlet-600 dark:text-scarlet-400" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-scarlet-700 dark:text-scarlet-300">
                      오류
                    </div>
                    <p className="text-xs text-scarlet-700/80 dark:text-scarlet-300/80">
                      잔액이 부족하여 예측을 진행할 수 없습니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      성공
                    </div>
                    <p className="text-xs text-teal-700/80 dark:text-teal-300/80">
                      마켓이 성공적으로 등록되었습니다.
                    </p>
                  </div>
                </div>
              </div>
            </SubGroup>
          </Section>

          {/* 7. 스페이싱 ────────────────────────────── */}
          <Section
            id="spacing"
            title="7. 간격 / 스페이싱"
            description="Tailwind 4px 단위 시스템. spacing-N 의 N × 4px = 픽셀."
          >
            <div className="space-y-3 rounded-xl border border-border bg-canvas-0 p-6">
              {SPACING_TOKENS.map((s) => (
                <div key={s.key} className="flex items-center gap-4">
                  <div className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                    {s.key} ({s.px}px)
                  </div>
                  <div className={`h-4 ${s.cls} rounded bg-primary`} />
                  <code className="text-xs text-muted-foreground">
                    p-{s.key} / m-{s.key} / gap-{s.key}
                  </code>
                </div>
              ))}
            </div>

            <SubGroup title="실제 적용 예시 — gap-N">
              <div className="rounded-xl border border-border bg-canvas-0 p-6">
                <div className="space-y-4">
                  {[2, 3, 4, 6, 8].map((g) => (
                    <div key={g} className="space-y-1">
                      <code className="text-xs text-muted-foreground">
                        gap-{g}
                      </code>
                      <div className={`flex items-center gap-${g}`}>
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="size-8 rounded bg-ink-200 ring-1 ring-border"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SubGroup>
          </Section>

          {/* 8. 아이콘 ────────────────────────────── */}
          <Section
            id="icons"
            title="8. 아이콘"
            description="lucide-react 아이콘 라이브러리. 이 프로젝트에서 자주 사용되는 아이콘 모음."
          >
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-canvas-0 p-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {ICON_SET.map(({ Icon, name }) => (
                <div
                  key={name}
                  className="flex flex-col items-center gap-2 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted"
                >
                  <Icon className="size-5 text-ink-800" />
                  <code className="truncate text-[10px] text-muted-foreground">
                    {name}
                  </code>
                </div>
              ))}
            </div>
          </Section>

          {/* 9. 다이얼로그 ────────────────────────────── */}
          <Section
            id="dialog"
            title="9. 다이얼로그 / 모달"
            description="Dialog 컴포넌트. base-ui 기반의 접근성을 갖춘 모달."
          >
            <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-canvas-0 p-5">
              <Dialog>
                <DialogTrigger render={<Button />}>기본 다이얼로그</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>마켓 만들기</DialogTitle>
                    <DialogDescription>
                      새로운 예측 시장을 등록합니다. 등록 후에는 관리자 승인이
                      필요합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-title">제목</Label>
                      <Input id="dlg-title" placeholder="질문을 입력하세요" />
                    </div>
                  </div>
                  <DialogFooter showCloseButton>
                    <Button>저장</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger render={<Button variant="destructive" />}>
                  삭제 확인
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>정말 삭제하시겠습니까?</DialogTitle>
                    <DialogDescription>
                      이 작업은 되돌릴 수 없습니다. 마켓에 참여한 모든 예측이
                      취소됩니다.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter showCloseButton>
                    <Button variant="destructive">
                      <Trash2 />
                      삭제하기
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  정보 보기
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>예견 포인트(₣) 시스템</DialogTitle>
                    <DialogDescription>
                      예견은 실제 화폐 거래 없이 내부 포인트(₣)만 사용합니다.
                      가입 시 1,000₣가 지급됩니다.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter showCloseButton />
                </DialogContent>
              </Dialog>
            </div>
          </Section>

          {/* 10. 토스트 ────────────────────────────── */}
          <Section
            id="toast"
            title="10. 토스트"
            description="sonner 기반 토스트 알림. 우측 하단에 표시됩니다."
          >
            <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-canvas-0 p-5">
              <Button
                variant="outline"
                onClick={() =>
                  toast.success('예측이 성공적으로 등록되었습니다', {
                    description: '확률이 62%로 업데이트되었습니다.',
                  })
                }
              >
                <CheckCircle2 />
                Success 토스트
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  toast.error('예측에 실패했습니다', {
                    description: '잔액이 부족합니다.',
                  })
                }
              >
                <XCircle />
                Error 토스트
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  toast.info('알림', {
                    description: '관리자 승인 대기 중입니다.',
                  })
                }
              >
                <Info />
                Info 토스트
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  toast.warning('주의', {
                    description: '마감 시간이 1시간 남았습니다.',
                  })
                }
              >
                <AlertCircle />
                Warning 토스트
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const id = toast.loading('처리 중...')
                  setTimeout(() => {
                    toast.success('처리 완료', { id })
                  }, 1500)
                }}
              >
                <Loader2 />
                Loading → Success
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  toast('일반 메시지', {
                    description: '사용자 액션이 필요합니다.',
                    action: {
                      label: '확인',
                      onClick: () => toast.success('확인됨'),
                    },
                  })
                }
              >
                <Bell />
                Action 토스트
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              토스트는 <code className="rounded bg-muted px-1">sonner</code>의
              <code className="rounded bg-muted px-1">toast</code> API를
              사용합니다. 루트 레이아웃에 <code className="rounded bg-muted px-1">{'<Toaster />'}</code>가
              포함되어 있어야 합니다.
            </p>
          </Section>

          {/* 11. 팝업 ────────────────────────────── */}
          <Section
            id="popup"
            title="11. 팝업 / 모달"
            description="신규 가입자 환영 팝업 미리보기. canvas-confetti + 선착순 이벤트 배지."
          >
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowWelcomePopup(true)}>
                🎉 가입 축하 팝업 보기
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              실제 환경에서는 로그인 후 최초 1회만 표시됩니다.
              {' '}이곳에서는 <code className="rounded bg-muted px-1">forceShow</code> prop으로
              강제 표시합니다.
            </p>
          </Section>

          {/* 푸터 */}
          <footer className="border-t border-border pt-6 pb-12 text-center text-xs text-muted-foreground">
            예견 디자인 시스템 · Manifold Markets 토큰 기반 · Tailwind v4 +
            shadcn/ui (base-ui)
          </footer>
        </main>
      </div>
      <WelcomePopup forceShow={showWelcomePopup} />
    </div>
  )
}
