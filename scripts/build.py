#!/usr/bin/env python3
"""Silver -> Gold: genera el sitio bilingüe (ES en / y EN en /en/) listo para publicar."""
import datetime, json, re, shutil, sys, time
from html import escape as e
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SILVER, GOLD, DATA = ROOT / "silver", ROOT / "gold", ROOT / "silver" / "data"
LANGS = ("es", "en")
GRADS = [("#ff9f0a", "#ff375f"), ("#5e5ce6", "#0a84ff"), ("#30d158", "#0a9d8f"), ("#bf5af2", "#ff2d92"), ("#48484a", "#1c1c1e"), ("#ff375f", "#bf5af2")]

UI = {
    "es": dict(cv="Descargar CV (PDF)", try_tool="Abrir la herramienta ›", edu_link="Ver perfil en Platzi ↗", try_go="Ver ›", s_profile="Perfil profesional", s_skills="Competencias técnicas", s_exp="Experiencia profesional",
               s_proj="Proyectos destacados", s_edu="Educación", win="Logro:", impact="Impacto:", all_proj="Ver todos mis proyectos",
               work="Trabajemos juntos", wa="Escribir por WhatsApp", use_form="Usar el formulario ›",
               p_title="Mis proyectos.", p_sub="Datos, automatización, web e ingeniería. Toca una miniatura para abrir el proyecto.",
               all="Todos", view="Ver proyecto", repo="Ver código en GitHub", case="Ver caso de estudio", problem="Problema", solution="Solución",
               result="Resultado", open="Abrir", thumb="Miniatura de",
               k_title="Hechos en el taller", k_sub="Toca una foto para verla más grande y pídela por WhatsApp.", k_order="Pedir este diseño ›",
               k_msg="Hola, quiero pedir el diseño «{name}». ¿Me cotizas?", k_zoom="Ampliar {name}",
               b_title="Blog.", b_sub="Notas cortas sobre datos y automatización.", faq="Preguntas frecuentes", faq_btn="Ver preguntas frecuentes",
               fab="Hola, quiero cotizar un servicio", job="Ingeniero en Automática Industrial · ML y Ventas", alt_label="EN", alt_aria="Switch to English", alt_code="en", alt_url="en/",
               locale="es_CO", root=""),
    "en": dict(cv="Download CV (PDF)", try_tool="Open the tool ›", edu_link="View Platzi profile ↗", try_go="View ›", s_profile="Professional profile", s_skills="Technical skills", s_exp="Professional experience",
               s_proj="Featured projects", s_edu="Education", win="Achievement:", impact="Impact:", all_proj="See all my projects",
               work="Let's work together", wa="Message on WhatsApp", use_form="Use the form ›",
               p_title="My projects.", p_sub="Data, automation, web and engineering. Tap a thumbnail to open the project.",
               all="All", view="View project", repo="View code on GitHub", case="See case study", problem="Problem", solution="Solution",
               result="Result", open="Open", thumb="Thumbnail of",
               k_title="Made in the workshop", k_sub="Tap a photo to see it larger and order it via WhatsApp.", k_order="Order this design ›",
               k_msg="Hi, I'd like to order the design “{name}”. Could you quote it?", k_zoom="Enlarge {name}",
               b_title="Blog.", b_sub="Short notes on data and automation.", faq="Frequently asked questions", faq_btn="See FAQ",
               fab="Hi, I'd like a quote for a service", job="Industrial Automation Engineer · ML and Sales", alt_label="ES", alt_aria="Cambiar a español", alt_code="es", alt_url="../",
               locale="en_US", root="../"),
}


def jl(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def chips(items):
    return "".join(f"<span>{e(i)}</span>" for i in items)


def wa_link(num, msg):
    return f"https://wa.me/{num}?text={quote(msg)}"


def translate(html, d):
    """Traduce los textos y atributos de la plantilla usando el diccionario ES->EN."""
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>)", html, flags=re.S)

    def node(m):
        raw = m.group(1)
        key = " ".join(raw.split())
        if key in d:
            return ">" + raw[: len(raw) - len(raw.lstrip())] + d[key] + raw[len(raw.rstrip()):] + "<"
        return m.group(0)

    def attr(m):
        return f'{m.group(1)}="{d.get(m.group(2), m.group(2))}"'

    out = []
    for i, p in enumerate(parts):
        if i % 2:
            out.append(p)
            continue
        p = re.sub(r">([^<>]+)<", node, p)
        p = re.sub(r'\b(placeholder|aria-label|title|alt|value|data-msg)="([^"]*)"', attr, p)
        out.append(p)
    return "".join(out)


# ---------------------------------------------------------------- secciones
def render_case(c, u):
    if not c or not any(c.get(k) for k in ("problem", "solution", "result")):
        return ""
    rows = "".join(f"<dt>{e(u[k])}</dt><dd>{e(c[k])}</dd>" for k in ("problem", "solution", "result") if c.get(k))
    return f'<details class="case"><summary>{e(u["case"])}</summary><dl>{rows}</dl></details>'


TAGS_EN = {"Avatar IA": "AI avatar", "Educación": "Education", "Planificación": "Planning", "Simulación": "Simulation", "Búsqueda": "Search", "Clasificación": "Classification", "Visión por computador": "Computer vision", "Señales": "Signals", "Gráficas": "Charts", "Estadística": "Statistics", "Ingeniería": "Engineering", "Animación IA": "AI animation", "Medallón": "Medallion", "Impresión 3D": "3D printing", "Estampado": "Printing", "Dashboard": "Dashboard", "Sensores": "Sensors",
           "Alertas": "Alerts", "Tiempo real": "Real time", "APIs REST": "REST APIs", "IA": "AI"}


def localize(x, L):
    if L == "en" and x.get("en"):
        y = dict(x)
        y.update(x["en"])
        y["tags"] = [TAGS_EN.get(t, t) for t in x.get("tags", [])]
        if "case" not in x["en"]:
            y.pop("case", None)
        return y
    return x


def render_profile(p, num, u, root):
    skills = "".join(f'<div class="tile rv"><div><div class="ico">{s["icon"]}</div><h3>{e(s["title"])}</h3><div class="chips left">{chips(s["items"])}</div></div></div>' for s in p["skills"])
    exp = "".join(f'<div class="tl-item rv"><div class="tl-per">{e(x["period"])}</div><h3>{e(x["role"])}</h3><div class="tl-co">{e(x["company"])}</div><p>{e(x["text"])}</p><p class="win"><b>{e(u["win"])}</b> {e(x["achievement"])}</p></div>' for x in p["experience"])
    projs = "".join(
        f'<div class="tile rv"><div><div class="ico">{x["icon"]}</div><h3>{e(x["title"])}</h3><div class="meta">{e(x["meta"])}</div><p>{e(x["text"])}</p>'
        + (f'<p class="win"><b>{e(u["impact"])}</b> {e(x["impact"])}</p>' if x["impact"] else "")
        + '<div class="tag-row">' + "".join(f"<span>{e(t)}</span>" for t in x.get("tags", [])) + "</div>"
        + (f'<a class="repo" href="{e(x["link"])}" target="_blank" rel="noopener">{e(u["repo"])} ›</a>' if x.get("link") else "")
        + "</div></div>" for x in p["projects"][:3])
    edu = "".join(f'<div class="tl-item rv"><div class="tl-per">{e(x["meta"])}</div><h3>{e(x["title"])}</h3>' + (f'<p>{e(x["text"])}</p>' if x["text"] else "") + (f'<p><a href="{e(x["url"])}" target="_blank" rel="noopener">{e(u["edu_link"])}</a></p>' if x.get("url") else "") + "</div>" for x in p["education"])
    return f'''<section class="tab on" id="perfil">
  <h2>{e(p["name"])}</h2>
  <p class="sub">{e(p["headline"])}</p>
  <div class="ctas" style="margin:0 0 34px">
    <a class="pill" href="{root}{e(p["cv_file"])}" download>{e(u["cv"])}</a>
    <a class="link" href="{e(p["linkedin"])}" target="_blank" rel="noopener">LinkedIn ›</a>
    <a class="link" href="{e(p["github"])}" target="_blank" rel="noopener">GitHub ›</a>
    <a class="link" href="{e(p["youtube"])}" target="_blank" rel="noopener">YouTube ›</a>
  </div>
  <div class="cv-sum rv"><p class="eyebrow">{e(u["s_profile"])}</p><p>{e(p["summary"])}</p></div>
  <h3 class="sec">{e(u["s_skills"])}</h3><div class="bento">{skills}</div>
  <h3 class="sec">{e(u["s_exp"])}</h3><div class="tl">{exp}</div>
  <h3 class="sec">{e(u["s_proj"])}</h3><div class="bento">{projs}</div>
  <div class="ctas" style="margin-top:22px"><button class="pill" data-go="proyectos">{e(u["all_proj"])}</button></div>
  <h3 class="sec">{e(u["s_edu"])}</h3><div class="tl">{edu}</div>
  <div class="cta rv" style="margin-top:50px">
    <h2>{e(u["work"])}</h2>
    <p class="sub">📍 {e(p["location"])} · ✉️ <a class="link" style="padding:0" href="mailto:{e(p["email"])}">{e(p["email"])}</a> · 📞 {e(p["phone_display"])}</p>
    <a class="pill" href="https://wa.me/{num}" target="_blank" rel="noopener">{e(u["wa"])}</a> <button class="link" data-go="contacto">{e(u["use_form"])}</button>
  </div>
</section>'''


def render_projects(pj, L, u, root):
    items = [localize(x, L) for x in pj["projects"] if x.get("visible", True)]
    cats = []
    for x in items:
        if x["category"] not in cats:
            cats.append(x["category"])
    filt = f'<button class="on" data-c="all">{e(u["all"])}</button>' + "".join(f'<button data-c="{e(c)}">{e(c)}</button>' for c in cats)
    cards = []
    for i, x in enumerate(items):
        thumb = x.get("thumbnail", "").strip()
        if thumb:
            assert (SILVER / "assets" / "projects" / thumb).exists(), f"Falta la miniatura silver/assets/projects/{thumb}"
            media = f'<img loading="lazy" decoding="async" src="{root}assets/projects/{e(thumb)}" alt="{e(u["thumb"])} {e(x["title"])}">'
        else:
            g1, g2 = GRADS[i % len(GRADS)]
            media = f'<div class="pfb" style="background:linear-gradient(135deg,{g1},{g2})"><span>{x.get("emoji", "📁")}</span></div>'
        link = x.get("link", "").strip()
        if link:
            th = f'<a class="pthumb" href="{e(link)}" target="_blank" rel="noopener" aria-label="{e(u["open"])} {e(x["title"])}">{media}</a>'
            btn = f'<a class="repo" href="{e(link)}" target="_blank" rel="noopener">{e(x.get("link_label") or u["view"])} ›</a>'
        else:
            th, btn = f'<div class="pthumb">{media}</div>', ""
        extra = ""
        if x.get("tool"):
            extra += f'<button class="repo" type="button" data-tool="{e(x["tool"])}">{e(u["try_tool"])}</button>'
        if x.get("go"):
            extra += f'<button class="repo" type="button" data-go="{e(x["go"])}">{e(u["try_go"])}</button>'
        meta = " · ".join(v for v in (x["category"], x.get("year", "")) if v)
        tags = "".join(f"<span>{e(t)}</span>" for t in x.get("tags", []))
        cards.append(f'<article class="pcard rv" data-cat="{e(x["category"])}">{th}<div class="pbody"><div class="meta">{e(meta)}</div><h3>{e(x["title"])}</h3><p>{e(x["description"])}</p><div class="tag-row">{tags}</div>{render_case(x.get("case"), u)}{btn}{extra}</div></article>')
    return f'''<section class="tab" id="proyectos">
  <h2>{e(u["p_title"])}</h2>
  <p class="sub">{e(u["p_sub"])}</p>
  <div class="pbar"><div class="seg wrap" id="pFilter">{filt}</div><span id="pCount" class="pcount"></span></div>
  <div class="pgrid">{"".join(cards)}</div>
</section>'''


def render_catalog(cat, L, u, root, num):
    items = [localize(x, L) for x in cat["items"] if x.get("visible", True)]
    cats = []
    for x in items:
        if x["category"] not in cats:
            cats.append(x["category"])
    filt = f'<button class="on" data-c="all">{e(u["all"])}</button>' + "".join(f'<button data-c="{e(c)}">{e(c)}</button>' for c in cats)
    cards = []
    for x in items:
        assert (SILVER / "assets" / "catalog" / x["image"]).exists(), f"Falta silver/assets/catalog/{x['image']}"
        kind = " case" if x["category"].lower().startswith(("estuche", "case")) else ""
        href = wa_link(num, u["k_msg"].format(name=x["name"]))
        cards.append(
            f'<article class="ccard{kind}" data-cat="{e(x["category"])}"><button class="cthumb" type="button" aria-label="{e(u["k_zoom"].format(name=x["name"]))}">'
            f'<img loading="lazy" decoding="async" src="{root}assets/catalog/{e(x["image"])}" alt="{e(x["name"])}"></button>'
            f'<div class="cbody"><h3>{e(x["name"])}</h3><p>{e(x["desc"])}</p><a class="repo" href="{e(href)}" target="_blank" rel="noopener">{e(u["k_order"])}</a></div></article>')
    return f'''<div class="kbar"><h3>{e(u["k_title"])}</h3><div class="seg wrap" id="kFilter">{filt}</div></div>
  <p class="sub" style="text-align:left;margin:0 0 16px;max-width:none">{e(u["k_sub"])}</p>
  <div class="kgrid">{"".join(cards)}</div>'''


def render_print3d(d, num, root=""):
    v = d["v"]
    specs = "".join(f"<dt>{e(a)}</dt><dd>{e(b)}</dd>" for a, b in d["printer"]["specs"])
    uses = "".join(f'<div class="tile rv"><div><div class="ico">{i}</div><h3>{e(t)}</h3><p>{e(x)}</p></div></div>' for i, t, x in d["uses"])
    steps = "".join(f'<div class="tl-item rv"><div class="tl-per">{e(a)}</div><h3>{e(b)}</h3><p>{e(c)}</p></div>' for a, b, c in d["steps"])
    tips = "".join(f'<div class="tile rv"><div><h3>{e(t)}</h3><p>{e(x)}</p></div></div>' for t, x in d["tips"])
    m = d["mat"]
    li = lambda xs, c: "".join(f'<li class="{c}">{e(x)}</li>' for x in xs)
    demos = "".join(f'<button class="mini" type="button" data-demo="{k}" data-name="{e(v[k])}">{e(v[k])}</button>' for k in ("gear", "key", "vase", "pawn"))
    sp = "".join(
        f'<div class="tile sp rv">' + (f'<img class="sp-img" loading="lazy" decoding="async" src="{root}assets/catalog/{e(im)}" alt="{e(t)}">' if im else "")
        + f'<div><div class="ico">{i}</div><h3>{e(t)}</h3><p>{e(x)}</p></div>'
        + f'<a class="link" href="{wa_link(num, msg)}" target="_blank" rel="noopener" style="padding:10px 0 0">{e(d["special_cta"])}</a></div>'
        for i, t, x, msg, im in d["special"])
    es = d["printer"]
    return f'''<section class="tab" id="imp3d">
  <h2>{e(d["title"])}</h2>
  <p class="sub">{e(d["sub"])}</p>
  <div class="ctas" style="margin:0 0 30px"><a class="pill" href="{wa_link(num, d["cta_msg"])}" target="_blank" rel="noopener">{e(d["cta_quote"])}</a><button class="link" data-go="contacto">{e(d["cta_form"])}</button></div>
  <div class="p3 rv"><div><p class="eyebrow">{e(es["eyebrow"])}</p><h3>{e(es["name"])}</h3><p>{e(es["text"])}</p></div><dl class="specs">{specs}</dl></div>
  <h3 class="sec">{e(d["h_viewer"])}</h3>
  <p class="sub" style="text-align:left;margin:0 0 16px;max-width:none">{e(d["v_sub"])}</p>
  <div class="viewer rv">
    <div class="vwrap"><canvas id="sCanvas" role="img" aria-label="{e(v["canvas"])}"></canvas>
      <div class="vtools"><button class="mini" type="button" id="sAuto">⟳ {e(v["auto"])}</button><button class="mini" type="button" id="sZin" aria-label="{e(v["zin"])}">＋</button><button class="mini" type="button" id="sZout" aria-label="{e(v["zout"])}">－</button></div></div>
    <div class="vside">
      <div class="rd-bar">{demos}<label class="mini" for="sFile">{e(v["open"])}<input type="file" id="sFile" accept=".stl,model/stl" hidden></label></div>
      <dl class="specs">
        <dt>{e(v["file"])}</dt><dd id="sName"></dd>
        <dt>{e(v["dims"])}</dt><dd id="sDims"></dd>
        <dt>{e(v["vol"])}</dt><dd id="sVol"></dd>
        <dt>{e(v["infill"])} <b id="sPct"></b></dt><dd><input type="range" id="sInfill" min="5" max="100" step="5" value="20" aria-label="{e(v["infill"])}"></dd>
        <dt>{e(v["mass"])}</dt><dd id="sMass"></dd>
        <dt>{e(v["fit"])}</dt><dd id="sFit" role="status"></dd>
      </dl>
      <button class="pill sm" type="button" id="sQuote">{e(v["quote"])}</button>
      <small class="hint" style="margin-top:10px">{e(v["hint"])}</small>
    </div>
  </div>
  <h3 class="sec">{e(d["h_special"])}</h3>
  <p class="sub" style="text-align:left;margin:0 0 16px;max-width:none">{e(d["special_sub"])}</p>
  <div class="bento ideas spg">{sp}</div>
  <h3 class="sec">{e(d["h_uses"])}</h3><div class="bento ideas">{uses}</div>
  <h3 class="sec">{e(d["h_process"])}</h3><div class="tl">{steps}</div>
  <h3 class="sec">{e(d["h_mat"])}</h3>
  <div class="mat rv"><h3>{e(m["title"])}</h3><div class="two"><div><b>{e(m["pros_t"])}</b><ul>{li(m["pros"], "pro")}</ul></div><div><b>{e(m["cons_t"])}</b><ul>{li(m["cons"], "con")}</ul></div></div><p class="note">{e(m["note"])}</p></div>
  <h3 class="sec">{e(d["h_tips"])}</h3><div class="bento tipsg">{tips}</div>
  <div class="cta rv" style="margin-top:50px"><h2>{e(d["cta_title"])}</h2><p class="sub">{e(d["cta_sub"])}</p><a class="pill" href="{wa_link(num, d["cta_msg"])}" target="_blank" rel="noopener">{e(d["cta_quote"])}</a></div>
</section>'''


def render_video(vd, L, num, root=""):
    d, ch = vd[L], vd["channel"]
    tags = "".join(f"<span>{e(t)}</span>" for t in d["tags"])
    vids = [x for x in vd["videos"] if x.get("visible") and x.get("id")]
    cards = "".join(
        f'<div class="vcard rv"><div class="ytbox"><button class="yt" type="button" data-id="{e(x["id"])}" data-title="{e(x["title_" + L])}" aria-label="{e(d["play"])}: {e(x["title_" + L])}" style="background-image:url(https://i.ytimg.com/vi/{e(x["id"])}/hqdefault.jpg)"><span class="play">▶</span></button></div><h3>{e(x["title_" + L])}</h3></div>'
        for x in vids)
    featured = f'<h3 class="sec">{e(d["h_featured"])}</h3><div class="vgrid">{cards}</div>' if cards else ""
    svc = "".join(f'<div class="tile rv"><div><div class="ico">{i}</div><h3>{e(t)}</h3><p>{e(x)}</p></div></div>' for i, t, x in d["services"])
    return f'''<section class="tab" id="video">
  <h2>{e(d["title"])}</h2>
  <p class="sub">{e(d["sub"])}</p>
  <div class="chan rv"><div class="chan-av">🎬</div><div><p class="eyebrow">{e(d["ch_eyebrow"])}</p><h3>{e(ch["name"])} <small>{e(ch["handle"])}</small></h3><p>{e(d["ch_text"])}</p><div class="chips left">{tags}</div>
    <div class="ctas" style="justify-content:flex-start;margin-top:18px"><a class="pill" href="{e(ch["url"])}" target="_blank" rel="noopener">{e(d["btn_channel"])}</a><a class="link" href="{e(ch["url"])}?sub_confirmation=1" target="_blank" rel="noopener">{e(d["btn_sub"])} ›</a></div></div></div>
  <h3 class="sec">{e(d["h_latest"])}</h3>
  <p class="sub" style="text-align:left;margin:0 0 14px;max-width:none">{e(d["latest_sub"])}</p>
  <div class="ytbox big rv"><button class="yt" type="button" data-list="{e(ch["playlist"])}" data-title="{e(ch["name"])}"><span class="play">▶</span><b>{e(d["load"])}</b></button></div>
  <small class="hint" style="margin-top:8px">{e(d["privacy"])}</small>
  {featured}
  <h3 class="sec">{e(d["h_services"])}</h3><div class="bento ideas">{svc}</div>
  <div class="cta rv" style="margin-top:50px"><h2>{e(d["cta_title"])}</h2><p class="sub">{e(d["cta_sub"])}</p><a class="pill" href="{wa_link(num, d["cta_msg"])}" target="_blank" rel="noopener">{e(d["cta_btn"])}</a></div>
</section>'''


def render_games(d, root=""):
    def gimg(c, rt):
        if c.get("image"):
            assert (SILVER / "assets" / "catalog" / c["image"]).exists(), f"Falta {c['image']}"
            return f'<img class="gimg" loading="lazy" decoding="async" src="{rt}assets/catalog/{e(c["image"])}" alt="{e(c["title"])}">' + (f'<span class="gtag">♪ {e(c["music"])}</span>' if c.get("music") else "")
        return f'<span>{c["emoji"]}</span>'

    def head(c):
        if not c.get("section"):
            return ""
        sub = f'<p class="gsub">{e(c["section_sub"])}</p>' if c.get("section_sub") else ""
        return f'<div class="gsec"><h3 class="sec">{e(c["section"])}</h3>{sub}</div>'

    cards = "".join(
        head(c) + f'<div class="gcard rv" style="--g1:{c["g1"]};--g2:{c["g2"]}"><div class="gart">{gimg(c, root)}</div><div class="gbody"><h3>{e(c["title"])}</h3><p>{e(c["desc"])}</p>'
        f'<small class="hint">{e(c["hint"])}</small><div class="gfoot"><button class="pill sm" type="button" data-game="{e(c["id"])}" data-title="{e(c["title"])}" data-hint="{e(c["hint"])}">{e(d["play"])}</button><span class="gbest"></span></div></div></div>'
        for c in d["cards"])
    return f'''<section class="tab" id="juegos">
  <h2>{e(d["title"])}</h2>
  <p class="sub">{e(d["sub"])}</p>
  <div class="ggrid">{cards}</div>
  <p class="sub" style="font-size:.95rem;margin-top:22px">{e(d["note"])}</p>
</section>'''



CATO_UI = {
    "es": dict(CATO_TITLE="Apps creadas", CATO_SUB="Aplicaciones que construí para trabajo y aprendizaje.",
               CATO_LVL_T="Por niveles", CATO_LVL_S="Del 1 al 15, de lo básico a lo experto. Cada nivel tiene 10 preguntas al azar.", CATO_CAT_T="Por tema", CATO_CAT_S="Elige un tema y practica solo ese.",
               CATO_MIX_T="Repaso mixto", CATO_MIX_S="10 preguntas de todos los niveles.", CATO_CURI_T="Curiosidades", CATO_CURI_S="Datos y mitos de la tornillería.", CATO_REF_T="Referencias",
               CATO_REF_S="Consulta códigos, abreviaturas y decodifica referencias.", CATO_RESET="Borrar mi progreso", CATO_BACK="Volver", CATO_NEXT="Siguiente ›", CATO_NEXT_TIP="Otra curiosidad ›", CATO_HOME="Volver a la Academia Tornillos", CATO_URL="https://jsebasurb.github.io/Academy-tornillos/", CATO_OPEN="Abrir Academia Tornillos en su propio sitio"),
    "en": dict(CATO_TITLE="Apps I built", CATO_SUB="Applications I built for work and learning.",
               CATO_LVL_T="By level", CATO_LVL_S="From 1 to 15, from basics to expert. Each level gives 10 random questions.", CATO_CAT_T="By topic", CATO_CAT_S="Pick a topic and practice only that.",
               CATO_MIX_T="Mixed review", CATO_MIX_S="10 questions from all levels.", CATO_CURI_T="Curiosities", CATO_CURI_S="Facts and myths about fasteners.", CATO_REF_T="References",
               CATO_REF_S="Look up codes and abbreviations, and decode references.", CATO_RESET="Reset my progress", CATO_BACK="Back", CATO_NEXT="Next ›", CATO_NEXT_TIP="Another curiosity ›", CATO_HOME="Back to Tornillos Academy", CATO_URL="https://jsebasurb.github.io/Academy-tornillos/", CATO_OPEN="Open Tornillos Academy on its own site"),
}


def render_cato(L, root=""):
    html = (SILVER / "apps" / "cato" / "app.html").read_text(encoding="utf-8")
    for k, v in CATO_UI[L].items():
        html = html.replace("{{" + k + "}}", e(v))
    return html


def render_blog(posts, u):
    arts = []
    for x in posts:
        body = "".join(f"<p>{e(t)}</p>" for t in x["body"])
        arts.append(f'<article class="post rv"><details><summary><div class="meta">{e(x["date"])} · {e(" · ".join(x["tags"]))}</div><h3>{e(x["title"])}</h3><p class="psum">{e(x["summary"])}</p></summary><div class="pbody2">{body}</div></details></article>')
    return f'<section class="tab" id="blog">\n  <h2>{e(u["b_title"])}</h2>\n  <p class="sub">{e(u["b_sub"])}</p>\n  <div class="posts">{"".join(arts)}</div>\n</section>'


def render_faq(faq, u):
    qa = "".join(f'<details class="qa"><summary>{e(x["q"])}</summary><p>{e(x["a"])}</p></details>' for x in faq)
    return f'<h3 class="sec">{e(u["faq"])}</h3><div class="faq">{qa}</div>'


def json_ld(p, cfg, u, url, L):
    data = {"@context": "https://schema.org", "@type": "Person", "name": p["name"], "jobTitle": u["job"], "url": url, "inLanguage": L,
            "email": "mailto:" + p["email"], "address": {"@type": "PostalAddress", "addressLocality": "Cali", "addressCountry": "CO"},
            "sameAs": [p["linkedin"], p["github"], p["youtube"]], "knowsAbout": ["ETL", "Python", "SQL", "AWS", "Machine Learning", "n8n", "Industrial automation"]}
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


# ---------------------------------------------------------------- build
def main():
    cfg = jl("site.json")
    num = cfg["whatsapp_number"]
    if not num.isdigit():
        sys.exit("ERROR: whatsapp_number debe contener solo dígitos")
    site = cfg["site_url"]
    en_dict = json.loads((DATA / "i18n" / "en.json").read_text(encoding="utf-8"))
    pj, cat, faq, blog, p3d = jl("projects.json"), jl("catalog.json"), jl("faq.json"), jl("blog.json"), jl("print3d.json")
    vid, gms = jl("video.json"), jl("games.json")
    quote_json = json.dumps(jl("quote.json"), ensure_ascii=False).replace("</", "<\\/")
    pm_full = jl("pm_model.json")
    pm_full.pop("parity", None)
    pm_json = json.dumps(pm_full, ensure_ascii=False).replace("</", "<\\/")
    vm_full = jl("vision_model.json")
    vm_full.pop("parity", None)
    vm_json = json.dumps(vm_full, ensure_ascii=False).replace("</", "<\\/")
    fi_json = json.dumps(jl("fichas.json")["fichas"], ensure_ascii=False).replace("</", "<\\/")
    template = (SILVER / "src" / "index.template.html").read_text(encoding="utf-8")
    build_id = str(int(time.time()))

    if GOLD.exists():
        for f in GOLD.iterdir():
            shutil.rmtree(f) if f.is_dir() else f.unlink()
    for d in ("css", "js", "img", "docs", "projects", "catalog", "audio", "apps"):
        (GOLD / "assets" / d).mkdir(parents=True)
    (GOLD / "en").mkdir()
    (GOLD / ".nojekyll").touch()

    # --- recursos compartidos
    shutil.copy(SILVER / "src" / "styles.css", GOLD / "assets/css/styles.css")
    for js in sorted((SILVER / "src").glob("*.js")):
        if js.name != "sw.js":
            shutil.copy(js, GOLD / "assets/js" / js.name)
    assets = SILVER / "assets"
    for f in assets.iterdir():
        if f.is_file() and f.name != ".gitkeep":
            shutil.copy(f, GOLD / "assets/img" / f.name)
    for sub in ("projects", "catalog", "docs", "audio"):
        if (assets / sub).exists():
            for f in (assets / sub).iterdir():
                if f.is_file() and f.name != ".gitkeep":
                    shutil.copy(f, GOLD / "assets" / sub / f.name)

    # --- datos de la academia CATO (apps creadas)
    (GOLD / "assets/apps/cato").mkdir(parents=True, exist_ok=True)
    shutil.copy(SILVER / "apps" / "cato" / "bank.json", GOLD / "assets/apps/cato/bank.json")

    # --- una página por idioma
    for L in LANGS:
        u = UI[L]
        root = u["root"]
        prof = jl("profile.json" if L == "es" else "profile.en.json")
        kb = jl("chatbot.json" if L == "es" else "chatbot.en.json")
        for i, q in enumerate(faq[L]):
            kb["entries"].append({"id": f"faq-{i}", "k": q["k"], "a": q["a"], "b": [{"l": u["faq_btn"], "go": "contacto"}]})
        site_i = cfg["i18n"][L]
        page_url = site if L == "es" else site + "en/"
        tr = en_dict["js"] if L == "en" else {}

        html = translate(template, en_dict["template"]) if L == "en" else template
        rep = {
            "{{PROFILE_SECTION}}": render_profile(prof, num, u, root),
            "{{PROJECTS_SECTION}}": render_projects(pj, L, u, root),
            "{{CATALOG_SECTION}}": render_catalog(cat, L, u, root, num),
            "{{BLOG_SECTION}}": render_blog(blog[L], u),
            "{{GAMES_SECTION}}": render_games(gms[L], root),
            "{{CATO_SECTION}}": render_cato(L, root),
            "{{VIDEO_SECTION}}": render_video(vid, L, num, root),
            "{{PRINT3D_SECTION}}": render_print3d(p3d[L], num, root),
            "{{FAQ_SECTION}}": render_faq(faq[L], u),
            "{{SITE_TITLE}}": e(site_i["site_title"]), "{{SITE_DESC}}": e(site_i["site_description"], quote=True),
            "{{JSON_LD}}": json_ld(prof, cfg, u, page_url, L),
            "{{CONTACT_EMAIL}}": e(prof["email"]), "{{SITE_URL}}": site, "{{CANONICAL}}": page_url,
            "{{ROOT}}": root, "{{LANG}}": L, "{{OG_LOCALE}}": u["locale"],
            "{{ALT_URL}}": u["alt_url"], "{{ALT_CODE}}": u["alt_code"], "{{ALT_LABEL}}": u["alt_label"], "{{ALT_ARIA}}": e(u["alt_aria"], quote=True),
            "{{FAB_MSG}}": quote(u["fab"]), "{{WA_NUMBER}}": num, "{{QUOTE_JSON}}": quote_json, "{{PM_JSON}}": pm_json, "{{VM_JSON}}": vm_json, "{{FI_JSON}}": fi_json, "{{YEAR}}": str(datetime.date.today().year),
        }
        for k, v in rep.items():
            html = html.replace(k, v)
        out = GOLD / "index.html" if L == "es" else GOLD / "en" / "index.html"
        out.write_text(html, encoding="utf-8")

        akazu = ""
        for ext in ("png", "webp", "jpg", "jpeg"):
            if (SILVER / "assets" / f"akazu.{ext}").exists():
                akazu = f"assets/img/akazu.{ext}"
                break
        cfg_js = {"form": cfg.get("form_endpoint", ""), "chat": cfg.get("chat_endpoint", ""), "wa": num, "email": prof["email"], "root": root, "akazu": akazu}
        i18n_js = (f'window.LANG={json.dumps(L)};window.CFG={json.dumps(cfg_js, ensure_ascii=False)};'
                   f'window.KB={json.dumps(kb, ensure_ascii=False).replace("</", "<\\/")};window.TR={json.dumps(tr, ensure_ascii=False)};'
                   'window.T=function(s){return window.TR[s]||s};\n')
        (GOLD / "assets/js" / f"i18n.{L}.js").write_text(i18n_js, encoding="utf-8")

    # --- PWA
    shutil.copy(SILVER / "src" / "sw.js", GOLD / "sw.js")
    pre = ["./", "index.html", "en/index.html"] + sorted(str(p.relative_to(GOLD)) for p in (GOLD / "assets").rglob("*") if p.is_file() and p.suffix not in (".pdf", ".mp3"))
    sw = (GOLD / "sw.js").read_text(encoding="utf-8").replace("{{BUILD_ID}}", build_id).replace("{{PRECACHE}}", json.dumps(pre))
    (GOLD / "sw.js").write_text(sw, encoding="utf-8")
    (GOLD / "manifest.webmanifest").write_text(json.dumps({
        "name": "Juan Sebastián Sánchez · Portafolio", "short_name": "Sebas", "description": cfg["i18n"]["es"]["site_description"],
        "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#000000", "theme_color": "#0071e3", "lang": "es",
        "icons": [{"src": "assets/img/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
                  {"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]}, ensure_ascii=False, indent=2), encoding="utf-8")

    # --- SEO
    today = datetime.date.today().isoformat()
    (GOLD / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {site}sitemap.xml\n", encoding="utf-8")
    alt = (f'<xhtml:link rel="alternate" hreflang="es" href="{site}"/><xhtml:link rel="alternate" hreflang="en" href="{site}en/"/>')
    (GOLD / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        f"  <url><loc>{site}</loc><lastmod>{today}</lastmod><priority>1.0</priority>{alt}</url>\n"
        f"  <url><loc>{site}en/</loc><lastmod>{today}</lastmod><priority>0.9</priority>{alt}</url>\n</urlset>\n", encoding="utf-8")
    (GOLD / "404.html").write_text(
        '<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>404</title><meta http-equiv="refresh" content="5;url={site}">'
        '<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center">'
        f'<div><h1>404</h1><p>Esta página no existe · This page does not exist.</p><a href="{site}">Inicio / Home</a></div></body></html>', encoding="utf-8")

    # --- validación
    for f in [GOLD / "index.html", GOLD / "en" / "index.html", *(GOLD / "assets/js").glob("*.js"), GOLD / "sw.js"]:
        assert "{{" not in f.read_text(encoding="utf-8"), f"Placeholders sin reemplazar en {f.name}"
    need = ["assets/css/styles.css", "assets/img/favicon.svg", "assets/img/og-image.png", "assets/img/icon-192.png", "assets/img/icon-512.png", "assets/audio/final_boss_pursuit.mp3",
            "sitemap.xml", "robots.txt", "404.html", "sw.js", "manifest.webmanifest", "en/index.html",
            jl("profile.json")["cv_file"], jl("profile.en.json")["cv_file"]]
    need += [f"assets/js/{n}.js" for n in ("app", "tools", "projects", "contact", "chat", "catalog", "stl", "video", "games", "cato", "i18n.es", "i18n.en")]
    for ref in need:
        assert (GOLD / ref).exists(), f"Falta {ref}"
    print(f"OK -> gold/ listo (ES {(GOLD / 'index.html').stat().st_size // 1024} KB · EN {(GOLD / 'en/index.html').stat().st_size // 1024} KB). WhatsApp: {num}")


if __name__ == "__main__":
    main()
