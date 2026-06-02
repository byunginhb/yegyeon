const SEED = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6'] as const

export function getOptionColor(idx: number): string {
  if (idx < SEED.length) return SEED[idx]
  const hue = (idx * 137.508) % 360
  return `hsl(${hue.toFixed(1)} 65% 55%)`
}

export const OPTION_SEED_COLORS = SEED
