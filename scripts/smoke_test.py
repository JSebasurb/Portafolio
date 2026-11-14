#!/usr/bin/env python3
"""Prueba de humo en navegador sobre gold/: falla (exit 1) si algo esencial se rompe.

Uso: python scripts/smoke_test.py   (requiere: pip install playwright && python -m playwright install chromium)
"""
import functools
import http.server
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

GOLD = Path(__file__).resolve().parents[1] / "gold"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(Quiet, directory=str(GOLD))
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def check(name, ok, fails):
    print(("OK   " if ok else "FALLA ") + name)
    if not ok:
        fails.append(name)


def extra_checks(browser, base, check_fn, fails, errors):
    """Formulario, descarga de contacto y una herramienta."""
    ctx = browser.new_context(accept_downloads=True, viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{base}/index.html#contacto")
    page.wait_for_timeout(700)
    page.click("#cSend")
    page.wait_for_timeout(300)
    check_fn("formulario vacío marca el nombre como inválido",
             page.get_attribute("#cNombre", "aria-invalid") == "true", fails)
    page.goto(f"{base}/index.html#perfil")
    page.wait_for_timeout(700)
    with page.expect_download() as d:
        page.click("#bnVcard")
    check_fn("el botón guardar contacto descarga la vCard",
             d.value.suggested_filename == "Juan_Sebastian_Sanchez.vcf", fails)
    page.goto(f"{base}/index.html#tools")
    page.wait_for_timeout(600)
    page.click("#toolSel button[data-v=t4]")
    page.wait_for_timeout(400)
    check_fn("la calculadora de roscas responde",
             len(page.inner_text("#thInfo").strip()) > 0, fails)
    ctx.close()


def main():
    srv, base = serve()
    fails, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for path, lang in (("index.html", "es"), ("en/index.html", "en")):
            page = browser.new_page(viewport={"width": 390, "height": 844})
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"{base}/{path}")
            page.wait_for_timeout(800)
            tabs = page.evaluate("[...document.querySelectorAll('#tabs [role=tab]')].length")
            check(f"[{lang}] pestañas con rol tab ({tabs})", tabs >= 5, fails)
            sel = page.evaluate("document.querySelectorAll('#tabs [aria-selected=true]').length")
            check(f"[{lang}] una pestaña seleccionada", sel == 1, fails)
            check(f"[{lang}] tarjeta de presentación visible", page.locator("#bc3d").is_visible(), fails)
            page.locator("#bc3d").click()
            page.wait_for_timeout(300)
            check(f"[{lang}] la tarjeta gira al tocarla", page.evaluate("document.getElementById('bc3d').classList.contains('flipped')"), fails)
            page.goto(f"{base}/{path}#proyectos")
            page.wait_for_timeout(600)
            page.goto(f"{base}/{path}#cato")
            page.wait_for_timeout(600)
            site = page.get_attribute("#appGrid a[href*='Academy-tornillos']", "href")
            check(f"[{lang}] la academia enlaza a su sitio propio", bool(site), fails)
            page.goto(f"{base}/{path}#juegos")
            page.wait_for_timeout(600)
            games = page.locator("#juegos .gcard, #juegos [class*=card]").count()
            check(f"[{lang}] la sección de juegos muestra tarjetas ({games})", games >= 10, fails)
            page.close()
        browser.close()
    with sync_playwright() as p2:
        b2 = p2.chromium.launch()
        extra_checks(b2, base, check, fails, errors)
        b2.close()
    srv.shutdown()
    check("sin errores de JavaScript en la página", not errors, fails)
    for e in errors[:5]:
        print("   ", e[:160])
    if fails:
        print(f"\n{len(fails)} comprobación(es) fallida(s)")
        sys.exit(1)
    print("\nPrueba de humo: todo bien")


if __name__ == "__main__":
    main()
