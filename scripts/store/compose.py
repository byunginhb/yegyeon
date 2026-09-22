"""Play 스토어 그래픽 합성기 — raw 폰 캡처(1170×2532)에 예견 브랜드 프레임을 씌워
1080×1920 스크린샷 6장, 1024×500 피처 그래픽, 512×512 앱 아이콘을 만든다.

사용법:
  ~/android-tools/play-venv/bin/python scripts/store/compose.py    # → docs/store/images/*.png (ko-KR 전용)
폰트: Pretendard(otf). ~/.cache/yegyeon-fonts/ 에 없으면 ~/.cache/maldongmu-fonts/ 를 먼저 보고,
그래도 없으면 jsdelivr에서 내려받는다.
raw 캡처는 Playwright(iPhone 390×844, DPR 3, 다크 테마)로 라이브 사이트(yegyeon.com)를 찍은 것 — docs/store/listing.md §5 참고.
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "docs/store/images/raw"
OUT = ROOT / "docs/store/images"
ICON_SRC = ROOT / "concept2_y_curve.png"
FONT_DIR = Path.home() / ".cache/yegyeon-fonts"
FONT_FALLBACK_DIR = Path.home() / ".cache/maldongmu-fonts"
PRETENDARD = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-{w}.otf"

# 예견 팔레트 (app/globals.css 다크 토큰) — 인디고 primary, ink 캔버스, 로고 점의 노랑
CANVAS, CANVAS_DEEP = (17, 24, 39), (31, 41, 55)          # #111827 / #1f2937
INDIGO, INDIGO_DEEP = (99, 102, 241), (49, 46, 129)        # #6366f1 / #312e81
TEXT, TEXT_SOFT = (249, 250, 251), (156, 163, 175)         # #f9fafb / #9ca3af
YELLOW, FRAME, FRAME_EDGE = (251, 191, 36), (55, 65, 81), (75, 85, 99)  # #fbbf24 / #374151 / #4b5563
INDIGO_LIGHT = (165, 180, 252)                             # indigo-300 (배지 글자)

# (raw 파일, 출력 파일, 배지, 헤드라인 줄들[(텍스트, 강조 여부) 조각 리스트], 서브 줄들)
SHOTS = [
    ("01-home.png", "screenshot-01-home.png", "한국형 예측 시장",
     [[("한국에서 일어날", False)], [("모든 일에 ", False), ("예측", True)]],
     ["정치·경제·스포츠·연예·코인·IT", "누구나 질문을 만들고, 포인트로 예측해요"]),
    ("02-browse.png", "screenshot-02-browse.png", "탐색",
     [[("관심 분야 골라", False)], [("마켓 탐색", True)]],
     ["카테고리·인기순·마감임박·거래량", "검색으로 궁금한 질문을 바로 찾아요"]),
    ("03-market.png", "screenshot-03-market.png", "YES / NO",
     [[("확률", True), ("이 실시간으로", False)], [("움직여요", False)]],
     ["집단지성이 만드는 시장 확률 차트", "YES·NO 한 번으로 예측 참여"]),
    ("04-leaderboard.png", "screenshot-04-leaderboard.png", "랭킹",
     [[("예측 실력을", False)], [("랭킹", True), ("으로 증명", False)]],
     ["포인트·수익률·예측 횟수 순위", "맞힐수록 포인트가 쌓여요"]),
    ("05-create.png", "screenshot-05-login.png", "간편 로그인",
     [[("구글·카카오로", False)], [("1분 만에 시작", True)]],
     ["가입 즉시 웰컴 포인트 지급", "출석·일일 퀘스트로 매일 포인트 적립"]),
    ("06-about.png", "screenshot-06-points.png", "포인트 시스템",
     [[("현금 없이", True)], [("포인트로만 즐겨요", False)]],
     ["실제 화폐 거래·환전 없음", "오락과 지적 경쟁을 위한 서비스"]),
]

FEATURE = (
    [[("한국에서 일어날 모든 일에", False)], [("포인트", True), ("로 예측하세요", False)]],
    "정치·경제·스포츠·연예·코인 — 집단지성 예측 시장",
)


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    name = f"Pretendard-{weight}.otf"
    path = FONT_DIR / name
    if not path.exists():
        if (FONT_FALLBACK_DIR / name).exists():
            path = FONT_FALLBACK_DIR / name
        else:
            urllib.request.urlretrieve(PRETENDARD.format(w=weight), path)
    return ImageFont.truetype(str(path), size)


def canvas(w: int, h: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (w, h), CANVAS)
    d = ImageDraw.Draw(im)
    r = int(w * 0.36)
    d.ellipse([w - r - 60, -r + 120, w + r - 60, 120 + r], fill=INDIGO_DEEP)  # 우상단 인디고 원
    d.ellipse([-r + 40, h - 140, r + 40, h - 140 + 2 * r], fill=CANVAS_DEEP)  # 좌하단 은은한 원
    return im, d


def draw_runs(d: ImageDraw.ImageDraw, xy: tuple[int, int], runs, f: ImageFont.FreeTypeFont) -> None:
    x, y = xy
    for text, accent in runs:
        d.text((x, y), text, font=f, fill=YELLOW if accent else TEXT)
        x += d.textlength(text, font=f)


def logo(size: int) -> Image.Image:
    """앱 아이콘(concept2_y_curve.png)을 축소한 로고 마크."""
    return Image.open(ICON_SRC).convert("RGBA").resize((size, size), Image.LANCZOS)


def badge(d: ImageDraw.ImageDraw, im: Image.Image, xy: tuple[int, int], label: str) -> None:
    x, y = xy
    f = font("Bold", 32)
    w = int(d.textlength(label, font=f)) + 110
    d.rounded_rectangle([x, y, x + w, y + 64], radius=32, fill=CANVAS_DEEP, outline=INDIGO, width=2)
    mark = logo(36)
    im.paste(mark, (x + 18, y + 14), mark)
    d.text((x + 66, y + 14), label, font=f, fill=INDIGO_LIGHT)


def phone(im: Image.Image, raw: Path, box: tuple[int, int, int], border: int = 14, radius: int = 62) -> None:
    """box=(x, y, width): 폰 프레임 왼쪽 위와 폭. 아래쪽은 캔버스 밖으로 흘러넘치게 둔다."""
    x, y, w = box
    shot = Image.open(raw).convert("RGB")
    inner_w = w - 2 * border
    shot = shot.resize((inner_w, int(shot.height * inner_w / shot.width)), Image.LANCZOS)
    h = shot.height + border
    glow = max(6, border // 2)
    frame = Image.new("RGBA", (w + 2 * glow, h + radius + glow), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle([0, 0, w + 2 * glow - 1, h + radius + glow], radius=radius + glow, fill=INDIGO_DEEP)  # 인디고 글로우
    fd.rounded_rectangle([glow, glow, glow + w - 1, glow + h + radius], radius=radius, fill=FRAME, outline=FRAME_EDGE, width=2)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, inner_w - 1, shot.height + radius], radius=radius - border, fill=255)
    frame.paste(shot, (glow + border, glow + border), mask)
    im.paste(frame, (x - glow, y - glow), frame)


def fit(d: ImageDraw.ImageDraw, runs, f: ImageFont.FreeTypeFont, max_w: int, family: str, size: int):
    """한 줄이 폭을 넘으면 글자 크기를 줄인다."""
    while size > 18 and sum(d.textlength(t, font=f) for t, _ in runs) > max_w:
        size -= 4
        f = font(family, size)
    return f


def screenshot(raw: str, out: str, label: str, head, subs) -> None:
    im, d = canvas(1080, 1920)
    badge(d, im, (80, 110), label)
    for i, runs in enumerate(head):
        draw_runs(d, (80, 215 + i * 104), runs, fit(d, runs, font("Bold", 88), 920, "Bold", 88))
    for i, s in enumerate(subs):
        d.text((80, 435 + i * 56), s, font=fit(d, [(s, False)], font("Regular", 38), 920, "Regular", 38), fill=TEXT_SOFT)
    phone(im, RAW / raw, (225, 642, 630))
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / out, optimize=True)
    print("wrote", out)


def feature_graphic() -> None:
    im, d = canvas(1024, 500)
    mark = logo(72)
    im.paste(mark, (84, 84), mark)
    d.text((172, 88), "예견", font=font("Bold", 64), fill=TEXT)
    lines, tagline = FEATURE
    for i, runs in enumerate(lines):
        draw_runs(d, (84, 210 + i * 66), runs, fit(d, runs, font("Bold", 52), 600, "Bold", 52))
    d.text((84, 372), tagline, font=fit(d, [(tagline, False)], font("Regular", 26), 600, "Regular", 26), fill=TEXT_SOFT)
    phone(im, RAW / "01-home.png", (706, 8, 300), border=8, radius=34)
    im.save(OUT / "feature-graphic.png", optimize=True)
    print("wrote feature-graphic.png")


def app_icon() -> None:
    Image.open(ICON_SRC).convert("RGBA").resize((512, 512), Image.LANCZOS).save(OUT / "app-icon-512.png", optimize=True)
    print("wrote app-icon-512.png")


if __name__ == "__main__":
    for raw, out, label, head, subs in SHOTS:
        screenshot(raw, out, label, head, subs)
    feature_graphic()
    app_icon()
