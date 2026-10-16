#!/usr/bin/env python3
"""Bronze -> Silver: optimiza imágenes originales a WebP (máx. 1600 px) para la web.

Uso:  python scripts/optimize_images.py        (requiere: pip install pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, DST = ROOT / "bronze" / "assets-originales", ROOT / "silver" / "assets"
EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_SIDE, QUALITY = 1600, 82

def main():
    DST.mkdir(parents=True, exist_ok=True)
    count = 0
    for f in sorted(SRC.iterdir()):
        if f.suffix.lower() not in EXT:
            continue
        img = Image.open(f)
        img.thumbnail((MAX_SIDE, MAX_SIDE))
        out = DST / (f.stem + ".webp")
        img.save(out, "WEBP", quality=QUALITY, method=6)
        print(f"{f.name}: {f.stat().st_size // 1024} KB -> {out.stat().st_size // 1024} KB")
        count += 1
    print(f"Listo: {count} imagen(es) optimizada(s)")

if __name__ == "__main__":
    main()
