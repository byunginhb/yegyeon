# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-responsive.spec.ts >> 반응형 — 모바일 >> 홈 페이지 렌더링
- Location: e2e/06-responsive.spec.ts:13:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: '예견', exact: true }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: '예견', exact: true }).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e5]:
        - link "예견 예견" [ref=e6] [cursor=pointer]:
          - /url: /
          - img "예견" [ref=e7]
          - generic [ref=e8]: 예견
        - button [ref=e9]:
          - img
        - generic [ref=e10]:
          - link "로그인" [ref=e11] [cursor=pointer]:
            - /url: /auth/login
            - button "로그인" [ref=e12]
          - link "가입하기" [ref=e13] [cursor=pointer]:
            - /url: /auth/signup
            - button "가입하기" [ref=e14]
    - main [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img [ref=e20]
          - heading "예견에 오신 것을 환영합니다" [level=1] [ref=e23]
        - paragraph [ref=e24]:
          - text: 미래 사건에 대한 질문을 만들고, 포인트로 예측에 베팅하세요. 가입하면
          - strong [ref=e25]: 1,000 포인트
          - text: 를 드립니다.
      - generic [ref=e26]:
        - generic [ref=e27]:
          - button "🌐 전체" [ref=e28]:
            - generic [ref=e29]: 🌐
            - generic [ref=e30]: 전체
          - button "🏛️ 정치" [ref=e31]:
            - generic [ref=e32]: 🏛️
            - generic [ref=e33]: 정치
          - button "📈 경제" [ref=e34]:
            - generic [ref=e35]: 📈
            - generic [ref=e36]: 경제
          - button "⚽ 스포츠" [ref=e37]:
            - generic [ref=e38]: ⚽
            - generic [ref=e39]: 스포츠
          - button "💻 테크" [ref=e40]:
            - generic [ref=e41]: 💻
            - generic [ref=e42]: 테크
          - button "🎬 엔터" [ref=e43]:
            - generic [ref=e44]: 🎬
            - generic [ref=e45]: 엔터
          - button "📌 기타" [ref=e46]:
            - generic [ref=e47]: 📌
            - generic [ref=e48]: 기타
        - generic [ref=e50]:
          - button "인기순" [ref=e51]
          - button "최신순" [ref=e52]
          - button "마감임박" [ref=e53]
          - button "거래량" [ref=e54]
      - generic [ref=e55]:
        - link "BTS가 2025년 완전체 컴백을 할까? YES 82% NO 18% 손 손아영 124 826.0K 12월 18일" [ref=e56] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e57]:
            - heading "BTS가 2025년 완전체 컴백을 할까?" [level=3] [ref=e58]
            - generic [ref=e60]:
              - generic [ref=e61]: YES 82%
              - generic [ref=e62]: NO 18%
            - generic [ref=e66]:
              - generic [ref=e67]:
                - generic [ref=e68]:
                  - generic [ref=e69]: 손
                  - generic [ref=e70]: 손아영
                - generic [ref=e71]:
                  - img [ref=e72]
                  - generic [ref=e77]: "124"
              - generic [ref=e78]:
                - generic [ref=e79]:
                  - img [ref=e80]
                  - generic [ref=e83]:
                    - img [ref=e84]
                    - text: 826.0K
                - generic [ref=e88]:
                  - img [ref=e89]
                  - generic [ref=e92]: 12월 18일
        - link "💻 IT/AI GPT-5가 2025년 상반기에 출시될까? YES 71% NO 29% 임 임태원 93 580.0K 5월 22일" [ref=e93] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e94]:
            - generic [ref=e96]: 💻 IT/AI
            - heading "GPT-5가 2025년 상반기에 출시될까?" [level=3] [ref=e97]
            - generic [ref=e99]:
              - generic [ref=e100]: YES 71%
              - generic [ref=e101]: NO 29%
            - generic [ref=e105]:
              - generic [ref=e106]:
                - generic [ref=e107]:
                  - generic [ref=e108]: 임
                  - generic [ref=e109]: 임태원
                - generic [ref=e110]:
                  - img [ref=e111]
                  - generic [ref=e116]: "93"
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - img [ref=e119]
                  - generic [ref=e122]:
                    - img [ref=e123]
                    - text: 580.0K
                - generic [ref=e127]:
                  - img [ref=e128]
                  - generic [ref=e131]: 5월 22일
        - link "⚽ 스포츠 2025 KBO 최종 우승팀은? YES 50% NO 50% 임 임태원 71 485.0K 11월 8일" [ref=e132] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e133]:
            - generic [ref=e135]: ⚽ 스포츠
            - heading "2025 KBO 최종 우승팀은?" [level=3] [ref=e136]
            - generic [ref=e138]:
              - generic [ref=e139]: YES 50%
              - generic [ref=e140]: NO 50%
            - generic [ref=e144]:
              - generic [ref=e145]:
                - generic [ref=e146]:
                  - generic [ref=e147]: 임
                  - generic [ref=e148]: 임태원
                - generic [ref=e149]:
                  - img [ref=e150]
                  - generic [ref=e155]: "71"
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - img [ref=e158]
                  - generic [ref=e161]:
                    - img [ref=e162]
                    - text: 485.0K
                - generic [ref=e166]:
                  - img [ref=e167]
                  - generic [ref=e170]: 11월 8일
        - link "📈 경제/금융 2025년 말 코스피가 3000을 돌파할까? YES 42% NO 58% 한 한지우 67 345.0K 7월 21일" [ref=e171] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e172]:
            - generic [ref=e174]: 📈 경제/금융
            - heading "2025년 말 코스피가 3000을 돌파할까?" [level=3] [ref=e175]
            - generic [ref=e177]:
              - generic [ref=e178]: YES 42%
              - generic [ref=e179]: NO 58%
            - generic [ref=e183]:
              - generic [ref=e184]:
                - generic [ref=e185]:
                  - generic [ref=e186]: 한
                  - generic [ref=e187]: 한지우
                - generic [ref=e188]:
                  - img [ref=e189]
                  - generic [ref=e194]: "67"
              - generic [ref=e195]:
                - generic [ref=e196]:
                  - img [ref=e197]
                  - generic [ref=e200]:
                    - img [ref=e201]
                    - text: 345.0K
                - generic [ref=e205]:
                  - img [ref=e206]
                  - generic [ref=e209]: 7월 21일
        - link "⚽ 스포츠 손흥민이 이번 시즌 EPL 20골을 넘길까? YES 38% NO 62% 이 이영진 55 258.0K 6월 6일" [ref=e210] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e211]:
            - generic [ref=e213]: ⚽ 스포츠
            - heading "손흥민이 이번 시즌 EPL 20골을 넘길까?" [level=3] [ref=e214]
            - generic [ref=e216]:
              - generic [ref=e217]: YES 38%
              - generic [ref=e218]: NO 62%
            - generic [ref=e222]:
              - generic [ref=e223]:
                - generic [ref=e224]:
                  - generic [ref=e225]: 이
                  - generic [ref=e226]: 이영진
                - generic [ref=e227]:
                  - img [ref=e228]
                  - generic [ref=e233]: "55"
              - generic [ref=e234]:
                - generic [ref=e235]:
                  - img [ref=e236]
                  - generic [ref=e239]:
                    - img [ref=e240]
                    - text: 258.0K
                - generic [ref=e244]:
                  - img [ref=e245]
                  - generic [ref=e248]: 6월 6일
        - link "🏛️ 정치/사회 2025년 대선에서 야당 후보가 당선될까? YES 54% NO 46% 관 관리자 48 600.0K 8월 20일" [ref=e249] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e250]:
            - generic [ref=e252]: 🏛️ 정치/사회
            - heading "2025년 대선에서 야당 후보가 당선될까?" [level=3] [ref=e253]
            - generic [ref=e255]:
              - generic [ref=e256]: YES 54%
              - generic [ref=e257]: NO 46%
            - generic [ref=e261]:
              - generic [ref=e262]:
                - generic [ref=e263]:
                  - generic [ref=e264]: 관
                  - generic [ref=e265]: 관리자
                - generic [ref=e266]:
                  - img [ref=e267]
                  - generic [ref=e272]: "48"
              - generic [ref=e273]:
                - generic [ref=e274]:
                  - img [ref=e275]
                  - generic [ref=e278]:
                    - img [ref=e279]
                    - text: 600.0K
                - generic [ref=e283]:
                  - img [ref=e284]
                  - generic [ref=e287]: 8월 20일
        - link "💻 IT/AI 삼성전자가 올해 HBM4 양산에 성공할까? YES 58% NO 42% 관 관리자 44 307.0K 9월 19일" [ref=e288] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e289]:
            - generic [ref=e291]: 💻 IT/AI
            - heading "삼성전자가 올해 HBM4 양산에 성공할까?" [level=3] [ref=e292]
            - generic [ref=e294]:
              - generic [ref=e295]: YES 58%
              - generic [ref=e296]: NO 42%
            - generic [ref=e300]:
              - generic [ref=e301]:
                - generic [ref=e302]:
                  - generic [ref=e303]: 관
                  - generic [ref=e304]: 관리자
                - generic [ref=e305]:
                  - img [ref=e306]
                  - generic [ref=e311]: "44"
              - generic [ref=e312]:
                - generic [ref=e313]:
                  - img [ref=e314]
                  - generic [ref=e317]:
                    - img [ref=e318]
                    - text: 307.0K
                - generic [ref=e322]:
                  - img [ref=e323]
                  - generic [ref=e326]: 9월 19일
        - link "📈 경제/금융 올해 한국 기준금리가 한 번 더 인하될까? YES 67% NO 33% 박 박수현 41 349.0K 10월 19일" [ref=e327] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e328]:
            - generic [ref=e330]: 📈 경제/금융
            - heading "올해 한국 기준금리가 한 번 더 인하될까?" [level=3] [ref=e331]
            - generic [ref=e333]:
              - generic [ref=e334]: YES 67%
              - generic [ref=e335]: NO 33%
            - generic [ref=e339]:
              - generic [ref=e340]:
                - generic [ref=e341]:
                  - generic [ref=e342]: 박
                  - generic [ref=e343]: 박수현
                - generic [ref=e344]:
                  - img [ref=e345]
                  - generic [ref=e350]: "41"
              - generic [ref=e351]:
                - generic [ref=e352]:
                  - img [ref=e353]
                  - generic [ref=e356]:
                    - img [ref=e357]
                    - text: 349.0K
                - generic [ref=e361]:
                  - img [ref=e362]
                  - generic [ref=e365]: 10월 19일
        - link "⚽ 스포츠 KBO 한국시리즈에서 LG 트윈스가 우승할까? YES 23% NO 77% 백 백준혁 38 243.0K 11월 8일" [ref=e366] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e367]:
            - generic [ref=e369]: ⚽ 스포츠
            - heading "KBO 한국시리즈에서 LG 트윈스가 우승할까?" [level=3] [ref=e370]
            - generic [ref=e372]:
              - generic [ref=e373]: YES 23%
              - generic [ref=e374]: NO 77%
            - generic [ref=e378]:
              - generic [ref=e379]:
                - generic [ref=e380]:
                  - generic [ref=e381]: 백
                  - generic [ref=e382]: 백준혁
                - generic [ref=e383]:
                  - img [ref=e384]
                  - generic [ref=e389]: "38"
              - generic [ref=e390]:
                - generic [ref=e391]:
                  - img [ref=e392]
                  - generic [ref=e395]:
                    - img [ref=e396]
                    - text: 243.0K
                - generic [ref=e400]:
                  - img [ref=e401]
                  - generic [ref=e404]: 11월 8일
        - link "💻 IT/AI 다음 한국 스타트업 유니콘은 어느 분야에서 나올까? YES 50% NO 50% 한 한지우 33 192.0K 2월 16일" [ref=e405] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e406]:
            - generic [ref=e408]: 💻 IT/AI
            - heading "다음 한국 스타트업 유니콘은 어느 분야에서 나올까?" [level=3] [ref=e409]
            - generic [ref=e411]:
              - generic [ref=e412]: YES 50%
              - generic [ref=e413]: NO 50%
            - generic [ref=e417]:
              - generic [ref=e418]:
                - generic [ref=e419]:
                  - generic [ref=e420]: 한
                  - generic [ref=e421]: 한지우
                - generic [ref=e422]:
                  - img [ref=e423]
                  - generic [ref=e428]: "33"
              - generic [ref=e429]:
                - generic [ref=e430]:
                  - img [ref=e431]
                  - generic [ref=e434]:
                    - img [ref=e435]
                    - text: 192.0K
                - generic [ref=e439]:
                  - img [ref=e440]
                  - generic [ref=e443]: 2월 16일
        - link "🏛️ 정치/사회 올해 안에 국회에서 AI 규제법이 통과될까? YES 31% NO 69% 김 김철수 29 283.0K 6월 21일" [ref=e444] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e445]:
            - generic [ref=e447]: 🏛️ 정치/사회
            - heading "올해 안에 국회에서 AI 규제법이 통과될까?" [level=3] [ref=e448]
            - generic [ref=e450]:
              - generic [ref=e451]: YES 31%
              - generic [ref=e452]: NO 69%
            - generic [ref=e456]:
              - generic [ref=e457]:
                - generic [ref=e458]:
                  - generic [ref=e459]: 김
                  - generic [ref=e460]: 김철수
                - generic [ref=e461]:
                  - img [ref=e462]
                  - generic [ref=e467]: "29"
              - generic [ref=e468]:
                - generic [ref=e469]:
                  - img [ref=e470]
                  - generic [ref=e473]:
                    - img [ref=e474]
                    - text: 283.0K
                - generic [ref=e478]:
                  - img [ref=e479]
                  - generic [ref=e482]: 6월 21일
        - link "📈 경제/금융 2025년 말 달러/원 환율은 얼마일까? YES 50% NO 50% 박 박수현 28 156.0K 7월 21일" [ref=e483] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e484]:
            - generic [ref=e486]: 📈 경제/금융
            - heading "2025년 말 달러/원 환율은 얼마일까?" [level=3] [ref=e487]
            - generic [ref=e489]:
              - generic [ref=e490]: YES 50%
              - generic [ref=e491]: NO 50%
            - generic [ref=e495]:
              - generic [ref=e496]:
                - generic [ref=e497]:
                  - generic [ref=e498]: 박
                  - generic [ref=e499]: 박수현
                - generic [ref=e500]:
                  - img [ref=e501]
                  - generic [ref=e506]: "28"
              - generic [ref=e507]:
                - generic [ref=e508]:
                  - img [ref=e509]
                  - generic [ref=e512]:
                    - img [ref=e513]
                    - text: 156.0K
                - generic [ref=e517]:
                  - img [ref=e518]
                  - generic [ref=e521]: 7월 21일
    - navigation [ref=e522]:
      - generic [ref=e523]:
        - link "홈" [ref=e524] [cursor=pointer]:
          - /url: /
          - img [ref=e525]
          - generic [ref=e528]: 홈
        - link "탐색" [ref=e529] [cursor=pointer]:
          - /url: /browse
          - img [ref=e530]
          - generic [ref=e533]: 탐색
        - link "만들기" [ref=e534] [cursor=pointer]:
          - /url: /market/create
          - img [ref=e535]
          - generic [ref=e537]: 만들기
        - link "랭킹" [ref=e538] [cursor=pointer]:
          - /url: /leaderboard
          - img [ref=e539]
          - generic [ref=e540]: 랭킹
        - link "내 것" [ref=e541] [cursor=pointer]:
          - /url: /portfolio
          - img [ref=e542]
          - generic [ref=e545]: 내 것
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e551] [cursor=pointer]:
    - img [ref=e552]
  - alert [ref=e555]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | const viewports = [
  4  |   { name: '모바일', width: 375, height: 812 },
  5  |   { name: '태블릿', width: 768, height: 1024 },
  6  |   { name: '데스크탑', width: 1440, height: 900 },
  7  | ]
  8  | 
  9  | for (const viewport of viewports) {
  10 |   test.describe(`반응형 — ${viewport.name}`, () => {
  11 |     test.use({ viewport: { width: viewport.width, height: viewport.height } })
  12 | 
  13 |     test('홈 페이지 렌더링', async ({ page }) => {
  14 |       await page.goto('/')
  15 |       // 헤더의 "예견" 로고 확인
> 16 |       await expect(page.getByRole('link', { name: '예견', exact: true }).first()).toBeVisible()
     |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  17 |     })
  18 | 
  19 |     test('탐색 페이지 렌더링', async ({ page }) => {
  20 |       await page.goto('/browse')
  21 |       await expect(page).toHaveURL('/browse')
  22 |       await expect(page.getByPlaceholder(/마켓 검색/)).toBeVisible()
  23 |     })
  24 | 
  25 |     test('로그인 페이지 렌더링', async ({ page }) => {
  26 |       await page.goto('/auth/login')
  27 |       await expect(page.getByLabel('이메일')).toBeVisible()
  28 |       await expect(page.getByLabel('비밀번호')).toBeVisible()
  29 |     })
  30 |   })
  31 | }
  32 | 
```