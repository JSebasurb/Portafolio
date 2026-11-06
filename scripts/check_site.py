#!/usr/bin/env python3
"""Revisión de calidad del sitio generado (gold/): accesibilidad y consistencia básica.

Revisa: ids duplicados, imágenes sin texto alternativo, botones y enlaces sin nombre accesible,
y que cada página tenga idioma y título. Sale con código 1 si hay errores graves.

Uso: python scripts/check_site.py
"""
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

GOLD = Path(__file__).resolve().parent.parent / "gold"
PAGES = [GOLD / "index.html", GOLD / "en" / "index.html"]

class Audit(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = []; self.problems = []; self.stack = []; self.title = ""; self.lang = None; self._in_title = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html": self.lang = a.get("lang")
        if a.get("id"): self.ids.append(a["id"])
        if tag == "title": self._in_title = True
        if tag == "img" and a.get("alt") is None: self.problems.append(f"img sin alt: {a.get('src','')[:60]}")
        if tag in ("button", "a"):
            self.stack.append({"tag": tag, "aria": a.get("aria-label") or a.get("title") or "", "text": "", "src": a.get("href") or a.get("data-go") or a.get("data-t") or a.get("data-v") or a.get("id") or "", "hidden": "hidden" in a})
    def handle_endtag(self, tag):
        if tag == "title": self._in_title = False
        if tag in ("button", "a") and self.stack:
            el = self.stack.pop()
            name = (el["aria"] or el["text"]).strip()
            if not name and not el["hidden"]:
                self.problems.append(f"{el['tag']} sin nombre accesible: {el['src'][:60]}")
    def handle_data(self, data):
        if self._in_title: self.title += data
        if self.stack: self.stack[-1]["text"] += data

def main():
    errors = 0
    for page in PAGES:
        if not page.exists():
            print(f"FALTA {page.relative_to(GOLD)}"); errors += 1; continue
        a = Audit(); a.feed(page.read_text(encoding="utf-8"))
        rel = page.relative_to(GOLD)
        dup = [k for k, v in Counter(a.ids).items() if v > 1]
        if dup: print(f"{rel}: ids duplicados {dup[:8]}"); errors += len(dup)
        if not a.lang: print(f"{rel}: falta atributo lang"); errors += 1
        if not a.title.strip(): print(f"{rel}: falta título"); errors += 1
        for p in a.problems[:12]: print(f"{rel}: {p}")
        errors += len(a.problems)
        print(f"{rel}: {len(a.ids)} ids, {len(a.problems)} avisos de accesibilidad, lang={a.lang}")
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
