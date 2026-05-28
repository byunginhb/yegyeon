// 댓글에 포함된 첫 URL의 Open Graph 메타데이터를 가져온다.
// - SSRF 방지를 위해 사설/로컬 호스트는 거부
// - 응답 크기와 시간을 제한
// - cheerio 같은 외부 의존성 없이 가벼운 정규식 파싱

export interface OgMetadata {
  url: string
  title: string | null
  description: string | null
  image: string | null
}

const MAX_HTML_BYTES = 512 * 1024 // 512KB 헤더 파싱이면 충분
const FETCH_TIMEOUT_MS = 3500
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/i

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_RE)
  if (!match) return null
  // 끝의 문장부호 제거
  return match[0].replace(/[)\].,!?;:]+$/g, '')
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '[::1]') return true

  // IPv4
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)]
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 0) return true
  }
  // .local / .internal
  if (h.endsWith('.local') || h.endsWith('.internal')) return true
  return false
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

function pickMeta(html: string, propertyOrName: string): string | null {
  // <meta property="og:title" content="..."> 또는 name="..."
  const re = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?(?:property|name)=["']${propertyOrName}["'](?:[^>]*?\\s)?content=["']([^"']*?)["'][^>]*>`,
    'i',
  )
  const reverse = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?content=["']([^"']*?)["'](?:[^>]*?\\s)?(?:property|name)=["']${propertyOrName}["'][^>]*>`,
    'i',
  )
  const m = html.match(re) ?? html.match(reverse)
  return m ? decodeHtmlEntities(m[1]).trim() : null
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? decodeHtmlEntities(m[1]).trim() : null
}

function resolveUrl(base: string, maybeRelative: string): string | null {
  try {
    return new URL(maybeRelative, base).toString()
  } catch {
    return null
  }
}

function clamp(str: string | null, max: number): string | null {
  if (!str) return null
  const trimmed = str.trim()
  if (!trimmed) return null
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1) + '…'
}

export async function fetchOgMetadata(rawUrl: string): Promise<OgMetadata | null> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (isPrivateHostname(url.hostname)) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // 일부 사이트는 일반 UA 없이는 빈 페이지를 반환
        'User-Agent':
          'Mozilla/5.0 (compatible; YegyeonBot/1.0; +https://yegyeon.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko,en;q=0.8',
      },
    })

    if (!res.ok || !res.body) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml/i.test(contentType)) return null

    // 일부만 읽어서 헤더만 파싱
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (received >= MAX_HTML_BYTES) break
    }
    try {
      await reader.cancel()
    } catch {
      // ignore
    }
    const buf = new Uint8Array(received)
    let offset = 0
    for (const c of chunks) {
      buf.set(c, offset)
      offset += c.length
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf)

    const title =
      pickMeta(html, 'og:title') ??
      pickMeta(html, 'twitter:title') ??
      pickTitle(html)
    const description =
      pickMeta(html, 'og:description') ??
      pickMeta(html, 'twitter:description') ??
      pickMeta(html, 'description')
    const rawImage =
      pickMeta(html, 'og:image:secure_url') ??
      pickMeta(html, 'og:image') ??
      pickMeta(html, 'twitter:image')
    const image = rawImage ? resolveUrl(url.toString(), rawImage) : null

    if (!title && !description && !image) return null

    return {
      url: url.toString(),
      title: clamp(title, 300),
      description: clamp(description, 500),
      image: image && image.length <= 2048 ? image : null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
