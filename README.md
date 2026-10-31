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
| Python | Build silver→gold, generación del CV en PDF y optimización de imágenes (`scripts/*.py`) |
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

## ✨ Funciones del sitio

- **Perfil / CV** generado desde `silver/data/profile.json` (una sola fuente para la web y el PDF).
- **Pestaña Proyectos**: tarjetas con miniatura, enlace, etiquetas y filtro por categoría (`silver/data/projects.json`).
- **Enlaces por pestaña**: `/#perfil`, `/#proyectos`, `/#tienda`, `/#auto`, `/#ia`, `/#ing`, `/#tools`.
- **Vista previa al compartir** (Open Graph + imagen 1200×630) para WhatsApp y LinkedIn.
- **SEO**: `sitemap.xml`, `robots.txt`, `404.html` y datos estructurados (JSON-LD).
- **Modo claro/oscuro** manual, botón flotante de WhatsApp, enlace "saltar al contenido" y navegación por teclado.
- **Herramientas**: lector HTML, generador de enlaces WhatsApp y formateador JSON.

## 📬 Formulario de contacto y 🤖 chatbot

**Formulario** (pestaña Contacto): nombre, correo, teléfono, mensaje y casilla de autorización de datos (obligatoria).
- Sin configurar nada, al enviar abre WhatsApp con los datos ya escritos.
- Para guardar los datos, crea un **webhook en n8n** y pega su URL en `silver/data/site.json` → `"form_endpoint"`.
  - Nodo *Webhook* (método POST, Respond: Immediately). En Options → *Allowed Origins (CORS)* pon `https://jsebasurb.github.io`.
  - Campos que llegan en el body: `nombre`, `correo`, `telefono`, `mensaje`, `consentimiento`, `fecha`, `origen`.
  - Siguiente nodo: *Google Sheets → Append row* (y luego tu flujo de IA con Gmail/WhatsApp).
- También sirve un Google Apps Script o Formspree: pega su URL en `form_endpoint`.

**Chatbot** (botón 🤖 abajo a la derecha):
- Por defecto responde con reglas locales editables en `silver/data/chatbot.json` (servicios, precios, proyectos, contacto).
- Para respuestas con IA, crea otro webhook en n8n y pega la URL en `"chat_endpoint"`.
  - Recibe (form-urlencoded): `message`, `session`, `history` (JSON con los últimos mensajes).
  - Flujo: *Webhook (Respond: Using 'Respond to Webhook' node)* → *AI Agent* con tu prompt → *Respond to Webhook* que devuelve JSON `{"reply": "texto"}`.
  - Si el webhook falla o tarda más de 25 s, el chatbot vuelve a las respuestas locales.
- Nunca pegues claves de API en el código del sitio: la clave de la IA vive solo dentro de n8n.

**Datos personales:** revisa el texto del aviso de privacidad (en el template, sección `#contacto`) y envía mensajes de WhatsApp solo a quienes aceptaron.

## 🧭 Barra de pestañas (escritorio)

Con tantas pestañas, la barra se desplaza de forma natural: flechas ‹ › en los bordes, rueda del mouse (el giro vertical la mueve), arrastre con el mouse, desvanecido en los bordes, flechas/Inicio/Fin del teclado y centrado automático de la pestaña elegida. En el celular se desliza con el dedo. Código al final de `silver/src/app.js` y estilos en `styles.css`.

## 🎮 Pestaña Juegos

Veinte juegos hechos con JavaScript y canvas (sin librerías), pensados para el celular y también jugables con teclado. Código en `silver/src/games.js`; textos de las tarjetas en `silver/data/games.json` (ES y EN).

- **Bolt Runner:** corredor que salta tornillos y engranajes y se agacha ante drones. Toca para saltar (mantén para más altura) y toca el piso para agacharte. Sube de nivel cada 300 puntos.
- **Capas 3D:** apila capas como una impresora 3D; lo que sobresale se corta y los aciertos perfectos recuperan ancho.
- **Órbita:** un toque cambia de órbita para esquivar obstáculos y recoger energía.
- **Serpiente de datos:** desliza para girar; los bordes dan la vuelta y los paquetes dorados valen triple.
- **Rodamiento (usa sensores):** inclinas el celular y el acelerómetro (evento `deviceorientation`) mueve un balín por un laberinto nuevo en cada nivel. Evita agujeros, recoge tornillos y llega a la meta antes de que acabe el tiempo. En iPhone pide permiso de movimiento (requiere HTTPS, que GitHub Pages ya da). Se calibra con la posición inicial y tiene botón ↺. Sin sensores (computador) se juega con flechas o arrastrando. Vibra al chocar o caer.
- **Duelo con el Gran Jefe:** pelea de jefe estilo dibujo animado de los años 30 ("rubber hose"): personajes con extremidades de manguera, ojos de pastel y guantes blancos, fondo de acuarela pintado en canvas, grano de película, rayones, viñeta y música de swing generada con WebAudio. El héroe dispara solo y el jugador se mueve y esquiva; el jefe (Sir Torque, un tornillo gigante) tiene tres fases con tuercas, arandelas y un martillazo con aviso. Se adapta a pantalla vertical (celular) y horizontal (escritorio). Todo está dibujado por código, sin imágenes externas.
- **Cubehead:** corredor 3D de tres carriles (proyección en perspectiva dibujada en canvas) con la música «Final Boss Pursuit», guardada en `silver/assets/audio/final_boss_pursuit.mp3` (extraída del video, 96 kbps, ~2 MB). Los visuales —el vórtice del jefe en el horizonte, la cuadrícula y los postes— laten con los graves usando el analizador de audio del navegador. Para cambiar la canción reemplaza ese archivo (mismo nombre) o edita `TRACK` en `games.js`. El audio no se precarga en la app instalable para no gastar datos. **Revisa que tengas los derechos de uso de la música antes de publicarla.**
- **Akazu Dance:** juego de ritmo con música generada en el navegador y el avatar de Akazu bailando. Tres carriles, combos, energía y meta de 500 seguidores. **Para usar la imagen real de Akazu:** guarda un PNG (fondo transparente) como `silver/assets/akazu.png` y vuelve a publicar; si no existe, se dibuja un avatar propio.
- **Control de Tornillos:** inspector de calidad en una fábrica de tornillos. El jefe da una orden (tipo de cabeza y largo) y hay que aprobar solo los tornillos perfectos que la cumplen; aparecen tornillos doblados, rajados o sin rosca. 3 vidas, la orden cambia cada 8 tornillos y la banda acelera.
- **Agilidad mental (tipo entrevista):** `calc` (cálculo relámpago), `stroop` (tinta vs. palabra, con cambio de regla), `series` (series lógicas), `memory` (bloques de Corsi) y `nback` (memoria de trabajo). Son rondas cronometradas con aciertos, errores y racha.
- **Planificación y razonamiento:** `hanoi` (Torre de Hanoi: la torre crece al resolverla y se mide la eficiencia frente al mínimo de 2ⁿ−1 movimientos), `slide` (puzzle deslizante 3×3 con solución óptima calculada con IDA*), `trail` (sendero 1‑A‑2‑B), `gonogo` (control de impulsos) y `rotation` (rotación mental con piezas quirales: el espejo no es la misma figura).
- **Reto de entrevista:** hay dos modos, rápido (6 pruebas, ~5 min) y completo (10 pruebas, ~9 min). Termina con un informe de 5 páginas (Resumen con gráfica radar · Detalle · Análisis · Plan · Exportar): índice de 0 a 100, 6 competencias (numérico, lógica, atención, memoria, planificación, visuoespacial), tipo de perfil, fortalezas, puntos a mejorar, consejos concretos y progreso frente al intento anterior. Desde *Exportar* se puede copiar el texto, descargar una imagen PNG con la gráfica, descargar un .txt o compartir (si el navegador lo permite). Guarda los últimos intentos en el navegador (`localStorage`). Los umbrales son heurísticos y no constituyen una prueba psicométrica validada.
- Los récords se guardan en el navegador (`localStorage`). Para probar con bots automáticos agrega `?gmdebug` a la URL.
- Para agregar otro juego: crea una función en `games.js` (`GAMES.miJuego = function (E) {...}` con `reset`, `update`, `draw` y los controles) y una tarjeta en `games.json`.

## 🎬 Pestaña Audiovisual

- Tarjeta del canal de YouTube **Akazu IA**, botón para suscribirse y los **últimos videos** (lista de subidas del canal, se actualiza sola). El video solo se carga al pulsar, en modo de privacidad mejorada.
- **Videos destacados:** en `silver/data/video.json`, agrega bloques en `videos` con el ID del video (lo que va después de `v=`), `title_es`, `title_en` y `visible: true`.
- Datos de contacto (correo, LinkedIn, YouTube): `silver/data/profile.json` y `profile.en.json`. Luego `python scripts/build_cv.py` regenera los CV en PDF.

## 🧊 Pestaña Impresión 3D

- Contenido en `silver/data/print3d.json` (ES y EN): ficha de la Dremel DigiLab 3D20, qué se puede imprimir, proceso, material (PLA) y consejos de diseño.
- **Visor 3D** (`silver/src/stl.js`): abre un STL (binario o ASCII), lo gira en 3D, muestra medidas y volumen, indica si cabe en 230 × 150 × 140 mm y estima el PLA según el relleno. Funciona en el navegador; el archivo no se sube a ningún servidor.
- **Piezas especiales** (brillan en la oscuridad, tricolor, ajedrez, esqueletos articulados): se editan en `print3d.json` → `special`. Para agregar foto a una tarjeta, guarda la imagen en `silver/assets/catalog/` y escribe su nombre al final del bloque.
- La estimación de material es aproximada (densidad del PLA 1,24 g/cm³, 25 % de cascarón + relleno). Ajusta los números en `stl.js` si lo calibras con tus impresiones reales.
- Si cambias de impresora, edita las especificaciones en `print3d.json` y el volumen `BED` en `stl.js`.

## 🛍️ Tienda: catálogo con fotos reales

- `silver/data/catalog.json` define los productos del catálogo (nombre, descripción, foto, categoría y su traducción al inglés). Cada tarjeta tiene botón "Pedir este diseño" que abre WhatsApp con el nombre del diseño, y la foto se amplía al tocarla.
- Fotos nuevas: guárdalas en `silver/assets/catalog/` (WebP, 450×600 para llaveros) y copia un bloque en `catalog.json`.
- El diseñador permite subir tu propia imagen (se procesa en el navegador, no se sube a ningún servidor), elegir cantidad e indicar el modelo del celular.
- **Derechos de autor:** no publiques diseños con personajes de marcas registradas (anime, videojuegos, películas) sin licencia. Puede causar reportes y retiro de tus publicaciones. Usa diseños propios, fotos de clientes, mascotas, logos de negocios (con permiso) e ilustraciones originales.
- **Repositorio público:** todo lo que esté en `bronze/` y `silver/` también se ve en GitHub. No subas ahí fotos o datos que no quieras mostrar.

## 🌎 Idiomas, FAQ, blog y app instalable

- Español en `/` e inglés en `/en/` (botón EN/ES arriba). Los textos del inglés están en `silver/data/*.en.json`, `faq.json`, `blog.json` y `silver/data/i18n/en.json`.
- Preguntas frecuentes (al final de Contacto) que el chatbot también usa: `silver/data/faq.json`.
- Blog en `silver/data/blog.json`. Los dos artículos son borradores: revísalos y ajústalos a tu experiencia.
- Casos de estudio: agrega `"case": {"problem","solution","result"}` a un proyecto en `projects.json` y en su bloque `"en"`.
- Chatbot con flujo de cotización: pregunta qué necesita el cliente, para cuándo, su nombre y contacto, y lo envía a WhatsApp o prellena el formulario (donde debe aceptar la autorización de datos).
- App instalable (PWA): `manifest.webmanifest` y `sw.js`. En el celular aparece "Agregar a pantalla de inicio".
- Revisión de enlaces: `scripts/check_links.py` corre en cada despliegue. Un enlace interno roto detiene la publicación; los externos solo avisan.
- CV en PDF (ES y EN): `python scripts/build_cv.py`.

## 🗂️ Agregar un proyecto (miniatura + enlace)

1. Guarda la imagen original en `bronze/assets-originales/proyectos/` (ej. `mi-proyecto.png`).
2. Ejecuta `python scripts/optimize_images.py`: crea la miniatura 800×500 en `silver/assets/projects/mi-proyecto.webp`.
3. En `silver/data/projects.json` agrega o edita el proyecto:
   `"thumbnail": "mi-proyecto.webp"` y `"link": "https://..."` (repo, demo o video).
4. Sube los cambios a GitHub: el sitio se actualiza solo.

Ya hay espacios listos (proyectos 8 a 11) con `"visible": false`: cámbialo a `true` cuando los llenes. Sin miniatura se muestra un ícono con color; sin enlace, la tarjeta no lleva botón. El filtro por categoría se arma solo con los valores de `category`.

## 📄 Actualizar tu CV

1. Edita `silver/data/profile.json`.
2. `pip install reportlab` y luego `python scripts/build_cv.py` (regenera el PDF).
3. Sube los cambios: el sitio se republica solo.

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
