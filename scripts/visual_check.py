#!/usr/bin/env python3
"""Prueba visual: compara capturas de las secciones clave contra líneas base guardadas.

Uso:
  python scripts/visual_check.py            # compara y falla si hay cambios visuales
  python scripts/visual_check.py --update   # guarda nuevas líneas base (tras un cambio intencional)
Requiere: pip install playwright pillow && python -m playwright install chromium
"""
import functools, http.server, socketserver, sys, threading
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "gold"
BASE = ROOT / "tests" / "visual" / "baseline"
TOL = 0.004  # 0,4 % de píxeles distintos se considera ruido (antialiasing, fuentes)
SHOTS = [
    ("perfil-movil", "index.html#perfil", 390, 844, None),
    ("proyectos-escritorio", "index.html#proyectos", 1100, 800, None),
    ("herramientas-escritorio", "index.html#tools", 1100, 800, None),
    ("tarjeta-movil", "index.html#perfil", 390, 844, "#bc3d"),
]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

def serve():
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(GOLD)))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"

def capture(page, url, w, h, selector, out):
    page.set_viewport_size({"width": w, "height": h})
    page.goto(url); page.wait_for_load_state("networkidle"); page.wait_for_timeout(1200)
    if selector:
        page.locator(selector).first.scroll_into_view_if_needed(); page.wait_for_timeout(300)
        page.locator(selector).first.screenshot(path=str(out))
    else:
        page.screenshot(path=str(out), full_page=False)

def diff_ratio(a, b):
    if a.size != b.size:
        return 1.0
    d = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L")
    px = sum(1 for v in d.get_flattened_data() if v > 24) if hasattr(d, "get_flattened_data") else sum(1 for v in d.getdata() if v > 24)
    return px / (a.width * a.height)

def main():
    update = "--update" in sys.argv
    BASE.mkdir(parents=True, exist_ok=True)
    srv, base = serve(); fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(reduced_motion="reduce", color_scheme="light")
        page = ctx.new_page()
        for name, path, w, h, sel in SHOTS:
            out = BASE / f"{name}.png"
            tmp = BASE / f"_{name}.png"
            capture(page, f"{base}/{path}", w, h, sel, tmp)
            if update or not out.exists():
                tmp.replace(out); print(f"base guardada: {name}")
                continue
            r = diff_ratio(Image.open(out), Image.open(tmp))
            if r > TOL:  # reintento: descarta parpadeos o cargas tardías
                capture(page, f"{base}/{path}", w, h, sel, tmp)
                r = min(r, diff_ratio(Image.open(out), Image.open(tmp)))
            tmp.unlink()
            estado = "OK" if r <= TOL else "CAMBIO"
            print(f"{estado:7} {name}: {r*100:.2f} % de píxeles distintos")
            if r > TOL:
                fails.append(name)
        browser.close()
    srv.shutdown()
    if fails and not update:
        print(f"\n{len(fails)} sección(es) cambiaron visualmente: {', '.join(fails)}")
        sys.exit(1)
    print("\nPrueba visual: sin cambios inesperados")

if __name__ == "__main__":
    main()
