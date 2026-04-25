import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '예견 소개 — 한국 예측 마켓',
  description: '예견은 누구나 미래 사건에 대한 질문을 만들고, 포인트로 예측에 베팅할 수 있는 한국형 예측 마켓 플랫폼입니다.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas-100">
      <div className="max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <main className="bg-canvas-0 border border-ink-200 rounded-xl p-6 sm:p-8">
          {/* 히어로 */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-ink-900 mb-3">예견(YEGYEON)이란?</h1>
            <p className="text-base text-ink-700 leading-relaxed">
              예견은 누구나 미래 사건에 대한 질문을 만들고, 내부 포인트로 예측에 베팅할 수 있는
              <strong> 한국형 예측 마켓 플랫폼</strong>입니다. 집단 지성을 통해 미래에 대한 확률을 가시화합니다.
            </p>
          </header>

          {/* 포인트 시스템 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-ink-900 mb-3">포인트 시스템</h2>
            <ul className="space-y-2 text-sm text-ink-700 leading-relaxed list-disc list-inside">
              <li>예견의 모든 베팅은 <strong>내부 포인트</strong>로 이루어지며, 실제 화폐 거래는 일체 없습니다.</li>
              <li>신규 가입 시 <strong>1,000포인트</strong>의 웰컴 보너스가 자동 지급됩니다.</li>
              <li>예측이 맞으면 포인트가 증가하고, 리더보드에서 자신의 실력을 증명할 수 있습니다.</li>
              <li>포인트는 서비스 내에서만 사용되며, 현금으로 환전할 수 없습니다.</li>
            </ul>
          </section>

          {/* 마켓 유형 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-ink-900 mb-3">마켓 유형</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-ink-900 mb-1">이진(Binary) 마켓</h3>
                <p className="text-sm text-ink-700 leading-relaxed">
                  YES/NO로 답할 수 있는 질문. 확률(%)이 시장 참여에 따라 실시간으로 변합니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 mb-1">다중 선택(Multiple Choice) 마켓</h3>
                <p className="text-sm text-ink-700 leading-relaxed">
                  여러 선택지 중 하나의 결과를 예측. 각 선택지별 확률이 표시됩니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 mb-1">수치(Numeric) 마켓</h3>
                <p className="text-sm text-ink-700 leading-relaxed">
                  숫자 값(가격, 점수, 지표 등)을 예측하는 마켓. 정답 허용오차 범위 내에서 보상이 지급됩니다.
                </p>
              </div>
            </div>
          </section>

          {/* 참여 방법 */}
          <section className="mb-4">
            <h2 className="text-xl font-semibold text-ink-900 mb-3">참여 방법</h2>
            <ol className="space-y-2 text-sm text-ink-700 leading-relaxed list-decimal list-inside">
              <li>카카오 로그인으로 1분 내 가입합니다.</li>
              <li>가입 보너스 1,000포인트로 관심 있는 마켓에 베팅해 보세요.</li>
              <li>직접 마켓을 생성하여 다른 사용자들과 예측을 공유할 수 있습니다.</li>
              <li>마감 후 결과가 확정되면 자동으로 포인트가 정산됩니다.</li>
            </ol>
          </section>

          <p className="text-xs text-ink-500 mt-8 pt-6 border-t border-ink-200">
            예견은 오락과 지적 경쟁을 위한 서비스입니다. 포인트는 재산적 가치를 지니지 않으며, 실제 금전 거래에 사용될 수 없습니다.
          </p>
        </main>
      </div>
    </div>
  )
}
