import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-ink-200 bg-canvas-0/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-ink-500">
            © {new Date().getFullYear()} 예견(YEGYEON). 내부 포인트 기반 예측 시장 — 실제 화폐 거래 없음.
          </div>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Link
              href="/about"
              className="text-ink-500 hover:text-ink-800 transition-colors"
            >
              서비스 소개
            </Link>
            <span className="text-ink-300" aria-hidden>·</span>
            <Link
              href="/legal/terms_of_service"
              className="text-ink-500 hover:text-ink-800 transition-colors"
            >
              서비스 약관
            </Link>
            <span className="text-ink-300" aria-hidden>·</span>
            <Link
              href="/legal/privacy_policy"
              className="text-ink-500 hover:text-ink-800 transition-colors font-medium"
            >
              개인정보 처리방침
            </Link>
            <span className="text-ink-300" aria-hidden>·</span>
            <Link
              href="/legal/terms_of_use"
              className="text-ink-500 hover:text-ink-800 transition-colors"
            >
              이용 약관
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
