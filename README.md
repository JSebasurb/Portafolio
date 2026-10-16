# Taller 3D & Automatización — Portafolio y servicios

Sitio web de portafolio para ofrecer: personalización (llaveros y estuches estampados), impresión 3D, automatización con n8n, contenido con IA e ingeniería industrial (PLC).

## 🏅 Arquitectura medallón

| Capa | Carpeta | Qué contiene | ¿Se publica? |
|---|---|---|---|
| 🥉 Bronze | `bronze/` | Originales y material crudo | No |
| 🥈 Silver | `silver/` | Código fuente limpio + configuración | No |
| 🥇 Gold | `gold/` | Sitio final generado | **Sí** |

Flujo: `bronze → silver → (build.py) → gold → GitHub Pages`

## 🧰 Lenguajes y tecnologías

| Lenguaje | Dónde se usa |
|---|---|
| HTML | Estructura del sitio (`silver/src/index.template.html`) |
| CSS | Estilos, animaciones y modo claro/oscuro (`styles.css`) |
| JavaScript | Interactividad y herramientas (`app.js`, `tools.js`) |
| Python | Build silver→gold y optimización de imágenes (`scripts/*.py`) |
| Bash | Servidor de desarrollo (`scripts/dev.sh`) |
| Make | Atajos: `make build`, `make serve`, `make images` (`Makefile`) |
| YAML | Despliegue automático (`.github/workflows/pages.yml`) |
| JSON | Configuración del sitio (`silver/data/site.json`) |
| SVG | Favicon/logo (`silver/assets/favicon.svg`) |
| Markdown | Documentación (`README.md`) |

## 🔧 Sección "Herramientas"

Pestaña con utilidades propias que corren 100 % en el navegador:
- **Lector HTML**: pega o arrastra un `.html`, vista previa segura (iframe en sandbox), vista de código con colores y números de línea, modo escritorio/móvil, copiar, descargar y abrir en pestaña.
- **Link WhatsApp**: genera enlaces `wa.me` con mensaje.
- **Formateador JSON**: formatea, minifica y valida.

Para agregar otra herramienta: añade su bloque HTML en la sección `#tools` del template y su lógica en `silver/src/tools.js`.

## 🚀 Publicar con GitHub Pages

1. Edita tu número en `silver/data/site.json`.
2. Sube el repositorio a GitHub (rama `main`).
3. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
4. Cada `push` a `main` construye y publica. Tu sitio queda en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

## 🛠️ Desarrollo local

```bash
python scripts/build.py
python -m http.server -d gold 8000   # abre http://localhost:8000
```

## ✏️ Qué editar

- Textos y secciones → `silver/src/index.template.html`
- Colores y estilos → `silver/src/styles.css`
- Comportamiento → `silver/src/app.js`
- WhatsApp, título, descripción → `silver/data/site.json`
- Fotos de tus trabajos → originales en `bronze/assets-originales/`, optimizadas en `silver/assets/`

## 🗺️ Siguientes pasos sugeridos

- Agregar fotos reales de llaveros/estuches y de proyectos (portafolio).
- Dominio propio (Settings → Pages → Custom domain).
- Sección de proyectos de PLC y automatización con capturas.
