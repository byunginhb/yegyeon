export type UserRole = 'user' | 'admin'
export type MarketType = 'binary' | 'multiple_choice' | 'numeric'
export type MarketStatus = 'pending' | 'open' | 'closed' | 'resolved' | 'cancelled' | 'rejected'
export type PointTxType =
  | 'signup_bonus'
  | 'bet_placed'
  | 'bet_won'
  | 'bet_refund'
  | 'admin_adjust'
  | 'market_created'
  | 'resolution'
  | 'attendance_bonus'
  | 'quest_reward'

export interface AttendanceRecord {
  id: string
  user_id: string
  checked_date: string
  streak_count: number
  points_earned: number
  created_at: string
}

export type DailyQuestType =
  | 'daily_checkin'
  | 'daily_bet'
  | 'daily_comment'
  | 'daily_share'

export interface UserQuestProgress {
  id: string
  user_id: string
  quest_type: DailyQuestType | string
  quest_date: string
  completed_at: string | null
  points_earned: number
  created_at: string
}

export interface AttendanceStatus {
  checked_today: boolean
  streak_count: number
  points_earned_today: number | null
  next_reward: number
}

export interface DailyQuest {
  type: DailyQuestType | string
  title: string
  description: string
  points: number
  icon: string
  completed: boolean
  completed_at: string | null
}

export interface DailyQuestStatus {
  quests: DailyQuest[]
  total_points_today: number
  all_completed: boolean
}

export interface User {
  id: string
  auth_id: string
  username: string
  display_name: string
  email: string
  avatar_url: string | null
  bio: string | null
  points: number
  role: UserRole
  is_banned: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

export interface Market {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnail_url: string | null
  type: MarketType
  status: MarketStatus
  creator_id: string | null
  category_id: number | null
  close_date: string
  resolved_at: string | null
  resolution: string | null
  resolution_criteria?: string
  total_volume: number
  unique_traders: number
  comment_count?: number
  yes_probability: number
  yes_amount: number
  no_amount: number
  min_value: number | null
  max_value: number | null
  unit: string | null
  numeric_tolerance: number | null
  is_hidden: boolean
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // 조인 데이터
  creator?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
  category?: Category
  options?: MarketOption[]
}

export interface MarketOption {
  id: string
  market_id: string
  text: string
  color: string
  image_url: string | null
  probability: number
  total_amount: number
  sort_order: number
}

export interface Bet {
  id: string
  user_id: string
  market_id: string
  option_id: string | null
  outcome: string
  amount: number
  shares: number
  payout: number | null
  probability_at_bet?: number
  created_at: string
}

export interface PointTransaction {
  id: string
  user_id: string
  type: PointTxType
  amount: number
  balance: number
  ref_id: string | null
  note: string | null
  created_at: string
}

// 댓글 작성자의 해당 마켓 베팅 포지션 요약 (대표 방향 = 누적 베팅액 최대 방향)
export interface CommentPosition {
  kind: 'yes' | 'no' | 'option' // 이진 마켓 YES/NO 또는 그 외(옵션/숫자)
  label: string // 표시용 라벨 (YES/NO 또는 옵션 텍스트)
  amount: number // 해당 방향 누적 베팅 포인트
}

export interface Comment {
  id: string
  user_id: string
  market_id: string
  parent_id: string | null // 답글이면 부모 댓글 id, 최상위 댓글이면 null
  content: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  embed_url: string | null
  embed_title: string | null
  embed_description: string | null
  embed_image: string | null
  user?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>
  author_position?: CommentPosition | null
}

// API 응답 표준 형식
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

// 마켓 목록 필터
export type MarketSort = 'hot' | 'new' | 'best'

export interface MarketFilters {
  category?: string
  sort?: MarketSort
  status?: MarketStatus | 'all'
  search?: string
  page?: number
  limit?: number
}
