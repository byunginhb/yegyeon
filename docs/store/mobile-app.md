# 예견 안드로이드 앱 (Expo + React Native WebView)

yegyeon.com 을 `react-native-webview`로 감싼 안드로이드 앱. 말동무(`../maldongmu/mobile`)와 같은 구조.
웹을 Vercel에 배포하면 앱 내용도 즉시 반영 — 앱 자체(아이콘·이름·버전·네이티브 동작)를 바꿀 때만 재빌드.

- 프로젝트: `mobile/` (Expo SDK 57, RN 0.86, pnpm `node-linker=hoisted`)
- 패키지 ID(영구): `com.yegyeon.app` · 딥링크 스킴: `yegyeon://`
- 앱 이름: 예견

## 구성
| 파일 | 역할 |
|---|---|
| `mobile/App.tsx` | WebView + 물리 뒤로가기 + 스플래시 + OAuth Custom Tab 핸들 + 테마 동기화(상태바·시스템바 색) + 오프라인 재시도 |
| `mobile/app.json` | 이름·아이콘·스플래시·스킴·패키지·versionCode |
| `mobile/withReleaseSigning.js` | prebuild 때 업로드 키 서명 + R8 축소/난독화 설정 주입 |
| `mobile/assets/` | 아이콘(1024)·적응형 아이콘 전경·스플래시 — `concept2_y_curve.png`(256px) 업스케일. 고해상도 원본 생기면 교체 |

## OAuth 흐름 (웹 쪽 코드 포함)
임베디드 WebView에선 구글 로그인이 차단되므로:
1. 웹의 `signInWithOAuth()`가 `…supabase.co/auth/v1/authorize?provider=` 로 이동 → 앱이 가로채서
   `https://yegyeon.com/auth/login?app=1&provider=<p>` 를 **Custom Tab**(외부 브라우저)으로 연다.
2. 로그인 페이지가 `yg_app=1` 쿠키를 심고 OAuth 시작 → `/auth/callback` 이 쿠키를 보고
   `yegyeon://auth?rt=<refresh_token>` 으로 리다이렉트 (`app/auth/callback/route.ts`).
3. 앱이 WebView에 `POST /auth/app-session {refresh_token}` 을 주입 → 서버가 세션 쿠키 발급 (`app/auth/app-session/route.ts`) → `/` 로 이동.
- Supabase Redirect URL 설정 변경 없음(콜백 URL 그대로). 이메일 로그인은 WebView 안에서 그대로 동작.

## 앱 여부 감지 (웹에서)
- UA에 `yegyeonApp` 포함, `window.__ygApp = { version }` 주입. 웹→앱 메시지는 `window.ReactNativeWebView.postMessage(JSON)`; 현재 앱이 처리하는 타입: `theme`.

## 서명 키스토어 (⚠️ 백업 필수, 커밋 금지)
- `~/android-tools/yegyeon-upload.keystore` (alias `yegyeon`), 비번 `~/android-tools/yegyeon-keystore-password.txt`
- 업로드 키 SHA-256: `11:77:0C:0A:63:9F:3B:31:F0:11:C4:99:DD:6E:52:EB:68:22:A6:A7:6B:8B:88:02:6A:9D:5F:FF:E0:0A:84:00`

## AAB 빌드
```bash
export JAVA_HOME="$HOME/android-tools/jdk-17.0.20+8/Contents/Home"
export ANDROID_HOME="$HOME/android-tools/android_sdk"
cd mobile && pnpm install
npx expo prebuild --platform android --clean --no-install
PW="$(cat ~/android-tools/yegyeon-keystore-password.txt)"
cd android && echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew bundleRelease assembleRelease --no-daemon \
  -PYEGYEON_STORE_FILE="$HOME/android-tools/yegyeon-upload.keystore" \
  -PYEGYEON_STORE_PASSWORD="$PW" -PYEGYEON_KEY_ALIAS=yegyeon -PYEGYEON_KEY_PASSWORD="$PW"
# AAB: app/build/outputs/bundle/release/app-release.aab → ~/android-tools/yegyeon-v<ver>.aab
# 테스트 APK: app/build/outputs/apk/release/app-release.apk (폰 사이드로드)
# R8 매핑: app/build/outputs/mapping/release/mapping.txt
```
서명 확인: `keytool -printcert -jarfile <aab> | grep SHA256` → 위 지문이면 OK.
버전 올릴 때: `mobile/app.json` `expo.version` + `expo.android.versionCode` 증가, `App.tsx`의 `APP_FLAGS` version.

| 버전 | versionCode | 내용 |
|---|---|---|
| 1.0.0 | 1 | 첫 출시 |

## Play 제출 (API 자동화)
`scripts/store/play_publish.py` — 말동무와 같은 스크립트(PACKAGE만 다름). 서비스 계정 `~/android-tools/play-service-account.json` 에 이 앱 권한이 있어야 함.
```bash
~/android-tools/play-venv/bin/python scripts/store/play_publish.py \
  --aab ~/android-tools/yegyeon-v1.0.0.aab --release-name 1.0.0 --mapping ~/android-tools/yegyeon-v1.0.0-mapping.txt \
  --listings-dir docs/store/listings --images-root docs/store/images --default-language ko-KR --localize-notes --commit
```
API로 안 되는 것(콘솔에서 직접): 앱 생성, 콘텐츠 등급·데이터 안전·타겟층 설문, 개인정보처리방침 URL, 스토어 태그·카테고리 → `docs/store/listing.md` 답안 참고.
