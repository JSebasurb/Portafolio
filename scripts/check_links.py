#!/usr/bin/env python3
"""Revisa enlaces del sitio construido (gold/).

- Internos (archivos, anclas y pestañas data-go): si alguno está roto -> falla el despliegue.
- Externos (http/https): se prueban con HEAD/GET; si fallan solo se muestran como advertencia.

Uso: python scripts/check_links.py [--offline]
"""
import re, sys, urllib.request, urllib.error
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

GOLD = Path(__file__).resolve().parent.parent / "gold"
OFFLINE = "--offline" in sys.argv
SKIP = ("mailto:", "tel:", "javascript:", "data:", "blob:", "https://wa.me/")
OK_CODES = {401, 403, 405, 429, 999}   # sitios que bloquean bots (LinkedIn devuelve 999)


class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.links = []; s.ids = set(); s.go = []; s.tabs = []
    def handle_starttag(s, t, a):
        a = dict(a)
        if a.get("id"): s.ids.add(a["id"])
        for k in ("href", "src"):
            if a.get(k): s.links.append(a[k])
        if a.get("data-go"): s.go.append(a["data-go"])
        if a.get("data-t"): s.tabs.append(a["data-t"])


def main():
    errors, warns, external = [], [], set()
    pages = [p for p in GOLD.rglob("*.html")]
    for page in pages:
        p = P(); p.feed(page.read_text(encoding="utf-8"))
        rel = page.relative_to(GOLD)
        for link in p.links:
            if link.startswith(SKIP) or "{{" in link: continue
            u = urlparse(link)
            if u.scheme in ("http", "https"):
                if u.netloc != urlparse("https://jsebasurb.github.io").netloc: external.add(link)
                continue
            if link.startswith("#"):
                if link[1:] and link[1:] not in p.ids: errors.append(f"{rel}: ancla {link} sin destino")
                continue
            target = (page.parent / unquote(u.path)).resolve()
            if u.path.endswith("/") or target.is_dir(): target = target / "index.html"
            if not target.exists(): errors.append(f"{rel}: enlace roto -> {link}")
        for g in p.go + p.tabs:
            if g not in p.ids and g != "hub": errors.append(f"{rel}: pestaña/destino '{g}' no existe")   # "hub" agrupa Proyectos, Apps y Herramientas
    if not OFFLINE:
        for url in sorted(external):
            ok = False
            for method in ("HEAD", "GET"):
                try:
                    req = urllib.request.Request(url, method=method, headers={"User-Agent": "Mozilla/5.0 (link-check)"})
                    with urllib.request.urlopen(req, timeout=10) as r: ok = r.status < 400
                except urllib.error.HTTPError as ex: ok = ex.code in OK_CODES
                except Exception: ok = False
                if ok: break
            if not ok: warns.append(f"enlace externo no responde: {url}")
    for w in warns: print(f"::warning::{w}")
    for x in errors: print(f"::error::{x}")
    print(f"Revisados {len(pages)} archivos HTML · {len(external)} enlaces externos · {len(errors)} errores · {len(warns)} advertencias")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
