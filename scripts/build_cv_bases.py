#!/usr/bin/env python3
"""Genera las tres bases de CV (automatización, marketing y ventas, datos e IA).

Usa el mismo diseño y los mismos datos de silver/data/profile.json que build_cv.py.
Cada base cambia solo el titular, el orden de la experiencia y qué competencias y
proyectos aparecen. No se inventa ningún dato: todo viene del perfil.

Uso: python scripts/build_cv_bases.py   (requiere reportlab, como build_cv.py)
"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_cv as cv  # reutiliza el diseño del CV

PROFILE = json.loads((ROOT / "silver/data/profile.json").read_text(encoding="utf-8"))
PROFILE.setdefault("portfolio", "https://jsebasurb.github.io/Portafolio/")
DOCS = ROOT / "silver/assets/docs"

def pick(items, keys, key_fn):
    """Devuelve los elementos en el orden de 'keys' (coincidencia por inicio del texto)."""
    out = []
    for k in keys:
        hit = next((x for x in items if key_fn(x).startswith(k)), None)
        if hit is not None:
            out.append(hit)
    return out

BASES = [
    {
        "file": "cv-base-automatizacion.pdf",
        "headline": "Ingeniero en Automática Industrial · Automatización industrial, PLC, CNC, robótica e IoT",
        "skills": ["Ingeniería & Consultoría B2B", "Cloud, Datos & Automatización"],
        "projects": ["Dashboard de producción", "Mantenimiento predictivo", "Captura de datos en tiempo real"],
        "experience": ["Líder de Área CNC", "Asesor Técnico", "Fundador & Diseñador", "Fundador & Consultor"],
    },
    {
        "file": "cv-base-marketing-ventas.pdf",
        "headline": "Ingeniero en Automática Industrial · Ventas consultivas y soluciones digitales",
        "skills": ["Ingeniería & Consultoría B2B", "Machine Learning & IA", "Cloud, Datos & Automatización"],
        "projects": ["Pipeline ETL automatizado", "Taller 3D y servicios de automatización"],
        "experience": ["Asesor Técnico", "Fundador & Consultor", "Líder de Área CNC", "Fundador & Diseñador"],
    },
    {
        "file": "cv-base-datos-ia.pdf",
        "headline": "Ingeniero en Automática Industrial · Machine Learning, Ciencia de Datos e IA",
        "skills": ["Machine Learning & IA", "Cloud, Datos & Automatización", "Desarrollo Web, Apps & BI"],
        "projects": ["Mantenimiento predictivo", "ETL epidemiológico SIVIGILA", "Motor Serverless"],
        "experience": ["Líder de Área CNC", "Asesor Técnico", "Fundador & Consultor", "Fundador & Diseñador"],
    },
]

def variant(base):
    p = copy.deepcopy(PROFILE)
    p["headline"] = base["headline"]
    skills = pick(p["skills"], base["skills"], lambda s: s["title"])
    for s in p["skills"]:
        s["cv"] = s in skills
    p["skills"] = skills
    projs = pick(p["projects"], base["projects"], lambda x: x["title"])
    for x in p["projects"]:
        x["cv"] = x in projs
    p["projects"] = projs
    exp = pick(p["experience"], base["experience"], lambda x: x["role"])
    p["experience"] = exp + [x for x in p["experience"] if x not in exp]
    return p

def main():
    cv.LB = cv.LABELS["es"]
    for base in BASES:
        cv.P = variant(base)
        cv.OUT = DOCS / base["file"]
        cv.build()
    import hashlib
    manifest_path = DOCS / "cv-bases.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for item in manifest:
        digest = hashlib.sha1((DOCS / item["file"]).read_bytes()).hexdigest()
        item["sha1"] = digest
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("bases generadas y huellas actualizadas:", ", ".join(b["file"] for b in BASES))

if __name__ == "__main__":
    main()
