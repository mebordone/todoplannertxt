# Análisis de la Experiment API de calendario (webext-experiments)

Este documento resume el análisis de la API de calendario del repositorio [thunderbird/webext-experiments](https://github.com/thunderbird/webext-experiments) (carpeta `calendar`) para su uso en la integración Lightning de la extensión Todo.txt. Objetivo: Thunderbird 140.7 ESR.

---

## 1. APIs disponibles en el draft calendar

### 1.1 calendar_calendars

- **Schema:** [calendar-calendars.json](https://github.com/thunderbird/webext-experiments/blob/main/calendar/experiments/calendar/schema/calendar-calendars.json)
- **Path en API:** `messenger.calendar.calendars`

| Función       | Descripción |
|---------------|-------------|
| `query(queryInfo)` | Lista calendarios; filtros opcionales: `type`, `url`, `name`, `color`, `readOnly`, `visible`, `enabled`. |
| `get(id)`     | Obtiene un calendario por id. Si `id` termina en `#cache`, devuelve el calendario cacheado (offline) de un calendario propio. |
| `create(createProperties)` | Crea calendario: `name`, `type`, `url` obligatorios; opcionales: `readOnly`, `enabled`, `visible`, `showReminders`, `color`, `capabilities`. |
| `update(id, updateProperties)` | Actualiza propiedades: `name`, `url`, `readOnly`, `enabled`, `color`, `visible`, `showReminders`, `capabilities`, `lastError`. |
| `remove(id)`  | Elimina el calendario del gestor. |
| `clear(id)`   | Limpia ítems del calendario (solo calendarios cacheados, `id` debe terminar en `#cache`). |
| `synchronize(ids?)` | Dispara refresco de calendarios (por id o todos los visibles). |

**Eventos:** `onCreated`, `onUpdated`, `onRemoved`.

**Tipo Calendar:** `id`, `cacheId` (opcional), `type`, `name`, `url`, `readOnly`, `enabled`, `visible`, `showReminders`, `color`, `capabilities`.

Para un calendario local tipo storage: `calendars.create({ type: "storage", url: "moz-storage-calendar://", name: "Todo.txt" })`.

---

### 1.2 calendar_items

- **Schema:** [calendar-items.json](https://github.com/thunderbird/webext-experiments/blob/main/calendar/experiments/calendar/schema/calendar-items.json)
- **Path en API:** `messenger.calendar.items`

| Función       | Descripción |
|---------------|-------------|
| `query(queryOptions)` | Lista ítems; opciones: `returnFormat` ("ical"\|"jcal"), `id`, `calendarId` (string o array), `type` ("event"\|"task"), `rangeStart`, `rangeEnd`, `expand`. |
| `get(calendarId, id, getOptions?)` | Obtiene un ítem por calendario e id; `getOptions.returnFormat` para ICAL/jCal. |
| `create(calendarId, createProperties)` | Crea ítem: `type` ("event"\|"task"), `format` ("ical"\|"jcal"), `item` (string ICAL o objeto jCal), opcionales: `id`, `returnFormat`, `metadata`. |
| `update(calendarId, id, updateProperties)` | Actualiza ítem: `format`, `item`, `returnFormat`, `metadata`. |
| `move(fromCalendarId, id, toCalendarId)` | Mueve ítem entre calendarios. |
| `remove(calendarId, id)` | Elimina ítem. |
| `getCurrent(getOptions?)` | Ítem actual en contexto de UI (p. ej. el seleccionado). |

**Eventos:** `onCreated`, `onUpdated`, `onRemoved`, `onAlarm`. Pueden registrarse con `{ returnFormat: "ical" }` para recibir el ítem en formato ICAL.

**Formato de ítems:** En [ext-calendar-utils.sys.mjs](https://github.com/thunderbird/webext-experiments/blob/main/calendar/experiments/calendar/ext-calendar-utils.sys.mjs), `propsToItem(props)` exige `props.format === "ical"` o `"jcal"` y `props.item` como string ICAL o objeto jCal. No hay API de alto nivel (tipo “title + startDate”); hay que construir el VTODO/VEVENT en ICAL o jCal.

---

### 1.3 calendar_provider (no necesario para Todo.txt)

Usado cuando la extensión *es* el backend del calendario (p. ej. proveedor tipo Google). Incluye `onItemCreated`, `onItemUpdated`, `onItemRemoved`, `onInit`, `onSync`, `onResetSync`. Para nuestro flujo (calendario local storage + sincronización desde la extensión) **no es necesario** declarar `calendar_provider` en el manifest.

---

### 1.4 calendar_timezones, calendarItemAction, calendarItemDetails

Opcionales para Fase 1. Podrían añadirse en Fase 2 si se necesita selector de zona horaria o acciones/UI personalizadas sobre ítems.

---

## 2. Mapeo a nuestro uso (Todo.txt ↔ Lightning)

| Necesidad                         | API / método / evento |
|-----------------------------------|------------------------|
| Crear calendario local "Todo.txt" | `calendars.create({ type: "storage", url: "moz-storage-calendar://", name: "Todo.txt" })` |
| Listar calendarios (selector)     | `calendars.query({})` o con filtro `type: "storage"` |
| Añadir tarea con due en calendario | `items.create(calendarId, { type: "task", format: "ical", item: icalVtodoString })` |
| Actualizar tarea en calendario     | `items.update(calendarId, itemId, { format: "ical", item: icalVtodoString })` |
| Borrar tarea del calendario       | `items.remove(calendarId, itemId)` |
| Saber cuándo el usuario edita en Lightning | `items.onCreated`, `items.onUpdated`, `items.onRemoved` con `{ returnFormat: "ical" }` |

Formato ICAL para VTODO: construir manualmente SUMMARY, DUE (o DTSTART/DTEND), COMPLETED, STATUS, CATEGORIES (desde `+project`), UID para identificación estable.

---

## 3. Patrones del draft (background.js de webext-experiments)

Referencia: [calendar/background.js](https://github.com/thunderbird/webext-experiments/blob/main/calendar/background.js).

- **Acceso a la API:** `var { calendar: lightning } = messenger;`
- **Crear calendario storage:** `lightning.calendars.create({ type: "storage", url: "moz-storage-calendar://", name: "Home" })`.
- **Crear ítem:** Se usa `lightning.items.create(calendarId, { id, type: "event", title, startDate, endDate, metadata })` en el ejemplo; en el parent real (`ext-calendar-items.js`) la creación pasa por `propsToItem(createProperties)`, que **solo** acepta `format` + `item` (ICAL/jCal). Por tanto en nuestra implementación debemos usar siempre `format: "ical"` y `item: "<string ICAL del VTODO>"`.
- **Fechas ICAL:** Función tipo `icalDate(date)` que convierte `Date` a string ICAL (p. ej. `date.toISOString().replace(/\.\d+Z$/, "").replace(/[:-]/g, "")` para DATE-TIME).
- **Listeners:** `lightning.items.onCreated.addListener((item) => {...}, { returnFormat: "ical" })`, idem `onUpdated`, `onRemoved`.
- **Evitar bucles:** Al reaccionar a eventos del calendario, aplicar cambios en todo.txt; al reaccionar a cambios en todo.txt, actualizar calendario. Marcar “origen” del cambio (flag o metadata) para no re-enviar el mismo cambio en bucle (debounce/coalescing recomendado).

---

## 4. Operaciones que una MailExtension NO puede hacer sin Experiments

Sin la Experiment API de calendario:

- **No** se puede listar, crear ni eliminar calendarios.
- **No** se puede crear, actualizar ni eliminar ítems (eventos/tareas) en el calendario.
- **No** se puede recibir eventos cuando el usuario edita en la UI de Lightning (onCreated/onUpdated/onRemoved).

Por tanto, sin Experiments el único fallback viable es:

- **Exportar** las tareas con `due:` a un archivo ICS (formato estándar) para que el usuario lo importe manualmente en Thunderbird (Calendario → Importar).
- Mostrar en Options un aviso cuando la API no esté disponible (p. ej. “La integración con el calendario requiere una versión de Thunderbird con soporte para la API de experimentos de calendario. Puede exportar sus tareas con fecha a un archivo ICS.”).

---

## 5. Compatibilidad Thunderbird 140.7 ESR

- El draft indica **Compatibility: Thunderbird 128** y está en estado **Draft**.
- En 140.7 ESR la API podría no estar presente (los parent scripts del experiment se cargan desde el add-on; si el core de Thunderbird no incluye los módulos `calUtils.sys.mjs`, `CalEvent.sys.mjs`, `CalTodo.sys.mjs`, etc., el experiment podría fallar al cargar).
- **Recomendación:** Comprobar en runtime si la API está disponible, por ejemplo: `typeof messenger !== "undefined" && messenger.calendar?.calendars && messenger.calendar?.items`. Si no, no registrar listeners ni llamar a create/update/remove y activar el flujo de fallback (export ICS + mensaje en Options).
- Documentar en la documentación de la extensión y en la descripción para addons.thunderbird.net que la integración con Lightning depende de esta API experimental y que en entornos donde no exista se ofrece exportación a ICS.

---

## 6. Referencias

| Recurso | URL |
|--------|-----|
| webext-experiments calendar | https://github.com/thunderbird/webext-experiments/tree/main/calendar |
| calendar README | https://github.com/thunderbird/webext-experiments/blob/main/calendar/README.md |
| calendar-calendars schema | https://github.com/thunderbird/webext-experiments/blob/main/calendar/experiments/calendar/schema/calendar-calendars.json |
| calendar-items schema | https://github.com/thunderbird/webext-experiments/blob/main/calendar/experiments/calendar/schema/calendar-items.json |
| ext-calendar-utils (propsToItem, convertItem) | https://github.com/thunderbird/webext-experiments/blob/main/calendar/experiments/calendar/ext-calendar-utils.sys.mjs |
| Draft background.js (patrones) | https://github.com/thunderbird/webext-experiments/blob/main/calendar/background.js |
| Using Experiments in add-ons | https://github.com/thunderbird/webext-experiments#using-experiments-in-your-add-ons |
| Bugzilla tracking (draft) | [bug 1627205](https://bugzilla.mozilla.org/show_bug.cgi?id=1627205) |

---

## 7. Conclusiones

- Para la integración Todo.txt ↔ Lightning en Fase 1 basta con **calendar_calendars** y **calendar_items** (schemas + parent scripts correspondientes y `ext-calendar-utils.sys.mjs`).
- Los ítems deben crearse/actualizarse en formato **ICAL** (o jCal) con VTODO bien formado (SUMMARY, DUE, COMPLETED, CATEGORIES, UID).
- Detección de API en runtime y fallback a export ICS son obligatorios para TB 140.7 ESR.
- No se requiere `calendar_provider` para el flujo “calendario local + sincronización bidireccional desde la extensión”.
