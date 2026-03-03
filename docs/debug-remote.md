# Depuración remota con Thunderbird

Para depurar la extensión conectándote al servidor de depuración de Thunderbird (la misma conexión que usa la “Ventana de depuración” / Browser Toolbox) puedes usar el script incluido y seguir estos pasos.

## 1. Habilitar el servidor de depuración en Thunderbird

**Opción A – Línea de comandos (recomendado)**  
Cierra Thunderbird y arranca con el servidor activado:

```bash
thunderbird -start-debugger-server 6000
```

El puerto por defecto es `6000` si no indicas otro. En algunas versiones recientes también puede existir:

```bash
thunderbird --remote-debugging-port=9222
```

**Opción B – Desde la interfaz**  
Si abres **Herramientas → Depuración del navegador** (o la ventana que muestra “Conexión entrante”), Thunderbird suele levantar un puerto local (por ejemplo `localhost:33321`). Anota el puerto que aparezca en el mensaje de conexión; ese es el que debes usar en el script.

## 2. Ejecutar el script de depuración

Desde la raíz del proyecto:

```bash
node scripts/debug-remote.js [puerto]
```

Ejemplos:

```bash
node scripts/debug-remote.js 6000
node scripts/debug-remote.js 33321
REMOTE_DEBUG_PORT=9222 node scripts/debug-remote.js
```

Variables de entorno:

- `REMOTE_DEBUG_PORT`: puerto si no pasas argumentos (por defecto `6000`).
- `REMOTE_DEBUG_HOST`: host (por defecto `127.0.0.1`).

El script hace peticiones HTTP a:

- `http://<host>:<puerto>/json/version` – información del runtime y URL WebSocket del navegador.
- `http://<host>:<puerto>/json/list` – lista de objetivos depurables (pestañas, popup de la extensión, background, opciones, etc.).

En la salida verás las URLs WebSocket que puedes usar para conectar un depurador (Chrome DevTools u otra herramienta CDP).

## 3. Usar las conexiones para depurar

- **Chrome:** Abre `chrome://inspect`, en “Configure” añade `localhost:<puerto>` si hace falta y usa los objetivos que aparezcan.
- **Herramientas CDP:** Cualquier cliente que hable el Chrome DevTools Protocol puede usar la URL WebSocket que imprime el script para adjuntarse a un objetivo (popup, página de opciones, background, etc.).

## Notas

- Si el script falla con “Connection refused” o “timeout”, comprueba que Thunderbird esté en marcha y que el servidor de depuración esté activo en el puerto correcto.
- La opción `devtools.debugger.force-local` (por defecto activa) limita las conexiones a localhost por seguridad.
