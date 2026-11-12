# Formulario de contacto con n8n

El formulario del portafolio envía los datos a un webhook de n8n.

## 1. Importar el flujo
1. En n8n: **Workflows → Import from File** y elige `contacto-portafolio.json`.
2. Abre el nodo **Recibir contacto** y copia la **Production URL** (la que empieza en `/webhook/`).
3. Activa el flujo (interruptor **Active**).

## 2. Conectarlo al sitio
Pega la URL en `silver/data/site.json`, campo `form_endpoint`, y reconstruye:

    "form_endpoint": "https://TU-INSTANCIA.n8n.cloud/webhook/contacto-portafolio"

## 3. Qué recibe n8n
Cada envío trae estos campos (formato formulario):

| Campo | Contenido |
|---|---|
| nombre, correo, telefono, mensaje | lo que escribe la persona |
| consentimiento | siempre `si` (acepta el tratamiento de datos) |
| idioma | `es` o `en` |
| fecha | fecha y hora del envío (ISO) |
| origen | página desde la que se envió |

El campo trampa anti-spam se revisa en el navegador: si está lleno, el envío ni sale.

## 4. Avisarte cada mensaje (siguiente paso)
Después del nodo **Recibir contacto**, agrega el nodo de correo (Gmail o SMTP) o WhatsApp
que prefieras, y usa los campos de arriba (`{{ $json.body.nombre }}`, `{{ $json.body.correo }}`, etc.).

## Notas
- El sitio no puede confirmar que n8n recibió el mensaje (el envío es "sin respuesta visible"). Revisa **Executions** en n8n para verificar cada envío.
- Mientras `form_endpoint` esté vacío, el formulario abre WhatsApp con los datos, como ahora.
- Prueba primero con la URL de prueba (`/webhook-test/`) desde el botón **Listen for test event** de n8n.
