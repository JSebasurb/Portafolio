#!/usr/bin/env python3
"""Tarjeta para imprimir: PDF de 85 x 55 mm con 3 mm de sangrado (2 páginas: frente y reverso).

Uso: python scripts/print_card.py   (requiere reportlab y Pillow)
Salida: silver/assets/docs/Tarjeta_Imprimir.pdf
"""
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white

ROOT = Path(__file__).resolve().parents[1]
BLEED = 3 * mm
W, H = 85 * mm + 2 * BLEED, 55 * mm + 2 * BLEED
NAVY, BLUE, BLUE_LIGHT, INK, PAPER, MUTED = HexColor("#0b1220"), HexColor("#2997ff"), HexColor("#0071e3"), HexColor("#0b1220"), HexColor("#f8fafc"), HexColor("#475569")

def logo_png():
    src = ROOT / "silver" / "assets" / "logo.webp"
    out = Path("/tmp/logo_print.png")
    Image.open(src).convert("RGBA").resize((256, 256), Image.LANCZOS).save(out, "PNG")
    return str(out)

def front(c):
    c.setFillColor(NAVY); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setStrokeColor(BLUE); c.setLineWidth(0.6)
    c.roundRect(BLEED + 2*mm, BLEED + 2*mm, 85*mm - 4*mm, 55*mm - 4*mm, 3*mm, stroke=1, fill=0)
    x0, y0 = BLEED + 7*mm, BLEED
    c.drawImage(logo_png(), x0, y0 + 40*mm, width=12*mm, height=12*mm, mask="auto")
    c.setFillColor(white); c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x0 + 14*mm, y0 + 45*mm, "JSebasurb")
    c.setFont("Helvetica-Bold", 15); c.drawString(x0, y0 + 33*mm, "Juan Sebastián")
    c.setFillColor(BLUE); c.drawString(x0, y0 + 26*mm, "Sánchez Urbano")
    c.setFillColor(white); c.setFont("Helvetica-Bold", 7.6)
    c.drawString(x0, y0 + 19*mm, "Ingeniero en Automática Industrial")
    c.setFillColor(white); c.roundRect(BLEED + 64*mm, y0 + 7*mm, 17*mm, 17*mm, 1.5*mm, stroke=0, fill=1)
    c.drawImage(str(ROOT / "silver" / "assets" / "qr.png"), BLEED + 64.6*mm, y0 + 7.6*mm, width=15.8*mm, height=15.8*mm, mask=None)
    c.setFont("Helvetica", 6.6); c.setFillColor(HexColor("#cbd5e1"))
    for i, line in enumerate(["jsebasurb@hotmail.com", "+57 301 389 2534",
                              "jsebasurb.github.io/Portafolio", "Cali, Colombia"]):
        c.drawString(x0, y0 + 12.5*mm - i*2.9*mm, line)

def back(c):
    c.setFillColor(PAPER); c.rect(0, 0, W, H, stroke=0, fill=1)
    x0, y0 = BLEED + 7*mm, BLEED
    c.setFillColor(BLUE_LIGHT); c.setFont("Helvetica-Bold", 5.6)
    c.drawString(x0, y0 + 47*mm, "LO QUE CONSTRUYO")
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 9.5)
    c.drawString(x0, y0 + 41*mm, "Soluciones de ingeniería, datos e IA")
    items = ["Machine Learning", "Inteligencia artificial", "Power BI y dashboards",
             "Análisis de ventas", "Automatización industrial", "Asesoría técnica"]
    cw, ch, gap = 36*mm, 8.2*mm, 2.4*mm
    for i, label in enumerate(items):
        col, row = i % 2, i // 2
        x = x0 + col * (cw + gap)
        y = y0 + 29*mm - row * (ch + gap)
        c.setStrokeColor(HexColor("#cbd5e1")); c.setLineWidth(0.4)
        c.setFillColor(white); c.roundRect(x, y, cw, ch, 2*mm, stroke=1, fill=1)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 6.2)
        c.drawString(x + 2.2*mm, y + 2.8*mm, label)
    c.setFillColor(MUTED); c.setFont("Helvetica", 5.8)
    c.drawString(x0, y0 + 3*mm, "Ventas técnicas e ingeniería para soluciones de alto valor.")
    c.setFillColor(BLUE_LIGHT); c.setFont("Helvetica-Bold", 6.4)
    c.drawRightString(BLEED + 78*mm, y0 + 3*mm, "JSebasurb")

def main():
    out = ROOT / "silver" / "assets" / "docs" / "Tarjeta_Imprimir.pdf"
    c = canvas.Canvas(str(out), pagesize=(W, H))
    c.setTitle("Tarjeta de presentación - Juan Sebastián Sánchez Urbano")
    front(c); c.showPage()
    back(c); c.showPage()
    c.save()
    print("PDF generado:", out.relative_to(ROOT))

if __name__ == "__main__":
    main()
