#!/usr/bin/env python3
"""Bronze -> Silver: optimiza imágenes a WebP.

- bronze/assets-originales/*            -> silver/assets/            (máx. 1600 px)
- bronze/assets-originales/proyectos/*  -> silver/assets/projects/   (miniaturas 800x500 recortadas)

Uso:  python scripts/optimize_images.py        (requiere: pip install pillow)
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "bronze" / "assets-originales"
EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_SIDE, QUALITY, THUMB = 1600, 82, (800, 500)


def images(folder):
    return [f for f in sorted(folder.iterdir()) if f.is_file() and f.suffix.lower() in EXT] if folder.exists() else []


def main():
    count = 0
    dst = ROOT / "silver" / "assets"
    for f in images(SRC):
        img = ImageOps.exif_transpose(Image.open(f))
        img.thumbnail((MAX_SIDE, MAX_SIDE))
        out = dst / (f.stem + ".webp")
        img.save(out, "WEBP", quality=QUALITY, method=6)
        print(f"{f.name}: {f.stat().st_size // 1024} KB -> {out.name} ({out.stat().st_size // 1024} KB)")
        count += 1

    pdst = ROOT / "silver" / "assets" / "projects"
    pdst.mkdir(parents=True, exist_ok=True)
    for f in images(SRC / "proyectos"):
        img = ImageOps.fit(ImageOps.exif_transpose(Image.open(f)).convert("RGB"), THUMB, Image.LANCZOS)
        out = pdst / (f.stem + ".webp")
        img.save(out, "WEBP", quality=QUALITY, method=6)
        print(f"[miniatura] {f.name} -> projects/{out.name} ({out.stat().st_size // 1024} KB)")
        count += 1
    print(f"Listo: {count} imagen(es) optimizada(s)")


if __name__ == "__main__":
    main()
