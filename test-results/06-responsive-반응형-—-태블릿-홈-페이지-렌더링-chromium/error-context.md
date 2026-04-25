# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-responsive.spec.ts >> 반응형 — 태블릿 >> 홈 페이지 렌더링
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
        - navigation [ref=e9]:
          - link "탐색" [ref=e10] [cursor=pointer]:
            - /url: /browse
            - button "탐색" [ref=e11]
          - link "랭킹" [ref=e12] [cursor=pointer]:
            - /url: /leaderboard
            - button "랭킹" [ref=e13]
          - link "소개" [ref=e14] [cursor=pointer]:
            - /url: /about
            - button "소개" [ref=e15]
        - link "마켓 검색..." [ref=e16] [cursor=pointer]:
          - /url: /browse
          - img [ref=e17]
          - generic [ref=e20]: 마켓 검색...
        - button [ref=e21]:
          - img
        - generic [ref=e22]:
          - link "로그인" [ref=e23] [cursor=pointer]:
            - /url: /auth/login
            - button "로그인" [ref=e24]
          - link "가입하기" [ref=e25] [cursor=pointer]:
            - /url: /auth/signup
            - button "가입하기" [ref=e26]
    - main [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - img [ref=e32]
          - heading "예견에 오신 것을 환영합니다" [level=1] [ref=e35]
        - paragraph [ref=e36]:
          - text: 미래 사건에 대한 질문을 만들고, 포인트로 예측에 베팅하세요. 가입하면
          - strong [ref=e37]: 1,000 포인트
          - text: 를 드립니다.
      - generic [ref=e38]:
        - generic [ref=e39]:
          - button "🌐 전체" [ref=e40]:
            - generic [ref=e41]: 🌐
            - generic [ref=e42]: 전체
          - button "🏛️ 정치" [ref=e43]:
            - generic [ref=e44]: 🏛️
            - generic [ref=e45]: 정치
          - button "📈 경제" [ref=e46]:
            - generic [ref=e47]: 📈
            - generic [ref=e48]: 경제
          - button "⚽ 스포츠" [ref=e49]:
            - generic [ref=e50]: ⚽
            - generic [ref=e51]: 스포츠
          - button "💻 테크" [ref=e52]:
            - generic [ref=e53]: 💻
            - generic [ref=e54]: 테크
          - button "🎬 엔터" [ref=e55]:
            - generic [ref=e56]: 🎬
            - generic [ref=e57]: 엔터
          - button "📌 기타" [ref=e58]:
            - generic [ref=e59]: 📌
            - generic [ref=e60]: 기타
        - generic [ref=e62]:
          - button "인기순" [ref=e63]
          - button "최신순" [ref=e64]
          - button "마감임박" [ref=e65]
          - button "거래량" [ref=e66]
      - generic [ref=e67]:
        - link "BTS가 2025년 완전체 컴백을 할까? YES 82% NO 18% 손 손아영 124 826.0K 12월 18일" [ref=e68] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e69]:
            - heading "BTS가 2025년 완전체 컴백을 할까?" [level=3] [ref=e70]
            - generic [ref=e72]:
              - generic [ref=e73]: YES 82%
              - generic [ref=e74]: NO 18%
            - generic [ref=e78]:
              - generic [ref=e79]:
                - generic [ref=e80]:
                  - generic [ref=e81]: 손
                  - generic [ref=e82]: 손아영
                - generic [ref=e83]:
                  - img [ref=e84]
                  - generic [ref=e89]: "124"
              - generic [ref=e90]:
                - generic [ref=e91]:
                  - img [ref=e92]
                  - generic [ref=e95]:
                    - img [ref=e96]
                    - text: 826.0K
                - generic [ref=e100]:
                  - img [ref=e101]
                  - generic [ref=e104]: 12월 18일
        - link "💻 IT/AI GPT-5가 2025년 상반기에 출시될까? YES 71% NO 29% 임 임태원 93 580.0K 5월 22일" [ref=e105] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e106]:
            - generic [ref=e108]: 💻 IT/AI
            - heading "GPT-5가 2025년 상반기에 출시될까?" [level=3] [ref=e109]
            - generic [ref=e111]:
              - generic [ref=e112]: YES 71%
              - generic [ref=e113]: NO 29%
            - generic [ref=e117]:
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]: 임
                  - generic [ref=e121]: 임태원
                - generic [ref=e122]:
                  - img [ref=e123]
                  - generic [ref=e128]: "93"
              - generic [ref=e129]:
                - generic [ref=e130]:
                  - img [ref=e131]
                  - generic [ref=e134]:
                    - img [ref=e135]
                    - text: 580.0K
                - generic [ref=e139]:
                  - img [ref=e140]
                  - generic [ref=e143]: 5월 22일
        - link "⚽ 스포츠 2025 KBO 최종 우승팀은? YES 50% NO 50% 임 임태원 71 485.0K 11월 8일" [ref=e144] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e145]:
            - generic [ref=e147]: ⚽ 스포츠
            - heading "2025 KBO 최종 우승팀은?" [level=3] [ref=e148]
            - generic [ref=e150]:
              - generic [ref=e151]: YES 50%
              - generic [ref=e152]: NO 50%
            - generic [ref=e156]:
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - generic [ref=e159]: 임
                  - generic [ref=e160]: 임태원
                - generic [ref=e161]:
                  - img [ref=e162]
                  - generic [ref=e167]: "71"
              - generic [ref=e168]:
                - generic [ref=e169]:
                  - img [ref=e170]
                  - generic [ref=e173]:
                    - img [ref=e174]
                    - text: 485.0K
                - generic [ref=e178]:
                  - img [ref=e179]
                  - generic [ref=e182]: 11월 8일
        - link "📈 경제/금융 2025년 말 코스피가 3000을 돌파할까? YES 42% NO 58% 한 한지우 67 345.0K 7월 21일" [ref=e183] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e184]:
            - generic [ref=e186]: 📈 경제/금융
            - heading "2025년 말 코스피가 3000을 돌파할까?" [level=3] [ref=e187]
            - generic [ref=e189]:
              - generic [ref=e190]: YES 42%
              - generic [ref=e191]: NO 58%
            - generic [ref=e195]:
              - generic [ref=e196]:
                - generic [ref=e197]:
                  - generic [ref=e198]: 한
                  - generic [ref=e199]: 한지우
                - generic [ref=e200]:
                  - img [ref=e201]
                  - generic [ref=e206]: "67"
              - generic [ref=e207]:
                - generic [ref=e208]:
                  - img [ref=e209]
                  - generic [ref=e212]:
                    - img [ref=e213]
                    - text: 345.0K
                - generic [ref=e217]:
                  - img [ref=e218]
                  - generic [ref=e221]: 7월 21일
        - link "⚽ 스포츠 손흥민이 이번 시즌 EPL 20골을 넘길까? YES 38% NO 62% 이 이영진 55 258.0K 6월 6일" [ref=e222] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e223]:
            - generic [ref=e225]: ⚽ 스포츠
            - heading "손흥민이 이번 시즌 EPL 20골을 넘길까?" [level=3] [ref=e226]
            - generic [ref=e228]:
              - generic [ref=e229]: YES 38%
              - generic [ref=e230]: NO 62%
            - generic [ref=e234]:
              - generic [ref=e235]:
                - generic [ref=e236]:
                  - generic [ref=e237]: 이
                  - generic [ref=e238]: 이영진
                - generic [ref=e239]:
                  - img [ref=e240]
                  - generic [ref=e245]: "55"
              - generic [ref=e246]:
                - generic [ref=e247]:
                  - img [ref=e248]
                  - generic [ref=e251]:
                    - img [ref=e252]
                    - text: 258.0K
                - generic [ref=e256]:
                  - img [ref=e257]
                  - generic [ref=e260]: 6월 6일
        - link "🏛️ 정치/사회 2025년 대선에서 야당 후보가 당선될까? YES 54% NO 46% 관 관리자 48 600.0K 8월 20일" [ref=e261] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e262]:
            - generic [ref=e264]: 🏛️ 정치/사회
            - heading "2025년 대선에서 야당 후보가 당선될까?" [level=3] [ref=e265]
            - generic [ref=e267]:
              - generic [ref=e268]: YES 54%
              - generic [ref=e269]: NO 46%
            - generic [ref=e273]:
              - generic [ref=e274]:
                - generic [ref=e275]:
                  - generic [ref=e276]: 관
                  - generic [ref=e277]: 관리자
                - generic [ref=e278]:
                  - img [ref=e279]
                  - generic [ref=e284]: "48"
              - generic [ref=e285]:
                - generic [ref=e286]:
                  - img [ref=e287]
                  - generic [ref=e290]:
                    - img [ref=e291]
                    - text: 600.0K
                - generic [ref=e295]:
                  - img [ref=e296]
                  - generic [ref=e299]: 8월 20일
        - link "💻 IT/AI 삼성전자가 올해 HBM4 양산에 성공할까? YES 58% NO 42% 관 관리자 44 307.0K 9월 19일" [ref=e300] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e301]:
            - generic [ref=e303]: 💻 IT/AI
            - heading "삼성전자가 올해 HBM4 양산에 성공할까?" [level=3] [ref=e304]
            - generic [ref=e306]:
              - generic [ref=e307]: YES 58%
              - generic [ref=e308]: NO 42%
            - generic [ref=e312]:
              - generic [ref=e313]:
                - generic [ref=e314]:
                  - generic [ref=e315]: 관
                  - generic [ref=e316]: 관리자
                - generic [ref=e317]:
                  - img [ref=e318]
                  - generic [ref=e323]: "44"
              - generic [ref=e324]:
                - generic [ref=e325]:
                  - img [ref=e326]
                  - generic [ref=e329]:
                    - img [ref=e330]
                    - text: 307.0K
                - generic [ref=e334]:
                  - img [ref=e335]
                  - generic [ref=e338]: 9월 19일
        - link "📈 경제/금융 올해 한국 기준금리가 한 번 더 인하될까? YES 67% NO 33% 박 박수현 41 349.0K 10월 19일" [ref=e339] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e340]:
            - generic [ref=e342]: 📈 경제/금융
            - heading "올해 한국 기준금리가 한 번 더 인하될까?" [level=3] [ref=e343]
            - generic [ref=e345]:
              - generic [ref=e346]: YES 67%
              - generic [ref=e347]: NO 33%
            - generic [ref=e351]:
              - generic [ref=e352]:
                - generic [ref=e353]:
                  - generic [ref=e354]: 박
                  - generic [ref=e355]: 박수현
                - generic [ref=e356]:
                  - img [ref=e357]
                  - generic [ref=e362]: "41"
              - generic [ref=e363]:
                - generic [ref=e364]:
                  - img [ref=e365]
                  - generic [ref=e368]:
                    - img [ref=e369]
                    - text: 349.0K
                - generic [ref=e373]:
                  - img [ref=e374]
                  - generic [ref=e377]: 10월 19일
        - link "⚽ 스포츠 KBO 한국시리즈에서 LG 트윈스가 우승할까? YES 23% NO 77% 백 백준혁 38 243.0K 11월 8일" [ref=e378] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e379]:
            - generic [ref=e381]: ⚽ 스포츠
            - heading "KBO 한국시리즈에서 LG 트윈스가 우승할까?" [level=3] [ref=e382]
            - generic [ref=e384]:
              - generic [ref=e385]: YES 23%
              - generic [ref=e386]: NO 77%
            - generic [ref=e390]:
              - generic [ref=e391]:
                - generic [ref=e392]:
                  - generic [ref=e393]: 백
                  - generic [ref=e394]: 백준혁
                - generic [ref=e395]:
                  - img [ref=e396]
                  - generic [ref=e401]: "38"
              - generic [ref=e402]:
                - generic [ref=e403]:
                  - img [ref=e404]
                  - generic [ref=e407]:
                    - img [ref=e408]
                    - text: 243.0K
                - generic [ref=e412]:
                  - img [ref=e413]
                  - generic [ref=e416]: 11월 8일
        - link "💻 IT/AI 다음 한국 스타트업 유니콘은 어느 분야에서 나올까? YES 50% NO 50% 한 한지우 33 192.0K 2월 16일" [ref=e417] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e418]:
            - generic [ref=e420]: 💻 IT/AI
            - heading "다음 한국 스타트업 유니콘은 어느 분야에서 나올까?" [level=3] [ref=e421]
            - generic [ref=e423]:
              - generic [ref=e424]: YES 50%
              - generic [ref=e425]: NO 50%
            - generic [ref=e429]:
              - generic [ref=e430]:
                - generic [ref=e431]:
                  - generic [ref=e432]: 한
                  - generic [ref=e433]: 한지우
                - generic [ref=e434]:
                  - img [ref=e435]
                  - generic [ref=e440]: "33"
              - generic [ref=e441]:
                - generic [ref=e442]:
                  - img [ref=e443]
                  - generic [ref=e446]:
                    - img [ref=e447]
                    - text: 192.0K
                - generic [ref=e451]:
                  - img [ref=e452]
                  - generic [ref=e455]: 2월 16일
        - link "🏛️ 정치/사회 올해 안에 국회에서 AI 규제법이 통과될까? YES 31% NO 69% 김 김철수 29 283.0K 6월 21일" [ref=e456] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e457]:
            - generic [ref=e459]: 🏛️ 정치/사회
            - heading "올해 안에 국회에서 AI 규제법이 통과될까?" [level=3] [ref=e460]
            - generic [ref=e462]:
              - generic [ref=e463]: YES 31%
              - generic [ref=e464]: NO 69%
            - generic [ref=e468]:
              - generic [ref=e469]:
                - generic [ref=e470]:
                  - generic [ref=e471]: 김
                  - generic [ref=e472]: 김철수
                - generic [ref=e473]:
                  - img [ref=e474]
                  - generic [ref=e479]: "29"
              - generic [ref=e480]:
                - generic [ref=e481]:
                  - img [ref=e482]
                  - generic [ref=e485]:
                    - img [ref=e486]
                    - text: 283.0K
                - generic [ref=e490]:
                  - img [ref=e491]
                  - generic [ref=e494]: 6월 21일
        - link "📈 경제/금융 2025년 말 달러/원 환율은 얼마일까? YES 50% NO 50% 박 박수현 28 156.0K 7월 21일" [ref=e495] [cursor=pointer]:
          - /url: /market/undefined
          - generic [ref=e496]:
            - generic [ref=e498]: 📈 경제/금융
            - heading "2025년 말 달러/원 환율은 얼마일까?" [level=3] [ref=e499]
            - generic [ref=e501]:
              - generic [ref=e502]: YES 50%
              - generic [ref=e503]: NO 50%
            - generic [ref=e507]:
              - generic [ref=e508]:
                - generic [ref=e509]:
                  - generic [ref=e510]: 박
                  - generic [ref=e511]: 박수현
                - generic [ref=e512]:
                  - img [ref=e513]
                  - generic [ref=e518]: "28"
              - generic [ref=e519]:
                - generic [ref=e520]:
                  - img [ref=e521]
                  - generic [ref=e524]:
                    - img [ref=e525]
                    - text: 156.0K
                - generic [ref=e529]:
                  - img [ref=e530]
                  - generic [ref=e533]: 7월 21일
    - navigation [ref=e534]:
      - generic [ref=e535]:
        - link "홈" [ref=e536] [cursor=pointer]:
          - /url: /
          - img [ref=e537]
          - generic [ref=e540]: 홈
        - link "탐색" [ref=e541] [cursor=pointer]:
          - /url: /browse
          - img [ref=e542]
          - generic [ref=e545]: 탐색
        - link "만들기" [ref=e546] [cursor=pointer]:
          - /url: /market/create
          - img [ref=e547]
          - generic [ref=e549]: 만들기
        - link "랭킹" [ref=e550] [cursor=pointer]:
          - /url: /leaderboard
          - img [ref=e551]
          - generic [ref=e552]: 랭킹
        - link "내 것" [ref=e553] [cursor=pointer]:
          - /url: /portfolio
          - img [ref=e554]
          - generic [ref=e557]: 내 것
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e563] [cursor=pointer]:
    - img [ref=e564]
  - alert [ref=e567]
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