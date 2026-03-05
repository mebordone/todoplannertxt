# Todo.txt – MailExtension (Thunderbird 140+)

Extensión de **Thunderbird** para administrar archivos [todo.txt](http://todotxt.org/): tareas en texto plano, prioridades, proyectos, contextos y fechas en un archivo que tú controlas.

- **Inspirada en** la [extensión Todo.txt](https://github.com/rkokkelk/todo.txt-ext) (Roy Kokkelkoren) y en [sleek](https://github.com/ransome1/sleek) (Robin Ahle). El **código de esta extensión está desarrollado de cero** como MailExtension; no es un fork del código legacy.

**Versión 3.6** – WebExtension (MailExtension) para Thunderbird 140+. **No es retrocompatible con la versión 2** (legacy XUL/XPCOM). Quienes usen la 2 deben reconfigurar rutas de archivos y preferencias al migrar a la 3.

---

## Requisitos

- **Thunderbird** 140.0 o superior
- **Sin complementos extra**: el acceso a los archivos todo.txt y done.txt se hace con una API de experimento integrada en Thunderbird. Solo hace falta instalar esta extensión.

## Instalación

1. Instala la extensión desde [addons.thunderbird.net](https://addons.thunderbird.net) o cárgala como complemento temporal para desarrollo.
2. Para cargar como complemento temporal:
   - Abre Complementos (Herramientas → Complementos), menú de engranaje → Depurar complementos → Cargar complemento temporal y selecciona el `manifest.json` de esta carpeta; o
   - Empaqueta la carpeta como .xpi e instálala.

## Funcionalidades

- **Configuración inicial**: En la primera ejecución (o si no hay rutas configuradas), en Opciones o en la pestaña de inicio puedes **Elegir carpeta** (donde se crearán o usarán `todo.txt` y `done.txt`) o **Seleccionar todo.txt** (archivo existente; en la misma carpeta se usa o crea `done.txt`). Sin complementos externos.
- **Opciones**: Rutas para todo.txt y done.txt con el selector de archivos o de carpeta integrado; botón «Abrir vista completa» en el encabezado; opciones de comportamiento (Thunderbird, fecha de creación, título completo); sección Depuración (copiar log). Idioma de la interfaz (en, es, de, fr).
- **Flujo de planificación:** Captura ideas como **tareas sin planificar** (sin fecha). Con **«Añadir a la semana»** eliges qué tareas quieres hacer esta semana. En la vista **«Esta semana»** las que no tienen fecha o están vencidas aparecen arriba; abajo se agrupan por día de la semana, así puedes asignar una fecha de vencimiento (`due:`) a las que no la tienen y planificar la semana.
- **Interfaz dual**
  - **Popup (vista rápida):** Clic en el icono de la barra abre un popup con título, solo las tareas pendientes (prioridad y vencimiento visibles) y barra de herramientas: actualizar (⟳), nueva tarea, añadir (+), abrir vista completa (⧉) y opciones (⚙). Doble clic para editar; checkbox para completar; botón × para eliminar (si no está en solo lectura).
  - **Vista en pestaña:** Enlace “Vista completa” (desde popup u Opciones) abre una página con todas las tareas. Toolbar: campo de texto + **Añadir** (sintaxis todo.txt) y **Añadir con formulario** (modal sin sintaxis); botones de vista **Todas**, **Sin planificar** (sin fecha + vencidas), **Esta semana**, **Hoy** (con contadores), Restablecer filtros, Actualizar, Opciones. Filtros y ordenación (proyecto, contexto, prioridad, vencimiento, agrupación); **agrupar por día** (con día de la semana en el encabezado); grupos plegables; vista por defecto configurable; backlog semanal (“añadir a la semana” por tarea). Doble clic abre **modal de edición** (título, prioridad, fecha, proyectos, contextos). Completar tarea actualiza la lista sin recargar y mantiene el scroll. Prioridad y vencimiento visibles en cada fila.
  - **Visibilidad del icono:** El botón de Todo.txt en la barra de título es visible en la pestaña de correo (Mail).
- **Calendario (Lightning)**: El experimento intenta registrar un calendario “Todo.txt”. Solo las tareas con `due:YYYY-MM-DD` se sincronizan; aparecen en la vista **Tareas** de Lightning. Opciones: activar/desactivar integración, elegir calendario, "Sincronizar ahora", exportar a ICS si la API no está disponible. Ver `docs/calendar-integration.md`.

## Tests (funcionales, integración, cobertura, complejidad)

Desde la raíz del proyecto:

```bash
npm install          # dependencias
npm test             # tests funcionales y de integración
npm run test:coverage   # tests + cobertura (informe en test/coverage/)
npm run complexity     # complejidad ciclomática
npm run lint           # ESLint (incluye regla de complejidad)
npm run ci             # cobertura + lint + complejidad (validación tipo CI)
```

Ver `test/README.md` para detalles. El proyecto cumple los criterios de **AGENTS.md** (§1–§12); ver `COMPLIANCE-AGENTS.md`. Cobertura ≥90% global y ≥80% branches; complejidad ≤10; `npm run ci` falla si no se cumplen umbrales o lint.

## Construcción

Los builds se generan en la carpeta `dist/`. Desde la raíz del proyecto:

```bash
./build.sh
```

El archivo `.xpi` quedará en `dist/` (p. ej. `dist/todotxt_3.6.2_20260304_123456.xpi`). Opción `-d` para build con logs de depuración; `-h` para ayuda.

## Depuración remota

Para usar la conexión de depuración de Thunderbird (puerto que muestra la ventana “Depuración del navegador”) y listar objetivos depurables (popup, background, opciones) y sus URLs WebSocket:

```bash
npm run debug:remote [puerto]
# Ej.: npm run debug:remote 6000   (tras arrancar thunderbird -start-debugger-server 6000)
#      npm run debug:remote 33321 (si Thunderbird ya mostró ese puerto en la ventana de depuración)
```

Ver `docs/debug-remote.md` para habilitar el servidor y usar las URLs con Chrome DevTools u otras herramientas CDP.

## Estructura del proyecto

- `manifest.json` – Manifest de la extensión (TB 140, storage, options_ui, browser_action, experiment_apis).
- `background.js` – Script en segundo plano (FSA, todoclient, polling, manejadores de mensajes).
- `options/` – Página de opciones (HTML + JS).
- `popup/` – Interfaz del popup (solo pendientes; enlace “Abrir en pestaña”).
- `tab/` – Página de vista completa (pendientes + completadas) que se abre en una pestaña.
- `modules/` – todotxt, util, fileUtil, todoclient, logger, exception, md5.
- `lib/fsa.js` – File System Access: experimento integrado cuando está disponible, fallback opcional al proxy File Access Manager.
- `experiments/fileAccess/` – Experimento para leer/escribir todo.txt y done.txt (sin complemento externo).
- `experiments/calendarTodoTxt/` – Experimento legacy para registrar el calendario en Lightning.
- `experiments/calendar/` – Experiment API de calendario (webext-experiments): calendarios e ítems.
- `background/calendarAdapter.js`, `background/syncService.js`, `background/calendarMappings.js` – Integración todo.txt ↔ Lightning.
- `_locales/` – Mensajes en en, es, de, fr (multiidioma; selector en Opciones).
- `icons/` – Iconos 16, 32, 48 px.
- `dist/` – Salida de builds (archivos .xpi); no se versiona (véase `.gitignore`).

## Referencias

| Recurso | Enlace |
|--------|--------|
| **Todo.txt** (formato y filosofía) | http://todotxt.org/ |
| **todo.txt extension** (extensión Thunderbird original) | https://github.com/rkokkelk/todo.txt-ext |
| **sleek** (GUI moderna para todo.txt) | https://github.com/ransome1/sleek |

## Licencia

MPL 2.0. Ver [LICENSE](LICENSE) en la raíz del repositorio.

## Publicar en addons.thunderbird.net

Checklist, notas para revisores y recomendaciones: [docs/PUBLISHING.md](docs/PUBLISHING.md).
