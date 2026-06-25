from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "textures" / "procedural"
SIZE = 1024


def noise_base(base, spread, seed):
    random.seed(seed)
    img = Image.new("RGB", (SIZE, SIZE), base)
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            grain = random.randint(-spread, spread)
            px[x, y] = tuple(max(0, min(255, channel + grain)) for channel in base)
    return img.filter(ImageFilter.GaussianBlur(0.35))


def save_concrete():
    img = noise_base((165, 176, 178), 22, 11)
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(130):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        length = random.randint(70, 240)
        angle = random.uniform(0, math.pi)
        end = (x + math.cos(angle) * length, y + math.sin(angle) * length)
        alpha = random.randint(18, 52)
        draw.line((x, y, end[0], end[1]), fill=(55, 70, 74, alpha), width=random.randint(1, 3))
    for step in range(0, SIZE, 256):
        draw.line((step, 0, step, SIZE), fill=(220, 232, 233, 38), width=3)
        draw.line((0, step, SIZE, step), fill=(78, 93, 98, 28), width=2)
    img.save(OUT / "concrete-panel.png")


def save_asphalt():
    img = noise_base((42, 52, 58), 28, 23)
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(2400):
        x = random.randint(0, SIZE - 1)
        y = random.randint(0, SIZE - 1)
        tone = random.randint(80, 145)
        draw.point((x, y), fill=(tone, tone + 4, tone + 8, random.randint(70, 160)))
    for x in (SIZE * 0.22, SIZE * 0.78):
        draw.line((x, 0, x, SIZE), fill=(230, 238, 217, 62), width=7)
    img = img.filter(ImageFilter.GaussianBlur(0.18))
    img.save(OUT / "asphalt-fine.png")


def save_grass():
    img = noise_base((42, 100, 67), 42, 31)
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(5200):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        h = random.randint(5, 16)
        color = random.choice([(59, 140, 82, 95), (88, 159, 91, 80), (24, 78, 53, 85)])
        draw.line((x, y, x + random.randint(-3, 3), y - h), fill=color, width=1)
    img = img.filter(ImageFilter.GaussianBlur(0.12))
    img.save(OUT / "grass-varied.png")


def save_metal():
    img = noise_base((118, 135, 145), 14, 41)
    draw = ImageDraw.Draw(img, "RGBA")
    for x in range(0, SIZE, 9):
        alpha = 18 + (x % 37)
        draw.line((x, 0, x, SIZE), fill=(226, 238, 241, alpha), width=2)
    for y in range(0, SIZE, 128):
        draw.line((0, y, SIZE, y), fill=(46, 56, 64, 28), width=2)
    img = img.filter(ImageFilter.GaussianBlur(0.25))
    img.save(OUT / "brushed-metal.png")


def save_water():
    img = Image.new("RGB", (SIZE, SIZE), (40, 151, 177))
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            wave = int(22 * math.sin(x / 23.0 + y / 57.0) + 13 * math.sin((x + y) / 41.0))
            px[x, y] = (max(0, 34 + wave // 3), max(0, 143 + wave), max(0, 172 + wave))
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(20, SIZE, 54):
        offset = random.randint(-30, 30)
        points = [(x, y + math.sin((x + offset) / 34.0) * 8) for x in range(0, SIZE + 16, 16)]
        draw.line(points, fill=(187, 244, 255, 52), width=2)
    img = img.filter(ImageFilter.GaussianBlur(0.35))
    img.save(OUT / "water-ripples.png")


def save_glass_grid():
    img = Image.new("RGBA", (SIZE, SIZE), (150, 229, 242, 96))
    draw = ImageDraw.Draw(img, "RGBA")
    for x in range(0, SIZE, 128):
        draw.line((x, 0, x, SIZE), fill=(235, 253, 255, 118), width=5)
    for y in range(0, SIZE, 160):
        draw.line((0, y, SIZE, y), fill=(57, 211, 235, 84), width=4)
    for x in range(0, SIZE, 256):
        draw.rectangle((x + 14, 20, x + 82, 86), fill=(255, 255, 255, 32))
    img = img.filter(ImageFilter.GaussianBlur(0.2))
    img.save(OUT / "glass-grid.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    save_concrete()
    save_asphalt()
    save_grass()
    save_metal()
    save_water()
    save_glass_grid()
    print(f"Generated textures in {OUT}")


if __name__ == "__main__":
    main()
