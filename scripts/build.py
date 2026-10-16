#!/usr/bin/env python3
"""Silver -> Gold: toma la fuente limpia (plantilla + JSON) y genera el sitio listo para publicar."""
import json, shutil, sys, datetime
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SILVER, GOLD = ROOT / "silver", ROOT / "gold"


def chips(items):
    return "".join(f"<span>{e(i)}</span>" for i in items)


def render_profile(p, wa_number):
    skills = "".join(
        f'<div class="tile rv"><div><div class="ico">{s["icon"]}</div><h3>{e(s["title"])}</h3>'
        f'<div class="chips left">{chips(s["items"])}</div></div></div>'
        for s in p["skills"]
    )
    exp = "".join(
        f'<div class="tl-item rv"><div class="tl-per">{e(x["period"])}</div>'
        f'<h3>{e(x["role"])}</h3><div class="tl-co">{e(x["company"])}</div>'
        f'<p>{e(x["text"])}</p><p class="win"><b>Logro:</b> {e(x["achievement"])}</p></div>'
        for x in p["experience"]
    )
    projs = "".join(
        f'<div class="tile rv"><div><div class="ico">{x["icon"]}</div><h3>{e(x["title"])}</h3>'
        f'<div class="meta">{e(x["meta"])}</div><p>{e(x["text"])}</p>'
        + (f'<p class="win"><b>Impacto:</b> {e(x["impact"])}</p>' if x["impact"] else "")
        + "</div></div>"
        for x in p["projects"]
    )
    edu = "".join(
        f'<div class="tl-item rv"><div class="tl-per">{e(x["meta"])}</div><h3>{e(x["title"])}</h3>'
        + (f'<p>{e(x["text"])}</p>' if x["text"] else "")
        + "</div>"
        for x in p["education"]
    )
    wa = f"https://wa.me/{wa_number}"
    return f'''<section class="tab on" id="perfil">
  <h2>{e(p["name"])}</h2>
  <p class="sub">{e(p["headline"])}</p>
  <div class="ctas" style="margin:0 0 34px">
    <a class="pill" href="{e(p["cv_file"])}" download>Descargar CV (PDF)</a>
    <a class="link" href="{e(p["linkedin"])}" target="_blank" rel="noopener">LinkedIn ›</a>
    <a class="link" href="{e(p["github"])}" target="_blank" rel="noopener">GitHub ›</a>
  </div>
  <div class="cv-sum rv"><p class="eyebrow">Perfil profesional</p><p>{e(p["summary"])}</p></div>
  <h3 class="sec">Competencias técnicas</h3>
  <div class="bento">{skills}</div>
  <h3 class="sec">Experiencia profesional</h3>
  <div class="tl">{exp}</div>
  <h3 class="sec">Proyectos destacados</h3>
  <div class="bento">{projs}</div>
  <h3 class="sec">Educación</h3>
  <div class="tl">{edu}</div>
  <div class="cta rv" style="margin-top:50px">
    <h2>Trabajemos juntos</h2>
    <p class="sub">📍 {e(p["location"])} · ✉️ <a class="link" style="padding:0" href="mailto:{e(p["email"])}">{e(p["email"])}</a> · 📞 {e(p["phone_display"])}</p>
    <a class="pill" href="{wa}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
  </div>
</section>'''


def main():
    cfg = json.loads((SILVER / "data" / "site.json").read_text(encoding="utf-8"))
    prof = json.loads((SILVER / "data" / "profile.json").read_text(encoding="utf-8"))
    num = cfg["whatsapp_number"]
    if not num.isdigit():
        sys.exit("ERROR: whatsapp_number debe contener solo dígitos")

    if GOLD.exists():
        for f in GOLD.iterdir():
            shutil.rmtree(f) if f.is_dir() else f.unlink()
    for d in ("css", "js", "img", "docs"):
        (GOLD / "assets" / d).mkdir(parents=True)
    (GOLD / ".nojekyll").touch()

    rep = {
        "{{WA_NUMBER}}": num,
        "{{SITE_TITLE}}": e(cfg["site_title"]),
        "{{SITE_DESC}}": e(cfg["site_description"], quote=True),
        "{{YEAR}}": str(datetime.date.today().year),
        "{{PROFILE_SECTION}}": render_profile(prof, num),
    }

    def render(text):
        for k, v in rep.items():
            text = text.replace(k, v)
        return text

    (GOLD / "index.html").write_text(render((SILVER / "src" / "index.template.html").read_text(encoding="utf-8")), encoding="utf-8")
    shutil.copy(SILVER / "src" / "styles.css", GOLD / "assets/css/styles.css")
    for js in sorted((SILVER / "src").glob("*.js")):
        (GOLD / "assets/js" / js.name).write_text(render(js.read_text(encoding="utf-8")), encoding="utf-8")

    assets = SILVER / "assets"
    for f in assets.iterdir():
        if f.is_file() and f.name != ".gitkeep":
            shutil.copy(f, GOLD / "assets/img" / f.name)
    if (assets / "docs").exists():
        for f in (assets / "docs").iterdir():
            shutil.copy(f, GOLD / "assets/docs" / f.name)

    # validación de calidad
    for f in [GOLD / "index.html", *(GOLD / "assets/js").glob("*.js")]:
        assert "{{" not in f.read_text(encoding="utf-8"), f"Placeholders sin reemplazar en {f.name}"
    for ref in ("assets/css/styles.css", "assets/js/app.js", "assets/js/tools.js", "assets/img/favicon.svg", prof["cv_file"]):
        assert (GOLD / ref).exists(), f"Falta {ref}"
    print(f"OK -> gold/ listo ({(GOLD / 'index.html').stat().st_size // 1024} KB de HTML). WhatsApp: {num}")


if __name__ == "__main__":
    main()
