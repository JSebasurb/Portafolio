# Herramientas del portafolio

Cada herramienta es un archivo HTML independiente en `silver/assets/tools/`. El sitio las muestra dentro de la sección **Herramientas** con un `iframe`, y se pueden usar sin el sitio abriendo el archivo directamente.

| Herramienta | Archivo | Datos | Pruebas |
|---|---|---|---|
| 📄 Gestión de CV | `src/cvmanager.js` (módulo del sitio) | localStorage `cvmgr.v1`; PDF en IndexedDB `cvmgr` | smoke_test |
| 🙂 Rostro local | `rostro-local.html` | ninguno | smoke_test |
| 🌳 Árbol de decisiones | `arbol-decisiones.html` | ninguno (exporta JSON) | smoke_test |
| 🔳 Código QR | `qr-codigo.html` | ninguno | test_tools (lectura con OpenCV) |
| 🏦 Préstamos e interés | `calculadora-prestamos.html` | ninguno | test_tools (fórmula) |
| 🗂️ Tablero de tareas | `tablero-tareas.html` | localStorage `tablero-tareas.v1` | test_tools |
| 🔐 Contraseñas | `generador-contrasenas.html` | ninguno | test_tools |
| 🎡 Ruleta | `ruleta.html` | localStorage `ruleta.v1` | test_tools |

## Bases de CV precargadas

La gestión de CV trae tres bases en su primera apertura (solo si está vacía, y una sola vez):

| Área | Base | Enfoque |
|---|---|---|
| Ingeniería y automatización | `cv-base-automatizacion.pdf` | PLC, CNC, robótica e IoT |
| Ventas y marketing digital | `cv-base-marketing-ventas.pdf` | Ventas consultivas, canal web con chatbot, servicios |
| Datos e IA | `cv-base-datos-ia.pdf` | Machine Learning, ETL, AWS, dashboards |

Se generan con `python scripts/build_cv_bases.py`, con el mismo diseño que el CV principal y solo datos de `silver/data/profile.json`. La lista de bases está en `silver/assets/docs/cv-bases.json`. Para cambiar un enfoque, edita `BASES` en ese script.

Nota: la base de marketing no tiene experiencia de marketing en el perfil; enfatiza ventas y el canal web. Si agregas experiencia real, actualiza el perfil y regenera las bases.

## Idioma

- En el sitio en inglés, el `iframe` se abre con `?lang=en`.
- Cada herramienta incluye un bloque `<script data-i18n>` con un diccionario de textos. Solo se activa con `?lang=en`; sin ese parámetro queda en español.
- Para cambiar un texto traducido, edita el diccionario `D` (coincidencia exacta) o `RX` (expresiones regulares) dentro de ese bloque.

## Vínculo entre herramientas

- Cada postulación de la gestión de CV se refleja como tarea en el tablero (`app-<id>`): su columna sigue el estado (en curso, o listo si fue oferta o rechazo), y se elimina al borrar la postulación.
- La sincronización va en una sola dirección (postulaciones → tablero). Si mueves la tarea en el tablero, el estado de la postulación no cambia.

## Agregar una herramienta nueva

1. Crea el archivo HTML en `silver/assets/tools/`, autocontenido (sin recursos externos).
2. En `silver/src/index.template.html`, agrega un botón `<button data-v="tNN">` en el selector y un `<div class="tool" id="tNN">` con un `iframe` que tenga `title` y `src="{{ROOT}}assets/tools/archivo.html"`.
3. Si quieres traducción, agrega el bloque `data-i18n` (copia el de una herramienta existente) y las entradas de la herramienta en `silver/data/i18n/en.json`.
4. Agrega una verificación en `embedded_tools_check` de `scripts/smoke_test.py` y, si tiene lógica, una prueba en `scripts/test_tools.py`.
5. Ejecuta `python scripts/build.py` y las pruebas.
