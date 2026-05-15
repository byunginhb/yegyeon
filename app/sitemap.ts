import type { MetadataRoute } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yegyeon.com'

export const revalidate = 3600 // 1시간마다 재생성

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/browse`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/legal/terms_of_service`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/legal/privacy_policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/legal/terms_of_use`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const supabase = await createServerSupabaseClient()

    const [marketsRes, categoriesRes] = await Promise.all([
      supabase
        .from('markets')
        .select('id, updated_at, status')
        .eq('is_hidden', false)
        .in('status', ['open', 'closed', 'resolved'])
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('categories')
        .select('slug, created_at')
        .eq('is_active', true),
    ])

    const marketEntries: MetadataRoute.Sitemap =
      (marketsRes.data ?? []).map((m: { id: string; updated_at: string | null; status: string }) => ({
        url: `${SITE_URL}/market/${m.id}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency: m.status === 'open' ? ('hourly' as const) : ('weekly' as const),
        priority: m.status === 'open' ? 0.8 : 0.5,
      }))

    const categoryEntries: MetadataRoute.Sitemap =
      (categoriesRes.data ?? []).map((c: { slug: string; created_at: string | null }) => ({
        url: `${SITE_URL}/browse?category=${encodeURIComponent(c.slug)}`,
        lastModified: c.created_at ? new Date(c.created_at) : now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }))

    return [...staticEntries, ...categoryEntries, ...marketEntries]
  } catch (e) {
    console.error('sitemap build error', e)
    return staticEntries
  }
}
