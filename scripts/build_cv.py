#!/usr/bin/env python3
"""Genera el CV en PDF a partir de silver/data/profile.json (misma fuente que la web).

Uso:  python scripts/build_cv.py      (genera ES y EN; requiere: pip install reportlab)
Salida: silver/assets/docs/CV_Juan_Sebastian_Sanchez.pdf  y  ..._EN.pdf
"""
import sys
import json
from html import escape as e
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, KeepTogether

ROOT = Path(__file__).resolve().parent.parent
LABELS = {
    "es": dict(file="profile.json", out="CV_Juan_Sebastian_Sanchez.pdf", profile="Perfil profesional", skills="Competencias técnicas",
               exp="Experiencia profesional", proj="Proyectos destacados", edu="Educación", win="Logro:", impact="Impacto:", portfolio="Portafolio"),
    "en": dict(file="profile.en.json", out="CV_Juan_Sebastian_Sanchez_EN.pdf", profile="Professional profile", skills="Technical skills",
               exp="Professional experience", proj="Featured projects", edu="Education", win="Achievement:", impact="Impact:", portfolio="Portfolio"),
}
P = {}
OUT = None
LB = {}
BLUE, GRAY, DARK = colors.HexColor("#0071e3"), colors.HexColor("#555555"), colors.HexColor("#1d1d1f")

S = {
    "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=20, leading=23, textColor=DARK),
    "head": ParagraphStyle("head", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=BLUE),
    "contact": ParagraphStyle("contact", fontName="Helvetica", fontSize=8.6, leading=11.5, textColor=GRAY),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=6, spaceAfter=1),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.6, leading=11.2, textColor=DARK),
    "role": ParagraphStyle("role", fontName="Helvetica-Bold", fontSize=9.2, leading=11.5, textColor=DARK, spaceBefore=2),
    "meta": ParagraphStyle("meta", fontName="Helvetica-Oblique", fontSize=8.4, leading=11, textColor=GRAY),
    "li": ParagraphStyle("li", fontName="Helvetica", fontSize=8.6, leading=11.2, leftIndent=10, bulletIndent=1, textColor=DARK),
}

def link(url, label):
    return f'<link href="{e(url)}" color="#0071e3">{e(label)}</link>'

def h2(t):
    return [Paragraph(t.upper(), S["h2"]), HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#d2d2d7"), spaceAfter=3)]

def li(t):
    return Paragraph(t, S["li"], bulletText="•")

def build():
    st = [Paragraph(e(P["name"]).upper(), S["name"]), Paragraph(e(P["headline"]), S["head"]), Spacer(1, 3)]
    st.append(Paragraph(
        f'{e(P["location"])} · {e(P["email"])} · {e(P["phone_display"])}<br/>'
        f'{link(P["linkedin"], "LinkedIn")} · {link(P["github"], "GitHub")} · {link(P["portfolio"], LB["portfolio"])}', S["contact"]))
    st += h2(LB["profile"]) + [Paragraph(e(P["summary"]), S["body"])]
    st += h2(LB["skills"])
    for s in [x for x in P["skills"] if x.get("cv", True)]:
        st.append(Paragraph(f'<b>{e(s["title"])}:</b> {e(", ".join(s["items"]))}.', S["body"]))
        st.append(Spacer(1, 1.5))
    st += h2(LB["exp"])
    for x in P["experience"]:
        st.append(KeepTogether([
            Paragraph(f'{e(x["role"])} — {e(x["company"])}', S["role"]),
            Paragraph(e(x["period"]), S["meta"]),
            li(e(x["text"])), li(f'<b>{LB["win"]}</b> {e(x["achievement"])}'),
        ]))
    st += h2(LB["proj"])
    _feat = [x for x in P["projects"] if x.get("cv")] or P["projects"]
    for x in _feat:
        items = [Paragraph(f'{e(x["title"])}', S["role"]), Paragraph(e(x["meta"]) + " · " + e(", ".join(x["tags"])), S["meta"]), li(e(x["text"]))]
        if x["impact"]:
            items.append(li(f'<b>{LB["impact"]}</b> {e(x["impact"])}'))
        st.append(KeepTogether(items))
    st += h2(LB["edu"])
    for x in P["education"]:
        blk = [Paragraph(f'{e(x["title"])}', S["role"])] + ([Paragraph(e(x["meta"]), S["meta"])] if x.get("meta") else [])
        if x["text"]:
            _lnk = (f' <link href="{x["url"]}" color="#0a84ff">' + ("Platzi profile" if LB["exp"].startswith("Professional") else "perfil en Platzi") + "</link>") if x.get("url") else ""
            blk.append(li(e(x["text"]) + _lnk))
        st.append(KeepTogether(blk))
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=14*mm, rightMargin=14*mm, topMargin=8*mm, bottomMargin=8*mm,
                            title=f'CV - {P["name"]}', author=P["name"])
    doc.build(st)
    print("CV generado:", OUT)

def main():
    global P, OUT, LB
    for lang, lb in LABELS.items():
        LB = lb
        P = json.loads((ROOT / "silver/data" / lb["file"]).read_text(encoding="utf-8"))
        P.setdefault("portfolio", "https://jsebasurb.github.io/Portafolio/")
        OUT = ROOT / "silver/assets/docs" / lb["out"]
        build()


if __name__ == "__main__":
    main()
