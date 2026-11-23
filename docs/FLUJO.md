# Flujo de trabajo del portafolio

Guía corta para editar, revisar y publicar el sitio sin perder nada.

## Estructura

- `silver/` es la fuente que se edita: plantillas (`src/`), datos (`data/`), recursos (`assets/`).
- `gold/` es lo generado. **Nunca se edita a mano**: se regenera con el build.
- `scripts/` contiene el build, las revisiones y las pruebas.
- `n8n/` tiene el flujo del formulario de contacto.

## Dónde se edita cada cosa

| Qué cambiar | Archivo |
|---|---|
| Perfil, experiencia, competencias, formación | `silver/data/profile.json` (ES) y `profile.en.json` (EN) |
| Tarjetas de proyectos | `silver/data/projects.json` |
| Juegos | `silver/data/games.json` |
| Textos del chatbot | `silver/data/chatbot.json` y `chatbot.en.json` |
| Preguntas frecuentes | `silver/data/faq.json` |
| Título, descripción, analítica, agenda, formulario | `silver/data/site.json` |
| Registro de cambios (aviso de nueva versión) | `silver/data/changelog.json` |
| Estructura y textos de la página | `silver/src/index.template.html` |
| Estilos | `silver/src/styles.css` |
| Herramientas (CV, roscas, cotizador, etc.) | `silver/src/*.js` |

## Agregar una experiencia

Añade una entrada a `experience` en ambos archivos de perfil (`profile.json` y `profile.en.json`) con los campos `period`, `role`, `company`, `text` y `achievement`. Empieza el logro con "Logro:" (o "Achievement:" en inglés).

## Agregar un proyecto

Añade una entrada a `projects` en `projects.json` con `title`, `category`, `year`, `description`, `tags` y el bloque `en`. Para que aparezca en el CV, agrega `"cv": true` en el perfil.

## Cambiar datos del CV

Edita el perfil y regenera los PDF:

    python scripts/build_cv.py

El CV tiene que caber en una hoja. Si se pasa, acorta un logro o un proyecto destacado (no quites datos sin avisar).

## Tarjeta de presentación impresa

Los textos están en `scripts/print_card.py`. Regenera el PDF con:

    python scripts/print_card.py

## Revisar antes de publicar

    python scripts/build.py          # genera gold/
    python scripts/check_site.py     # ids, accesibilidad, idioma
    python scripts/check_links.py --offline
    python scripts/smoke_test.py     # prueba de humo en navegador
    python scripts/visual_check.py   # cambios visuales inesperados
    python scripts/test_tools.py     # pruebas funcionales de las herramientas (préstamos, ruleta, contraseñas, tablero, QR)

Si la prueba visual marca cambios que sí querías, actualiza las líneas base:

    python scripts/visual_check.py --update

Requiere `pip install playwright pillow` y `python -m playwright install chromium`.

## Publicar

El zip no incluye `gold/`: GitHub Actions lo reconstruye desde `silver/` en cada envío a `main`.

Sube el contenido del proyecto a `main` del repositorio `JSebasurb/Portafolio`. GitHub Actions (`.github/workflows/pages.yml`) reconstruye y publica el sitio en https://jsebasurb.github.io/Portafolio/.

Después de publicar, recarga la página. Si ves una versión antigua, usa Ctrl+Shift+R (Cmd+Shift+R en Mac) una vez.

## Activar servicios externos

En `silver/data/site.json`:

- `goatcounter`: solo el código de tu cuenta (analítica sin cookies).
- `calendly_url`: enlace https de tu agenda.
- `form_endpoint`: URL de producción del webhook de n8n (empieza por https://).

Si un valor está vacío, el servicio simplemente no se activa.
