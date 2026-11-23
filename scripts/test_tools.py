#!/usr/bin/env python3
"""Pruebas funcionales de las herramientas (se ejecutan sobre gold/, después del build).

Uso: python scripts/test_tools.py
Requiere: pip install playwright && python -m playwright install chromium
Opcional: pip install opencv-python-headless (si no está, la prueba del QR se omite).
"""
import re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

TOOLS = Path(__file__).resolve().parents[1] / "gold" / "assets" / "tools"
fails = []

def check(name, ok):
    print(("OK   " if ok else "FALLA ") + name)
    if not ok:
        fails.append(name)

def open_tool(b, name):
    pg = b.new_page(viewport={"width": 900, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto((TOOLS / name).as_uri())
    pg.wait_for_timeout(300)
    return pg, errors

def numero(texto):
    return int(re.sub(r"[^\d]", "", texto) or 0)

def test_prestamo(b):
    pg, errs = open_tool(b, "calculadora-prestamos.html")
    P, anual, n = 10_000_000, 18, 36
    r = anual / 100 / 12
    cuota_ref = P * r / (1 - (1 + r) ** -n)
    cuota = numero(pg.locator("#kpi > div").first.locator("b").inner_text())
    check(f"préstamo: cuota mensual coincide con la fórmula ({cuota} vs {round(cuota_ref)})", abs(cuota - round(cuota_ref)) <= 1)
    filas = pg.locator("#tbl tbody tr").count()
    check("préstamo: tabla de amortización con 12 meses y el último", filas == 13)
    check("préstamo: sin errores de JavaScript", not errs)
    pg.close()

def test_ruleta_probabilidades(b):
    pg, errs = open_tool(b, "ruleta.html")
    nombres = pg.locator("#opts input[type=text]")
    pesos = pg.locator("#opts input[type=number]")
    nombres.nth(0).fill("A"); nombres.nth(0).dispatch_event("input")
    nombres.nth(1).fill("B"); nombres.nth(1).dispatch_event("input")
    pesos.nth(0).fill("70"); pesos.nth(0).dispatch_event("change")
    pesos.nth(1).fill("30"); pesos.nth(1).dispatch_event("change")
    pesos.nth(2).fill("0"); pesos.nth(2).dispatch_event("change")
    pesos.nth(3).fill("0"); pesos.nth(3).dispatch_event("change")
    pg.wait_for_timeout(150)
    etiquetas = pg.locator("#opts .real").all_inner_texts()
    check("ruleta: probabilidad de A = 70 %", "70.0 %" in etiquetas[0])
    check("ruleta: probabilidad de B = 30 %", "30.0 %" in etiquetas[1])
    check("ruleta: sin errores de JavaScript", not errs)
    pg.close()

def test_contrasenas(b):
    pg, errs = open_tool(b, "generador-contrasenas.html")
    for _ in range(20):
        pg.click("#gen")
        pw = pg.locator("#pw").inner_text()
        if len(pw) != 16 or not (re.search(r"[A-Z]", pw) and re.search(r"[a-z]", pw) and re.search(r"\d", pw) and re.search(r"[^A-Za-z0-9]", pw)):
            break
    check("contraseñas: largo 16 por defecto", len(pw) == 16)
    check("contraseñas: incluye mayúsculas, minúsculas, números y símbolos", bool(re.search(r"[A-Z]", pw) and re.search(r"[a-z]", pw) and re.search(r"\d", pw) and re.search(r"[^A-Za-z0-9]", pw)))
    check("contraseñas: sin errores de JavaScript", not errs)
    pg.close()

def test_tablero(b):
    pg, errs = open_tool(b, "tablero-tareas.html")
    pg.fill("input.t", "Prueba de tarea")
    pg.click("#add")
    pg.wait_for_timeout(100)
    tarjetas = pg.locator(".col").nth(0).locator(".card").count()
    check("tablero: una tarea nueva aparece en 'Por hacer'", tarjetas == 1)
    pg.locator(".col").nth(0).locator("button", has_text="→").first.click()
    pg.wait_for_timeout(100)
    check("tablero: la tarea avanza a 'En curso'", pg.locator(".col").nth(1).locator(".card").count() == 1)
    check("tablero: sin errores de JavaScript", not errs)
    pg.close()

def test_qr(b):
    try:
        import cv2, numpy  # noqa: F401
    except ImportError:
        print("OMITIDA  QR: instala opencv-python-headless para esta prueba")
        return
    texto = "https://jsebasurb.github.io/Portafolio/"
    pg, errs = open_tool(b, "qr-codigo.html")
    pg.fill("#txt", texto)
    pg.click("#mk")
    pg.wait_for_timeout(150)
    import base64, tempfile
    data = pg.evaluate("document.getElementById('cv').toDataURL('image/png')")
    tmp = Path(tempfile.gettempdir()) / "qr-prueba.png"
    tmp.write_bytes(base64.b64decode(data.split(",")[1]))
    img = cv2.imread(str(tmp))
    leido, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    check("QR: el código se lee con OpenCV y devuelve el enlace exacto", leido == texto)
    pg.close()

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        test_prestamo(b)
        test_ruleta_probabilidades(b)
        test_contrasenas(b)
        test_tablero(b)
        test_qr(b)
        b.close()
    if fails:
        print(f"\n{len(fails)} prueba(s) fallida(s)")
        sys.exit(1)
    print("\nPruebas de herramientas: todo bien")

if __name__ == "__main__":
    main()
