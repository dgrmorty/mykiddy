"""
Иконки «на главный экран» из полного логотипа (scripts/assets/app-icon-logo.jpg):
apple-touch-icon*, icon-192*, icon-512* и maskable-вариант для Android.
Фавиконки (вкладка браузера, выдача Google) — из знака </> в public/favicon.svg.
Запуск: python3 scripts/generate-app-icons.py (нужны Pillow и rsvg-convert).
"""
import subprocess
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'scripts' / 'assets' / 'app-icon-logo.jpg'
OUT = ROOT / 'public'

# Логотип занимает такую долю ширины иконки; у maskable — меньше, чтобы попасть в безопасный круг
REGULAR_WIDTH = 0.84
MASKABLE_WIDTH = 0.66
FAVICON_SVG = OUT / 'favicon.svg'


def load_logo() -> Image.Image:
    img = Image.open(SRC).convert('RGB')
    # Фон JPEG слегка серый — всё почти белое делаем чисто белым
    img = img.point(lambda v: 255 if v > 238 else v)
    mask = ImageOps.invert(img.convert('L')).point(lambda v: 255 if v > 24 else 0)
    return img.crop(mask.getbbox())


def compose(logo: Image.Image, size: int, width_ratio: float) -> Image.Image:
    canvas = Image.new('RGB', (size, size), (255, 255, 255))
    w = round(size * width_ratio)
    h = round(logo.height * w / logo.width)
    fitted = logo.resize((w, h), Image.LANCZOS)
    canvas.paste(fitted, ((size - w) // 2, (size - h) // 2))
    return canvas


def main() -> None:
    logo = load_logo()
    targets = {
        'apple-touch-icon.png': (180, REGULAR_WIDTH),
        'apple-touch-icon-light.png': (180, REGULAR_WIDTH),
        'apple-touch-icon-dark.png': (180, REGULAR_WIDTH),
        'icon-192.png': (192, REGULAR_WIDTH),
        'icon-192-light.png': (192, REGULAR_WIDTH),
        'icon-192-dark.png': (192, REGULAR_WIDTH),
        'icon-512.png': (512, REGULAR_WIDTH),
        'icon-512-light.png': (512, REGULAR_WIDTH),
        'icon-512-dark.png': (512, REGULAR_WIDTH),
        'icon-maskable-512.png': (512, MASKABLE_WIDTH),
    }
    for name, (size, ratio) in targets.items():
        compose(logo, size, ratio).save(OUT / name, optimize=True)
        print('wrote', name)

    for size in (16, 32, 48, 96, 192, 256):
        out = OUT / f'favicon-{size}x{size}.png'
        subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), '-o', str(out), str(FAVICON_SVG)], check=True)
        print('wrote', out.name)
    big = OUT / 'favicon-256x256.png'
    Image.open(big).save(OUT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    big.unlink()
    print('wrote favicon.ico')


if __name__ == '__main__':
    main()
