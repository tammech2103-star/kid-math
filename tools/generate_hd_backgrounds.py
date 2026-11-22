"""
Sinh 3 ảnh nền HD cho Đợt 1 bằng Pillow (không cần mạng, không cần API key).
Mục tiêu: cartoony 3D mềm, 16:9, 1280x720, WebP <= 400 KB, KHÔNG chữ / logo / nhân vật bản quyền.
Chạy: python tools/generate_hd_backgrounds.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Asset", "hd")
W, H = 1280, 720
SS = 2  # supersampling


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def mix(a, b, t):
    t = clamp(t)
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def vgradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        px[0, y] = mix(top, bottom, y / max(1, h - 1))
    return img.resize((w, h), Image.BICUBIC)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def soft_shadow(base, box, blur=18, opacity=60, offset=(0, 10)):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    dx, dy = offset
    d.ellipse((x0 + dx, y0 + dy, x1 + dx, y1 + dy), fill=(20, 30, 50, opacity))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def cloud(draw, cx, cy, scale=1.0, color=(255, 255, 255, 235)):
    parts = [
        (-70, 10, 60, 60), (-30, -22, 72, 72), (28, -8, 64, 64),
        (72, 14, 48, 48), (-8, 20, 90, 52)
    ]
    for dx, dy, rw, rh in parts:
        x, y = cx + dx * scale, cy + dy * scale
        draw.ellipse((x - rw * scale / 2, y - rh * scale / 2,
                      x + rw * scale / 2, y + rh * scale / 2), fill=color)


def glossy_coin(img, cx, cy, r):
    d = ImageDraw.Draw(img)
    soft_shadow(img, (cx - r, cy - r, cx + r, cy + r), blur=8, opacity=45, offset=(3, 6))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 205, 40), outline=(205, 135, 0), width=4)
    d.ellipse((cx - r * 0.74, cy - r * 0.74, cx + r * 0.74, cy + r * 0.74),
              fill=(255, 232, 120), outline=(255, 248, 200), width=2)
    d.ellipse((cx - r * 0.34, cy - r * 0.5, cx - r * 0.08, cy - r * 0.18), fill=(255, 255, 235))
    d.arc((cx - r * 0.5, cy - r * 0.2, cx + r * 0.5, cy + r * 0.55), 200, 340, fill=(225, 160, 10), width=5)


def pipe(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    soft_shadow(img, (x - 8, y + h - 20, x + w + 8, y + h + 12), blur=10, opacity=50)
    rounded(d, (x, y, x + w, y + h), 16, (32, 168, 78), (18, 112, 52), 4)
    rounded(d, (x - 14, y - 30, x + w + 14, y + 18), 12, (58, 205, 104), (20, 124, 58), 4)
    d.rounded_rectangle((x + 10, y + 4, x + 24, y + h - 12), 7, fill=(126, 232, 152))


def make_intro():
    img = vgradient((W * SS, H * SS), (92, 168, 252), (196, 238, 255)).convert("RGBA")
    d = ImageDraw.Draw(img)
    S = SS
    # nắng + bokeh
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W * S * 0.72, -120 * S, W * S * 1.02, 220 * S), fill=(255, 246, 190, 150))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(60 * S)))
    d = ImageDraw.Draw(img)
    for cx, cy, sc in [(180, 110, 1.1), (520, 72, 0.8), (950, 130, 1.0), (1180, 60, 0.7)]:
        cloud(d, cx * S, cy * S, sc * S, (255, 255, 255, 225))
    # đồi xa
    d.ellipse((-160 * S, 470 * S, 620 * S, 900 * S), fill=(126, 206, 118, 255))
    d.ellipse((560 * S, 500 * S, 1420 * S, 940 * S), fill=(104, 190, 110, 255))
    d.ellipse((980 * S, 520 * S, 1600 * S, 900 * S), fill=(140, 216, 128, 255))
    # mặt đất cỏ + nền tảng
    rounded(d, (-40 * S, 600 * S, 1320 * S, 780 * S), 40 * S, (86, 176, 74), (44, 118, 46), 6 * S)
    rounded(d, (-40 * S, 590 * S, 1320 * S, 624 * S), 18 * S, (126, 216, 96), (70, 158, 62), 4 * S)
    for i in range(46):
        x = random.randint(20, 1260) * S
        y = random.randint(600, 660) * S
        d.polygon([(x, y), (x + 5 * S, y - 14 * S), (x + 10 * S, y)], fill=(158, 230, 116))
    pipe(img, 150 * S, 470 * S, 96 * S, 130 * S)
    pipe(img, 1050 * S, 430 * S, 78 * S, 170 * S)
    # nền tảng nổi
    for x, y, w in [(360, 400, 230), (720, 320, 250), (930, 470, 170)]:
        rounded(d, (x * S, y * S, (x + w) * S, (y + 38) * S), 16 * S,
                (255, 214, 128), (196, 140, 62), 4 * S)
        rounded(d, (x * S, y * S, (x + w) * S, (y + 12) * S), 8 * S, (138, 224, 106))
    # đồng xu
    for cx, cy, r in [(300, 250, 30), (620, 190, 26), (760, 250, 30),
                      (1000, 210, 28), (1120, 300, 24), (470, 320, 22)]:
        glossy_coin(img, cx * S, cy * S, r * S)
    # vùng an toàn dưới: mờ nhẹ để text nổi
    veil = Image.new("RGBA", img.size, (0, 0, 0, 0))
    vd = ImageDraw.Draw(veil)
    vd.rectangle((0, int(H * S * 0.78), W * S, H * S), fill=(18, 48, 82, 55))
    img.alpha_composite(veil.filter(ImageFilter.GaussianBlur(24 * S)))
    return img.convert("RGB").resize((W, H), Image.LANCZOS)


def flower(d, cx, cy, r, color):
    for k in range(6):
        a = k * math.pi / 3
        px, py = cx + math.cos(a) * r * 0.62, cy + math.sin(a) * r * 0.62
        d.ellipse((px - r * 0.5, py - r * 0.5, px + r * 0.5, py + r * 0.5), fill=color)
    d.ellipse((cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42),
              fill=(255, 226, 92), outline=(226, 168, 30), width=2)


def make_garden():
    img = vgradient((W * SS, H * SS), (168, 224, 255), (240, 252, 224)).convert("RGBA")
    S = SS
    d = ImageDraw.Draw(img)
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((60 * S, -160 * S, 620 * S, 300 * S), fill=(255, 244, 196, 170))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70 * S)))
    d = ImageDraw.Draw(img)
    for cx, cy, sc in [(260, 100, 0.9), (860, 70, 1.0), (1180, 150, 0.75)]:
        cloud(d, cx * S, cy * S, sc * S, (255, 255, 255, 230))
    # cỏ nền
    rounded(d, (-40 * S, 430 * S, 1320 * S, 800 * S), 60 * S, (150, 216, 118), (92, 168, 78), 5 * S)
    for i in range(120):
        x, y = random.randint(10, 1270) * S, random.randint(450, 700) * S
        d.line((x, y, x + 4 * S, y - 12 * S), fill=(112, 190, 88), width=2 * S)
    # hàng rào gỗ
    for i in range(15):
        x = (40 + i * 84) * S
        rounded(d, (x, 350 * S, x + 20 * S, 470 * S), 6 * S, (214, 168, 112), (158, 112, 66), 3 * S)
        d.ellipse((x, 344 * S, x + 20 * S, 366 * S), fill=(232, 190, 134))
    for yy in (385, 435):
        rounded(d, (32 * S, yy * S, 1280 * S, (yy + 16) * S), 7 * S, (226, 182, 124), (160, 116, 70), 3 * S)
    # hai luống hoa (vùng an toàn giữa)
    beds = [(250, 520, 330, 150), (700, 520, 330, 150)]
    for (x, y, w, h) in beds:
        soft_shadow(img, (x * S, y * S, (x + w) * S, (y + h) * S), 16 * S, 55)
        rounded(d, ((x - 12) * S, (y - 10) * S, (x + w + 12) * S, (y + h + 8) * S),
                18 * S, (192, 142, 92), (140, 96, 58), 5 * S)
        rounded(d, (x * S, y * S, (x + w) * S, (y + h) * S), 14 * S, (112, 78, 52))
        rounded(d, ((x + 8) * S, (y + 6) * S, (x + w - 8) * S, (y + 34) * S), 10 * S, (140, 100, 66))
        for k in range(5):
            fx = x + 42 + k * 62
            fy = y + 62 + (k % 2) * 26
            d.line((fx * S, (y + h - 18) * S, fx * S, fy * S), fill=(62, 150, 72), width=5 * S)
            d.ellipse(((fx - 12) * S, (fy + 6) * S, (fx + 12) * S, (fy + 26) * S), fill=(80, 176, 88))
            flower(d, fx * S, fy * S, 20 * S,
                   [(255, 122, 138), (255, 208, 84), (236, 142, 214), (255, 248, 240)][k % 4])
    # bướm + bokeh
    for bx, by, col in [(170, 260, (255, 170, 90)), (1050, 250, (170, 140, 255)),
                        (560, 180, (255, 200, 90))]:
        d.ellipse(((bx - 16) * S, (by - 10) * S, bx * S, (by + 10) * S), fill=col)
        d.ellipse((bx * S, (by - 10) * S, (bx + 16) * S, (by + 10) * S), fill=col)
    veil = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(veil).rectangle((0, int(H * S * 0.8), W * S, H * S), fill=(30, 62, 40, 50))
    img.alpha_composite(veil.filter(ImageFilter.GaussianBlur(22 * S)))
    return img.convert("RGB").resize((W, H), Image.LANCZOS)


def checkered(d, x0, y0, x1, y1, cell, c1=(28, 34, 48), c2=(250, 252, 255)):
    cols = int((x1 - x0) / cell)
    rows = int((y1 - y0) / cell)
    for r in range(rows):
        for c in range(cols):
            color = c1 if (r + c) % 2 == 0 else c2
            d.rectangle((x0 + c * cell, y0 + r * cell,
                         x0 + (c + 1) * cell, y0 + (r + 1) * cell), fill=color)


def make_track():
    img = vgradient((W * SS, H * SS), (108, 200, 252), (214, 240, 255)).convert("RGBA")
    S = SS
    d = ImageDraw.Draw(img)
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((820 * S, -180 * S, 1360 * S, 260 * S), fill=(255, 250, 200, 160))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70 * S)))
    d = ImageDraw.Draw(img)
    for cx, cy, sc in [(200, 90, 1.0), (640, 60, 0.8), (1100, 120, 0.9)]:
        cloud(d, cx * S, cy * S, sc * S, (255, 255, 255, 235))
    # khán đài
    rounded(d, (-20 * S, 250 * S, 1300 * S, 440 * S), 26 * S, (98, 132, 196), (58, 84, 140), 5 * S)
    for row in range(3):
        y = (272 + row * 52) * S
        rounded(d, (0, y, 1280 * S, (y + 34) * S), 10 * S,
                [(236, 108, 132), (255, 196, 86), (116, 206, 148)][row])
    for i in range(64):
        x = (18 + i * 20) * S
        y = (262 + (i % 3) * 52) * S
        col = [(255, 226, 180), (120, 88, 66), (255, 170, 150), (150, 220, 255)][i % 4]
        d.ellipse((x, y, x + 12 * S, y + 12 * S), fill=col)
    # đường đua
    d.polygon([(-40 * S, 720 * S), (1320 * S, 720 * S), (900 * S, 430 * S), (340 * S, 430 * S)],
              fill=(92, 100, 116))
    d.polygon([(-40 * S, 720 * S), (1320 * S, 720 * S), (900 * S, 430 * S), (340 * S, 430 * S)],
              outline=(64, 72, 88), width=6 * S)
    for k in range(4):
        y0 = 470 + k * 62
        x0 = int(340 - (y0 - 430) * 0.85)
        x1 = int(900 + (y0 - 430) * 0.85)
        for seg in range(9):
            sx = x0 + (x1 - x0) * seg / 9
            ex = x0 + (x1 - x0) * (seg + 0.5) / 9
            d.rounded_rectangle((sx * S, int(y0 * S), ex * S, int((y0 + 7) * S)), 3 * S,
                                fill=(246, 248, 252))
    # vạch đích
    checkered(d, 430 * S, 452 * S, 850 * S, 500 * S, 28 * S)
    # cờ đích trên两根 cột
    for px in (450, 830):
        rounded(d, ((px - 5) * S, 200 * S, (px + 5) * S, 456 * S), 4 * S, (240, 244, 250))
    d.polygon([(450 * S, 206 * S), (830 * S, 206 * S), (830 * S, 258 * S), (450 * S, 246 * S)],
              fill=(255, 255, 255), outline=(190, 200, 214))
    for c in range(12):
        for r in range(2):
            color = (34, 40, 54) if (c + r) % 2 == 0 else (255, 255, 255)
            d.rectangle((450 * S + c * 31 * S, 208 * S + r * 24 * S,
                         450 * S + (c + 1) * 31 * S, 208 * S + (r + 1) * 24 * S), fill=color)
    # bóng bay
    for bx, by, col in [(90, 160, (255, 92, 108)), (180, 220, (255, 200, 70)),
                        (1180, 180, (110, 210, 255)), (1080, 250, (170, 230, 110)),
                        (1010, 140, (255, 150, 200))]:
        soft_shadow(img, ((bx - 28) * S, (by - 28) * S, (bx + 28) * S, (by + 28) * S), 8 * S, 35)
        d.ellipse(((bx - 30) * S, (by - 34) * S, (bx + 30) * S, (by + 26) * S), fill=col)
        d.ellipse(((bx - 20) * S, (by - 28) * S, (bx - 8) * S, (by - 14) * S), fill=(255, 255, 255, 150))
        d.polygon([((bx - 7) * S, (by + 25) * S), ((bx + 7) * S, (by + 25) * S), (bx * S, (by + 36) * S)], fill=col)
        d.line((bx * S, (by + 36) * S, (bx + 8) * S, (by + 96) * S), fill=(230, 236, 246), width=2 * S)
    veil = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(veil).rectangle((0, int(H * S * 0.8), W * S, H * S), fill=(20, 44, 78, 45))
    img.alpha_composite(veil.filter(ImageFilter.GaussianBlur(20 * S)))
    return img.convert("RGB").resize((W, H), Image.LANCZOS)


def save_webp(img, name):
    path = os.path.join(OUT, name)
    for quality in (88, 82, 76, 70, 64):
        img.save(path, "WEBP", quality=quality, method=6)
        size = os.path.getsize(path)
        if size <= 400000:
            print(f"{name}: {img.size[0]}x{img.size[1]} quality={quality} {size/1024:.1f} KB")
            return
    raise RuntimeError(f"{name} vẫn vượt 400 KB sau khi nén")


def main():
    os.makedirs(OUT, exist_ok=True)
    random.seed(20261122)
    save_webp(make_intro(), "intro.webp")
    save_webp(make_garden(), "b5.webp")
    save_webp(make_track(), "b20.webp")


if __name__ == "__main__":
    main()
