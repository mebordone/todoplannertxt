# Todo.txt MailExtension – Changelog (high‑level)

This document summarizes **implemented milestones** from the original `ROADMAP.md`.  
The roadmap now focuses only on **upcoming / planned work**.

---

## Version 3.6 – Adequacy for first publication

**Goal:** Prepare the extension for first submission to addons.thunderbird.net.

**Implemented:**

- **Manifest:** Version set to 3.6.0; add-on ID changed to `todo.txt.planner@mebordone.com.ar`. Replaced `applications.gecko` with `browser_specific_settings.gecko`; added `strict_max_version`: `"140.*"`; added `browser_style: true` to `options_ui`.
- **Options:** Display language selector extended with Deutsch and Français (existing _locales de/fr). Logic in `options.js` and `lib/i18nHelper.js` updated to support `de` and `fr`.
- **Popup:** When no paths are configured, added an "Open Options" link next to the folder/todo buttons for consistency with empty and error states.
- **Docs:** New `docs/SUBMISSION-FORM-TEXTS.md` with copy-paste texts for the add-on listing form (summary, description, notes for reviewers, privacy, support/source URLs, screenshots checklist). `docs/PUBLISHING.md` updated with new add-on ID, Experiment APIs "full access" permission note, link to SUBMISSION-FORM-TEXTS, and screenshots subsection.
- **ROADMAP:** Renumbered: adequacy release = 3.6; former 3.6 (Form-based Add task) = 3.7; former 3.7 (Week planner) = 3.8. Summary and table updated.

---

## Version 3.6.1 – Tab UX improvements and stability

**Goal:** Improve tab view usability, fix edit/refresh issues, and add form-based add without removing syntax flow.

**Implemented:**

- **Version:** Set to 3.6.1 in `manifest.json` and `package.json`.
- **Toolbar view buttons:** Order changed to **Todas**, **Backlog**, **Esta semana**, **Hoy** (then Reset filters, Refresh, Options). **Backlog** now includes both tasks without due date and overdue tasks; separate "Overdue" button removed. New **Todas** button shows all open tasks regardless of due. Filter logic in `tab/filterSort.js` (`matchesFilterDue` with `"backlog"`); i18n `tab_view_all`, `tab_view_all_aria`, `tab_filter_backlog` in en, es, de, fr.
- **Group by day:** New "Por día" option in Group by selector (`groupKeyDueDay` in `filterSort.js`); group header shows weekday + date (e.g. "Wednesday 2026-03-05") when grouping by day. i18n `tab_group_by_day`; tests in `filterSort.test.js` for `dueDay` and `backlog` filter.
- **Complete task without full reload:** In `toggleTask`, after successful `modifyItem`, update `fullItems` in memory, call only `refreshView()` (no `loadItems()`), and restore `listEl.scrollTop` so the list does not jump to the top.
- **Collapsible groups:** When grouping, each group has a clickable header with arrow (▼/▶); state persisted in `tabViewPrefs.collapsedGroupKeys`. CSS `.group-container.collapsed .group-items { display: none }`. i18n `tab_group_expand`, `tab_group_collapse`.
- **Edit task – full details:** Replaced inline title-only edit with a modal: Title, Priority (None/A/B/C), Due date, Projects, Contexts, Save/Cancel. Submit builds `newItem` and calls `modifyItem`; on success updates `fullItems` and `refreshView()` without reload. i18n for modal labels in four locales.
- **Add task with form:** New toolbar button "Añadir con formulario" opens a modal (same fields as edit) for users who prefer not to use todo.txt syntax; tip at bottom explains the syntax alternative. Submit calls `addItem` with built `plainItem`; new task appended to `fullItems` and view refreshed. i18n `tab_add_with_form`, `tab_add_task_title`, `tab_add_save`, `tab_add_form_tip`.
- **Weekly view – empty state:** When "Esta semana" has no tasks assigned (`weeklyBacklogIds.length === 0`), show empty list with message "No tasks assigned to this week. Use 'Add to week'…" instead of showing all tasks. i18n `tab_empty_weekly`.
- **Preserve view when changing Group by / Sort:** Changing "Group by", "Sort by" or sort direction no longer resets view to "Todas"; dedicated handler `onGroupOrSortOnlyChange` keeps current view mode (e.g. "Esta semana").
- **Deterministic task id:** In `modules/todotxt.js`, task id is now a deterministic hash of the line content (MD5 when available) instead of a random UUID, so the same line keeps the same id across re-parses. Fixes "La tarea no se encontró en todo.txt" when editing after cache refresh (e.g. popup or polling). `manifest.json`: load `modules/md5.js` before `modules/todotxt.js`.
- **Weekly view – Due filter:** In "Esta semana", pipeline runs with `filterDue: ""` so tasks that have a due date (e.g. after editing) still appear in the weekly list; only the weekly id filter is applied.
- **Tests and AGENTS.md:** `npm run ci` passes; coverage ≥90% statements, ≥80% branches; complexity ≤10; lint clean. New tests for `filterDue === "backlog"` and `groupKeyFor(..., "dueDay")` in `filterSort.test.js`.
- The backlog view button label was later updated to "Sin planificar" / "Unplanned" (and equivalents in DE/FR) in all locales.

---

## Version 3.6.2 – Polish and Details

**Goal:** Improve first impression in Thunderbird Details view and align docs/UI with current terminology.

**Implemented:**

- **Extension description (Details view):** Replaced long `extensionDescription` (with literal `<br>`/bullets in plain-text display) with a short 2–4 sentence paragraph in all four locales (en, es, de, fr), no HTML, readable as a single block.
- **Manifest:** `browser_action.default_title` set to `__MSG_extensionName__` so the toolbar icon tooltip uses the localized extension name.
- **Docs:** README "Backlog" → "Sin planificar"; ROADMAP summary "Todas/Backlog/…" → "Todas/Sin planificar/…"; test/README "webext" → "del proyecto"; CHANGELOG note on backlog label change.
- **Tab:** Fallback text for the unplanned-view button in `tab/tab.html` changed from "Backlog" to "Unplanned" (and aria-label to "View unplanned tasks") so initial flash matches current UI.
- **Version:** Set to 3.6.2 in `manifest.json` and `package.json`.
- **View count vs displayed tasks (timezone fix):** Button counts for "Sin planificar" and "Hoy" now match the number of tasks shown when clicking. Previously, counts used local date while filtering used UTC date (`toISOString()`), causing mismatches in non-UTC timezones. `tab/filterSort.js` now uses local date (`getTodayLocal()`) for "today", "backlog", "overdue" and "week" so counts and filtering are consistent. Test `matchesFilterDue` "today" updated to use local date.

---

## Version 3.6.3 – Add-by-view, week range, fixes

**Goal:** Context-aware quick add (Hoy / Esta semana), configurable week start, vista semanal unificada, and stability fixes.

**Implemented:**

- **Add task in view "Hoy":** When using the quick-add field ("Añadir") in the "Hoy" view, the new task gets `due` set to today if the text does not contain an explicit `due:`.
- **Add task in view "Esta semana":** When using quick-add in the "Esta semana" view, the new task is created without due and is added to the weekly list (flag "En la semana") so it appears in that view.
- **Options – Week starts on:** New preference "La semana empieza el" with **Lunes** (default) or **Domingo**. Used for the "Esta semana" view range and for counting tasks in that view. i18n in en, es, de, fr.
- **Vista "Esta semana" – union:** The "Esta semana" view now shows the union of (1) tasks marked "En la semana" and (2) tasks with `due` within the current week (range from Options week start). Counter on the button reflects this union.
- **lib/weekRange.js:** Pure helpers `getWeekRange(weekStart, todayStr)` and `isDueInWeekRange(dueStr, start, end)`; tab loads it and uses `globalThis.weekRange`. Unit tests in `test/unit/weekRange.test.js`.
- **Sticky toolbar:** The main tab toolbar (new task + view buttons) uses `position: sticky` so it stays visible while scrolling the task list.
- **Fix – weekRange redeclaration:** `lib/weekRange.js` wrapped in an IIFE so function names do not leak to the global scope, fixing "redeclaration of non-configurable global property getWeekRange" in the extension context (tab stuck on Loading, English).
- **Fix – Agrupar por Ninguno:** The "Agrupar por" value "Ninguno" (`""`) is now respected: prefs and UI no longer replace it with "project", so the list renders without grouping when "Ninguno" is selected.
- **Version:** Set to 3.6.3 in `manifest.json`, `package.json`, and `lib/build-info.js`.

---

## Phase 0a–0b: Repository migration and legacy cleanup

### 0a. Repository migration (own repo, URLs, structure)

**Goal:** Move the MailExtension to its own repository so it can be maintained, versioned and published independently from the legacy `todo.txt-ext` codebase.

**Implemented steps:**

1. Created a new repository containing only the MailExtension code (and shared docs/CI at the root).
2. Set up CI (lint, tests, optional XPI build) in the new repo.
3. Updated references: README, `manifest.json` (homepage/support URLs), `package.json`, links in docs and `_locales`.
4. Documented the fork/migration in the new README (credits to original author, link to legacy repo as needed).
5. Decided on the add-on ID / publication strategy for existing users and documented it.

### 0b. Legacy / dead code cleanup

**Goal:** Remove inherited and unused code so the codebase only contains what the current MailExtension uses, reducing confusion and maintenance cost.

**Implemented steps:**

1. Identified dead code: unused modules, experiment code paths that are never called on supported TB versions, commented-out blocks, obsolete polyfills/fallbacks.
2. Removed or stubbed experiments that cannot work on current TB and have no live callers (e.g. calendar experiments that are effectively no-op), or replaced them with minimal stubs that fail gracefully.
3. Trimmed legacy leftovers: references to the old extension structure (`todo.txt-ext`), duplicate/unused strings in `_locales`, unused CSS/HTML fragments.
4. Documented the active parts of the codebase in README / architecture notes so future contributors can distinguish live vs deprecated pieces.

---

## Phase 1–2: Dual UI and full tab view

### 1. Dual UI: popup (quick) + tab (full page)

**Goal:** Keep the toolbar button for a fast glance, and add an explicit way to open a full page. Split responsibilities so the popup stays minimal and the tab becomes the “power” interface.

**Implemented:** Popup shows only **pending** tasks with title-only list; toolbar with icons (refresh ⟳, add +, full view ⧉, options ⚙). Tab (`tab/tab.html`, `tab/tab.js`) shows **all tasks**, add/complete/edit/refresh, Options, and **Filters & view** (search, project/context/priority/due/status, sort, group). Preferences in `tabViewPrefs`. Default: all tasks; filter dropdowns include "All".

---

## Phase 2–5: Calendar integration Phase 1

### 2. Calendar integration (Lightning) — Phase 1

- **Experiment API:** Integration uses the webext-experiments calendar API (`calendar.calendars`, `calendar.items`) shipped in the extension (`experiments/calendar/`). A local calendar "Todo.txt" is created when the user enables integration in Options.
- **Sync:** Only tasks with `due:YYYY-MM-DD` are synced. Bidirectional sync: todo.txt → calendar (push on file change / "Sync now") and calendar → todo.txt (onCreated/onUpdated/onRemoved). Deduplication avoids loops (normalized title+due key).
- **Options:** Toggle to enable/disable integration, calendar selector, "Sync now" button, "Export to ICS" fallback when the API is unavailable, "Copy last sync log" for debugging.
- **Docs:** `docs/calendar-integration.md`, `docs/experiments-calendar-analysis.md`. Tasks appear in Lightning **Tasks** view, not the day grid.

---

## Phase 3–4: Configuration, portability and feature parity (Phase A)

### 3. Configuration and portability

- **Read-only mode:** Option in Options → Behavior to never write to `todo.txt`/`done.txt` (preference `readOnly`). When enabled, add/modify/complete/delete and calendar→todo sync skip writing; sync todo→calendar (read) still works.
- **Error reporting:** Clearer, localized messages for missing files, locked files, and network/remote locations. FSA errors are mapped to `FILE_NOT_FOUND`, `FILE_CANNOT_WRITE`, `FILE_LOCKED`, `FILE_NETWORK_OR_REMOTE`; existing messages (e.g. `error_filesNotSpecified`) improved in `_locales`.

### 4. Feature parity with sleek-style todo.txt managers — Phase A

Long-term goal: approach the UX and power of dedicated managers like [sleek](https://github.com/ransome1/sleek), within Thunderbird’s constraints. These features belong primarily in the **full tab page**, not in the popup.

**Phase A (done):**

- **Rich filtering:** In the full tab page: by project (`+project`), context (`@context`), priority, due (overdue / today / this week / no date), completed/open; filters are combinable. Options populated from current tasks.
- **Full-text search:** Search box in the tab filters as you type over title, projects, and contexts.
- **Sorting and grouping:** Sort by priority, due date, created, completed, or title (asc/desc). Group by none, project, context, priority, or completion. Preferences persisted in `browser.storage.local` under `tabViewPrefs`. Implemented in `tab/filterSort.js` (pure logic) and `tab/tab.js` (UI and pipeline).

All of the above must respect `AGENTS.md` (tests, complexity, no regression of current popup + file sync).

---

## Phase 6–7: Multi-language and UX recommendations

### 8.1 Multi-language (EN + ES, sync with Thunderbird)

- Added `_locales/es/messages.json` with all UI strings in Spanish; when Thunderbird language is Spanish, the extension UI uses Spanish automatically.
- In Options, "Display language" dropdown: "Use Thunderbird language", "English", "Español"; when a fixed language is chosen, popup, tab and options use that locale (after reopen/reload).
- Helper `lib/i18nHelper.js` loads the chosen locale JSON and overrides `getMessage` in popup, tab and options.

### 8.2 UX recommendations (from usability analysis)

Implemented 12 items:

1. **Empty state (tab):** When no tasks match filters, show an i18n message suggesting Project, Context and Status "All", plus a "Reset filters" button.
2. **Feedback when adding a task:** Brief "Task added" (toast or inline) after successful add in popup/tab.
3. **Loading state:** Spinner or skeleton while loading; disable Refresh/Add during load.
4. **Sort direction labels:** Clearer labels for Asc/Desc (e.g. "Earlier first" / "Later first" for dates) in the tab.
5. **Options consistency:** Unify hint text; optional "Saved" feedback after auto-save.
6. **Delete task from UI:** Expose delete (trash icon or context menu) in popup and tab; confirm before delete; respect read-only.
7. **Edit without prompt():** In-place edit or custom modal for task title in tab; in popup, a proper dialog instead of `prompt()`.
8. **Filters bar (tab):** Collapsible "Filters & view"; "Reset filters" button.
9. **Naming consistency:** Clarify "Tab" vs "Quick view" with tooltips.
10. **Task count:** Show "Showing X of Y tasks" when filters are active.
11. **Accessibility:** ARIA roles, keyboard focus, screen-reader announcements.
12. **First-run:** Friendlier empty state when paths are not set: "Elegir carpeta" (folder picker; creates or uses todo.txt/done.txt in that folder) or "Seleccionar todo.txt" (file picker); "Open Options" link.

---

## Version 3.5 – Phase 8: UX polish & daily planner basics

**Objetivo:** Mejorar la experiencia diaria (legibilidad, vista "Hoy", backlog básico) y cumplir AGENTS.md (tests, cobertura, complejidad ≤10).

### 3.5-A. Quick wins de legibilidad

- **Prioridad visible:** Badge con letra (A, B, C…) y color en popup y tab; filas con prioridad alta o vencidas con estilo destacado (`lib/priorityDisplay.js`, tests en `test/unit/priorityDisplay.test.js`).
- **Vencimiento:** Icono/fecha de `due:` en meta de cada tarea; clases CSS para vencidas.
- **Botón "Añadir"** como acción primaria (estilo destacado) en popup y tab.
- **Separadores y contraste** entre filas en la lista del tab.

### 3.5-B. Flujo diario "Hoy" y preferencias de vista

- **Vista "Hoy":** Botón en el toolbar que aplica filtro vencimiento = hoy, estado = abiertas, orden por vencimiento; persistido en `tabViewPrefs`.
- **Vista "Vencidas":** Botón que filtra solo tareas vencidas (due &lt; hoy).
- **Contadores en toolbar:** Los botones "Hoy", "Vencidas", "Esta semana" y "Backlog" muestran el número entre paréntesis cuando es &gt; 0 (unificado con la lógica de resumen).
- **Vista por defecto:** Selector "Default view" en la barra de filtros (Todas / Solo hoy / Solo backlog / Solo esta semana); valor guardado en preferencias y aplicado al cargar el tab.

### 3.5-C. Backlog sin fecha y backlog semanal

- **Vista "Backlog":** Botón que muestra solo tareas sin `due:` (abiertas); misma barra de filtros y agrupación.
- **Vista "Esta semana":** Muestra solo las tareas que el usuario ha marcado como "para esta semana" (`weeklyBacklogIds` en `tabViewPrefs`).
- **Control "Añadir a la semana" / "En la semana":** En cada fila del tab, botón para añadir o quitar la tarea del backlog semanal; persistido y limpiado al cargar.

### Toolbar y opciones (refinamientos)

- **Toolbar del tab:** Orden de botones: Hoy, Vencidas, Esta semana, Backlog, Restablecer filtros, Actualizar, Opciones. El botón "Vista rápida" se sustituyó por "Restablecer filtros" en el toolbar.
- **Tooltips:** Los botones del toolbar (Hoy, Vencidas, Esta semana, Backlog, Restablecer filtros, Actualizar, Añadir, Opciones) tienen `title`/aria descriptivos.
- **Opciones:** Un solo botón "Abrir vista completa" en el encabezado; eliminado el duplicado del bloque de bienvenida. Sección "Depuración" separada con el botón "Copiar log de depuración".

### Documentación y publicación

- **Descripción de la extensión:** Texto único para la ficha en la tienda (crédito a Roy Kokkelkoren, autor Matías Bordone, homepage `github.com/mebordone/todoplannertxt`); actualizado en `_locales` (en, es, de, fr).
- **Resumen en una línea:** Nueva clave i18n `extensionSummary` para uso en la ficha de addons.thunderbird.net.

### Cumplimiento AGENTS.md

- **Complejidad:** Refactor de `bindOptionListeners`, `setPopupToolbarI18n` y `setToolbarI18n` (extracción de helpers) para mantener complejidad ≤10.
- **Cobertura y tests:** Sin regresión; umbrales ≥90% statements, ≥80% branches; tests existentes y `priorityDisplay.test.js` para el nuevo módulo.

