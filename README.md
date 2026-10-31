# Portafolio Web & Plataforma de Servicios (Taller 3D & Automatización)

Sitio web modular y optimizado para la presentación de portafolio profesional, catálogo de productos personalizados, herramientas dinámicas en cliente y servicios de ingeniería (Automatización industrial, Impresión 3D e Integraciones con IA).

---

## 🏛️ Arquitectura de Datos (Patrón Medallón)

El proyecto utiliza un pipeline de construcción basado en el patrón Medallón para garantizar la separación de activos crudos, código fuente y código de producción.


| Capa | Directorio | Descripción | Estado de Publicación |
|---|---|---|---|
| 🥉 **Bronze** | `bronze/` | Activos originales, recursos sin optimizar y material gráfico base. | Privado / No desplegado |
| 🥈 **Silver** | `silver/` | Código fuente, plantillas HTML, scripts de lógica y archivos JSON de datos. | Privado / No desplegado |
| 🥇 **Gold** | `gold/` | Artefacto final compilado (sitio estático listo para servidor). | **Público (GitHub Pages)** |

---

## 🧰 Stack Tecnológico

| Tecnología | Rol en el Proyecto |
|---|---|
| **HTML5 / CSS3** | Arquitectura semántica, diseño responsive, temas dinámicos (modo claro/oscuro) e interfaz adaptativa. |
| **JavaScript (ES6+)** | Lógica de interacción en cliente, herramientas en navegador, visor STL 3D y suite de minijuegos en Canvas. |
| **Python 3** | Motor de construcción (`build.py`), motor de generación de CV en PDF (`build_cv.py`) y pipeline de optimización WebP. |
| **Make / Bash** | Automatización de tareas de desarrollo local, servidor de pruebas y optimización de activos. |
| **n8n / Webhooks** | Integración de backend serverless para procesamiento de formularios de contacto y motor contextual de chatbot IA. |
| **GitHub Actions** | Pipeline CI/CD para compilación y despliegue automático en GitHub Pages. |

---

## 🛠️ Herramientas Integradas (Client-Side)

El sitio cuenta con un paquete de utilidades ejecutadas 100 % en el navegador mediante `silver/src/tools.js`:

* **Visor / Lector HTML**: Vista previa aislada en `iframe` (sandbox), inspección de código con numeración de líneas, selector de formato (escritorio/móvil) y utilidades de descarga.
* **Generador de Enlaces WhatsApp**: Construcción de URLs `wa.me` parametrizadas con texto predeterminado.
* **Formateador JSON**: Parser en cliente para validación, minificación y formateo estructural de JSON.

---

## 🤖 Integraciones de Backend (n8n & Webhooks)

El proyecto opera como un frontend estático desacoplado de microservicios mediante endpoints dinámicos configurados en `silver/data/site.json`:

### 1. Formulario de Contacto (`form_endpoint`)
* **Fall-back por defecto**: Redirección estructurada a WhatsApp Web.
* **Integración API**: Envío de carga útil (JSON POST) a webhook de n8n conteniendo: `nombre`, `correo`, `telefono`, `mensaje`, `consentimiento`, `fecha` y `origen`.

### 2. Chatbot Contextual (`chat_endpoint`)
* **Procesamiento híbrido**: Sistema de respuestas locales basadas en `silver/data/chatbot.json` con conmutación a agente IA externo vía webhook n8n (soporta sesión e historial de conversación).
* **Resiliencia**: Timeout automático a los 25 segundos para revertir a motor de reglas local en caso de falla de red.

---

## 🧊 Visor 3D & Estimación de Materiales

Módulo desarrollado en JS puro (`silver/src/stl.js`) para la visualización y análisis de archivos STL en el navegador:
* Parseo de archivos binarios y ASCII sin subida a servidor.
* Cálculo de volumen, dimensiones extremas y validación de área de impresión ($230 \times 150 \times 140\text{ mm}$).
* Estimación aproximada de material (PLA) basada en densidad media ($1.24\text{ g/cm}^3$) y factor de relleno.

---

## 🎮 Suite de Juegos e Evaluación Cognitiva

Ubicados en `silver/src/games.js`, implementan renderizado 2D/3D dinámico en `canvas` sin dependencias externas:
* **Arcade & Simulación**: Corredores infinitos, motores de física, inspección de calidad e interacción por acelerómetro (`deviceorientation`).
* **Batería de Pruebas Cognitivas**: Evaluación de agilidad mental (efecto Stroop, bloques de Corsi, N-Back) y tareas de planificación (Torre de Hanoi, puzzles deslizantes resolubles con algoritmos IDA*).
* **Motor de Reportes**: Generador de diagnósticos en cliente con almacenamiento persistente en `localStorage`.

---

## 🌐 Internacionalización & PWA

* **Soporte Multi-idioma**: Arquitectura estática espejo para Español (`/`) e Inglés (`/en/`) utilizando diccionarios en `silver/data/i18n/`.
* **Progressive Web App**: Configurado con `manifest.webmanifest` y `sw.js` para soporte de instalación local y caching de activos.
* **Optimización SEO**: Inclusión de datos estructurados JSON-LD, mapa de sitio (`sitemap.xml`) y meta-etiquetas Open Graph dinámicas.

---

## ⚙️ Entorno de Desarrollo Local

### Requisitos Previos
* Python 3.8+
* `make` (opcional, para uso de atajos)

### Comandos de Compilación e Inicio

```bash
# Compilar la capa Gold a partir de Silver
python scripts/build.py

# Iniciar servidor local de desarrollo
python -m http.server -d gold 8000
