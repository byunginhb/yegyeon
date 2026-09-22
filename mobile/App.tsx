import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as SplashScreen from "expo-splash-screen";

const SITE = "https://yegyeon.com";
const HOST = "yegyeon.com";
// 웹이 앱 여부를 알 수 있게 주입. UA에도 "yegyeonApp"이 붙는다.
const APP_FLAGS = `window.__ygApp = { version: "1.0.0" }; true;`;
// 웹 테마(html.dark) 변화를 앱에 알린다 → 상태바·시스템바 색을 맞춘다.
const THEME_WATCH = `(function(){var h=document.documentElement;function s(){window.ReactNativeWebView.postMessage(JSON.stringify({type:"theme",dark:h.classList.contains("dark")}))}new MutationObserver(s).observe(h,{attributes:true,attributeFilter:["class"]});s();})(); true;`;
// 웹 globals.css의 canvas-0(탭바 배경) 라이트/다크
const BG = { light: "#ffffff", dark: "#1f2937" };
const PRIMARY = "#6366f1";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);
  const [dark, setDark] = useState(true);
  const bg = dark ? BG.dark : BG.light;

  // Android 물리 뒤로가기 → WebView 뒤로. 더 못 가면 앱 종료(기본 동작).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // 임베디드 WebView에선 구글 OAuth가 차단됨 → /auth/login?app=1&provider= 를 외부 인증 세션(Custom Tab)으로 열고,
  // 콜백이 yegyeon://auth?rt=<refresh token> 으로 돌려주면 /auth/app-session 에 POST 해 WebView 세션 쿠키로 바꾼다.
  const handleOAuth = useCallback(async (provider: string) => {
    try {
      const res = await WebBrowser.openAuthSessionAsync(
        `${SITE}/auth/login?app=1&provider=${provider}`,
        "yegyeon://auth",
      );
      if (res.type === "success" && res.url) {
        const m = res.url.match(/[?&]rt=([^&]+)/);
        if (m) {
          const rt = decodeURIComponent(m[1]);
          webRef.current?.injectJavaScript(
            `fetch('/auth/app-session',{method:'POST',headers:{'content-type':'application/json'},body:${JSON.stringify(
              JSON.stringify({ refresh_token: rt }),
            )}}).then(function(){location.replace('/')}); true;`,
          );
        }
      }
    } catch {
      /* 사용자가 취소하거나 실패 — 비로그인으로 계속 사용 가능 */
    }
  }, []);

  const onShouldStart = useCallback(
    (req: ShouldStartLoadRequest): boolean => {
      const url = req.url || "";
      // supabase.auth.signInWithOAuth() 가 supabase.co/auth/v1/authorize?provider= 로 이동 → 가로채서 Custom Tab 로그인
      if (url.includes("/auth/v1/authorize")) {
        const provider = new URL(url).searchParams.get("provider") || "google";
        handleOAuth(provider);
        return false;
      }
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // 서비스 도메인은 앱 내 WebView 유지
        if (url.includes(HOST)) return true;
        // 그 외 외부 링크는 시스템 브라우저(Custom Tab)로
        WebBrowser.openBrowserAsync(url).catch(() => {});
        return false;
      }
      // mailto:, tel: 등은 OS에 위임
      if (!url.startsWith("about:") && !url.startsWith("data:")) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
      return true;
    },
    [handleOAuth],
  );

  const onMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === "theme") setDark(!!msg.dark);
    } catch {
      /* 잘못된 메시지 무시 */
    }
  }, []);

  const onNav = useCallback((s: WebViewNavigation) => {
    canGoBack.current = s.canGoBack;
  }, []);

  const finishLoad = useCallback(() => {
    if (!ready) {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  const reload = useCallback(() => {
    setErrored(false);
    webRef.current?.reload();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top"]}>
      <StatusBar style={dark ? "light" : "dark"} />
      {errored ? (
        <View style={[styles.center, { backgroundColor: bg }]}>
          <Text style={[styles.errTitle, { color: dark ? "#f9fafb" : "#111827" }]}>연결이 어려워요</Text>
          <Text style={styles.errBody}>인터넷 연결을 확인하고 다시 시도해주세요.</Text>
          <TouchableOpacity style={styles.btn} onPress={reload} activeOpacity={0.8}>
            <Text style={styles.btnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: SITE }}
          applicationNameForUserAgent="yegyeonApp"
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={onNav}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={APP_FLAGS}
          injectedJavaScript={THEME_WATCH}
          onLoadEnd={finishLoad}
          onError={() => {
            setErrored(true);
            finishLoad();
          }}
          onHttpError={() => finishLoad()}
          pullToRefreshEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          overScrollMode="never"
          style={[styles.web, { backgroundColor: bg }]}
        />
      )}
      {/* 시스템 내비게이션 바 영역 — 웹 하단 탭바(canvas-0)와 같은 색으로 채운다 */}
      <View style={{ height: insets.bottom, backgroundColor: bg }} />
      {!ready && !errored && (
        <View style={[styles.center, { backgroundColor: bg }]} pointerEvents="none">
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  web: { flex: 1 },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  errBody: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: PRIMARY, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
