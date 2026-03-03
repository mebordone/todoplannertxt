# Todo.txt MailExtension – Roadmap

This document outlines planned and potential future work for the Todo.txt MailExtension. Features are grouped by theme; the **recommended order of implementation** is given at the end so that each step builds on the previous one without blocking.

---

## Recommended order of implementation

| Phase | Focus | Status | Sections below |
|-------|--------|--------|----------------|
| **0a** | Repository migration (own repo, URLs, structure) | Optional | § 6 |
| **0b** | Legacy / dead code cleanup | Optional | § 7 |
| **1** | Dual UI: popup (pending only) + “Open in tab” (full page) | **Done** | § 1 |
| **2** | Full tab: pending + done, same actions | **Done** | § 1 |
| **3** | Full tab: filters, search, sort, grouping | **Done** | § 4 Phase A |
| **4** | Configuration and portability (read-only, errors) | **Done** | § 3 |
| **5** | Calendar integration Phase 1 | **Done** | § 2 |
| **6** | Multi-language (EN + ES), sync with Thunderbird locale | **Done** | § 8.1 |
| **7** | UX recommendations (§8.2: empty state, feedback, loading, delete, edit, filters, a11y, first-run) | **Done** | § 8.2 |
| **8** | Form-based "Add task" (Todoist-style) | Planned | § 4 Phase B |
| **9** | Calendar Phase 2; planning window; sleek-style advanced | Backlog | § 2, § 5, § 4 (rest) |

Phases **0a** and **0b** can be done in parallel.

**Implemented so far:** §1 (dual UI: popup + tab), §2 Phase 1 (calendar sync), §3 (read-only mode + error reporting), §4 Phase A (filters, search, sort, group in tab), §8.1 (multi-language EN + ES, display language selector), §8.2 (UX recommendations: empty state, reset filters, task-added feedback, loading state, sort labels, options “Saved”, delete task, in-place edit / dialog, collapsible filters, tooltips, task count, accessibility, first-run). See each section for details.

---

## 1. Dual UI: popup (quick) + tab (full page) — **implemented**

**Goal:** Keep the toolbar button for a fast glance, and add an explicit way to open a full page. Split responsibilities so the popup stays minimal and the tab becomes the “power” interface.

**Implemented:** Popup shows only **pending** tasks with title-only list; toolbar with icons (refresh ⟳, add +, full view ⧉, options ⚙). Tab (`tab/tab.html`, `tab/tab.js`) shows **all tasks**, add/complete/edit/refresh, Options, and **Filters & view** (search, project/context/priority/due/status, sort, group). Preferences in `tabViewPrefs`. Default: all tasks; filter dropdowns include "All". **Optional (not done):** Menu entry "Open Todo.txt in tab"; README note.


---

## 2. Calendar integration (Lightning) — Phase 1 **implemented**

**Phase 1 (done – Thunderbird 140.7 ESR):**

- **Experiment API:** Integration uses the webext-experiments calendar API (`calendar.calendars`, `calendar.items`) shipped in the extension (`experiments/calendar/`). A local calendar "Todo.txt" is created when the user enables integration in Options.
- **Sync:** Only tasks with `due:YYYY-MM-DD` are synced. Bidirectional sync: todo.txt → calendar (push on file change / "Sync now") and calendar → todo.txt (onCreated/onUpdated/onRemoved). Deduplication avoids loops (normalized title+due key).
- **Options:** Toggle to enable/disable integration, calendar selector, "Sync now" button, "Export to ICS" fallback when the API is unavailable, "Copy last sync log" for debugging.
- **Docs:** `docs/calendar-integration.md`, `docs/experiments-calendar-analysis.md`. Tasks appear in Lightning **Tasks** view, not the day grid.

**Phase 2 (planned):**

- Richer conflict resolution (e.g. timestamps), optional recurrence mapping, and further UX/performance improvements once the Experiment API is stable and widely available.

---

## 3. Configuration and portability — **implemented**

**Done:**

- **Read-only mode:** Option in Options → Behavior to never write to `todo.txt`/`done.txt` (preference `readOnly`). When enabled, add/modify/complete/delete and calendar→todo sync skip writing; sync todo→calendar (read) still works.
- **Error reporting:** Clearer, localized messages for missing files, locked files, and network/remote locations. FSA errors are mapped to `FILE_NOT_FOUND`, `FILE_CANNOT_WRITE`, `FILE_LOCKED`, `FILE_NETWORK_OR_REMOTE`; existing messages (e.g. `error_filesNotSpecified`) improved in _locales.

---

## 4. Feature parity with sleek-style todo.txt managers — Phase A **implemented**

Long-term goal: approach the UX and power of dedicated managers like [sleek](https://github.com/ransome1/sleek), within Thunderbird’s constraints. These features belong primarily in the **full tab page** (§ 1), not in the popup.

**Phase A (done):**

- **Rich filtering:** In the full tab page: by project (`+project`), context (`@context`), priority, due (overdue / today / this week / no date), completed/open; filters are combinable. Options populated from current tasks.
- **Full-text search:** Search box in the tab filters as you type over title, projects, and contexts.
- **Sorting and grouping:** Sort by priority, due date, created, completed, or title (asc/desc). Group by none, project, context, priority, or completion. Preferences persisted in `browser.storage.local` under `tabViewPrefs`. Implemented in `tab/filterSort.js` (pure logic) and `tab/tab.js` (UI and pipeline).

**Phase B – Advanced behaviour and housekeeping:**

- **Recurring todos:** Support recurrence conventions (e.g. `rec:1w`, `rec:2m`) and optional UI helpers.
- **Due dates and reminders:** First-class handling of `due:` in the tab UI; optional reminders/alarms when Thunderbird APIs allow (aligned with § 2).
- **Archiving and housekeeping:** Smarter `done.txt` handling (archiving, truncation, split by year, etc.); tools to clean or normalize tasks (e.g. merge duplicate tags, normalize priorities).
- **File watching:** Complement or replace polling so changes from external apps (sleek, CLI) are reflected quickly when the platform allows.
- **Multi-language UX:** See § 8 (locale selection, EN + ES dictionaries, sync with Thunderbird language).
- **Form-based "Add task" (Todoist-style):** A dialog or inline form to add a task without typing raw todo.txt syntax. Fields: task description (main input), **Priority** (dropdown A–Z or 1–9), **Due date** (date picker), **Threshold date** (optional start date), **Recurrence** (optional, e.g. daily/weekly/monthly), and optionally **Project** / **Context** as dropdowns or chips. A help button (?) can explain the format for power users who prefer typing. On submit, the extension builds the todo.txt line (e.g. `(A) 2025-12-01 task description +project @context due:2025-12-15`). Implementable in popup and/or tab; respects read-only mode.

All of the above must respect `AGENTS.md` (tests, complexity, no regression of current popup + file sync).

---

## 5. Planning window (backlog → calendar)

Provide a **planning view** that combines the Todo.txt backlog with a calendar, ideally inside the full tab page or as a dedicated sub-view.

- **Backlog pane:** Show all tasks **without a date** (`due:` or similar) as a backlog list, with filtering/grouping as in the main tab.
- **Calendar pane:** Day/week/month view (Thunderbird’s calendar UI when possible, or custom UI). **Drag & drop** from backlog:
  - Onto a **day (all-day)** → set/update date only (e.g. `due:YYYY-MM-DD`).
  - Onto a **time slot** → create a calendar event at that time (when APIs allow), linked to the Todo.txt item if supported.
- **Sync:** Dragging to a date updates Todo.txt; dragging to a time slot creates/updates a calendar event with clear conflict rules when APIs exist.

This depends on § 2 (calendar integration) and on the full tab page (§ 1) existing. First iteration can use a custom calendar-like UI and only `due:` dates; deeper integration with Thunderbird’s native calendar follows once stable MailExtension APIs are available.

---

## 8. Multi-language and UX improvements

### 8.1 Multi-language (EN + ES, sync with Thunderbird) — **implemented**

- **Implemented:** Added `_locales/es/messages.json` with all UI strings in Spanish; when Thunderbird language is Spanish, the extension UI uses Spanish automatically. In Options, "Display language" dropdown: "Use Thunderbird language", "English", "Español"; when a fixed language is chosen, popup, tab and options use that locale (after reopen/reload). Helper `lib/i18nHelper.js` loads the chosen locale JSON and overrides `getMessage` in popup, tab and options.
- **Goal (done):** Support English and Spanish; sync with Thunderbird locale by default; optional display language selector.

### 8.2 UX recommendations (from usability analysis) — **implemented**

**Implemented:** All 12 items: (1) empty state when no tasks match + "Reset filters" button; (2) "Task added" feedback in popup/tab; (3) loading state (Refresh/Add disabled during load); (4) sort direction labels (Asc/Desc) via i18n; (5) options hint consistency + "Saved" feedback; (6) delete button per task in popup/tab with confirm, respect read-only; (7) tab: in-place edit on double-click, popup: custom dialog instead of `prompt()`; (8) collapsible "Filters & view" + Reset filters in bar; (9) tooltips for Tab / Quick view; (10) "Showing X of Y tasks"; (11) ARIA roles, aria-label, aria-live; (12) first-run message + "Open Options" when paths not set.

Original list (for reference):

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
12. **First-run:** Friendlier empty state when paths are not set, with "Open Options to choose your todo.txt file".

### 8.3 UX inspired by sleek + filter toggles (evaluation and phases)

Ideas taken from sleek and similar UIs, with **impact (1–5) vs difficulty (1–5)** and a phased implementation proposal.

**Matrix (impact / difficulty):**

| Idea | Impact | Difficulty | Ratio |
|------|--------|------------|-------|
| Contadores en filtros (número por proyecto/prioridad/contexto) | 5 | 2 | 2.5 |
| Prioridad con color y letra (A=rojo, B, C…) | 4 | 1–2 | 2.5 |
| Icono calendario en tareas con due | 3 | 1 | 3 |
| Separadores entre tareas (líneas) | 2 | 1 | 2 |
| Botón "+" destacado para añadir tarea | 3 | 1 | 3 |
| **Toggles: completadas / due en el futuro** | **4** | **2** | **2** |
| Pills/chips de proyectos y contextos en la fila (clic = filtrar) | 4 | 3 | 1.3 |
| Filtros colapsables (Prioridad, Proyectos, etc.) | 3 | 2 | 1.5 |
| **Tooltip (?) en filtros** | **3** | **1** | **3** |
| Nombre "Todo.txt" visible en cabecera | 1–2 | 1 | 1.5 |
| Pestañas Atributos / Filtros / Ordenación | 3 | 3 | 1 |
| Toggle "Fecha umbral en el futuro" | 2–3 | 2–3* | ~1 |
| Toggle "Tareas ocultas" | 1–2* | 3* | ~0.5 |
| Flechas historial de vista (atrás/adelante) | 2 | 3 | 0.7 |

\* Threshold: requiere soporte de threshold en parser/modelo. Tareas ocultas: requiere definir y persistir "hidden".

**Filter toggles (sleek-style):** Sustituir o complementar el dropdown Status por **switches** tipo: "Tareas completadas" (mostrar/ocultar hechas), "Fecha de vencimiento en el futuro" (solo due > hoy). Opcional: "Fecha umbral en el futuro" (cuando exista `t:` en el modelo), "Tareas ocultas" (cuando se defina ese concepto). Icono **?** en opciones que necesiten explicación (tooltip con i18n).

**Phased proposal:**

- **Fase A (quick wins):** Separadores entre tareas, icono calendario en tareas con due, botón "+" destacado, prioridad con letra y color.
- **Fase B (alto impacto):** Contadores en filtros, **toggles "Tareas completadas" y "Due en el futuro"**, pills/chips en la fila con clic para filtrar.
- **Fase C:** Filtros colapsables, **tooltip (?) en filtros**, nombre "Todo.txt" en cabecera.
- **Fase D (avanzado):** Toggle "Fecha umbral" (cuando haya threshold), "Tareas ocultas" (cuando esté definido), pestañas Atributos/Filtros/Ordenación, flechas historial.

---

## 6. Repository migration (own repo)

**Goal:** Move the MailExtension to its own repository so it can be maintained, versioned and published independently from the legacy `todo.txt-ext` codebase.

**Planned steps:**

1. Create a new repository (e.g. GitHub/GitLab) containing only the `webext/` tree (and any shared docs/CI at the root).
2. Set up CI (e.g. lint, tests, optional XPI build) in the new repo.
3. Update all references: README, `manifest.json` (homepage, support URLs if any), `package.json`, links in docs and `_locales`.
4. Document the fork/migration in the new README (credits to original author, link to legacy repo if desired).
5. Optionally: publish the XPI under the new project name/ID or keep the same add-on ID for existing users; document the choice.

Can be done in parallel with or before phase 0b (legacy cleanup). Doing it early keeps the "official" history and issues in one place.

---

## 7. Legacy and dead code cleanup

**Goal:** Remove inherited and unused code so the codebase only contains what the current MailExtension uses, reducing confusion and maintenance cost.

**Planned steps:**

1. **Identify dead code:** Unused modules, experiment code paths that are never called (e.g. calendar experiment if it is no-op on TB 140), commented-out blocks, obsolete polyfills or fallbacks that are no longer needed for the minimum supported Thunderbird version.
2. **Remove or stub experiments:** If an experiment (e.g. `calendarTodoTxt`) cannot work on current TB and has no callers that affect behaviour, either remove it from the build and manifest or replace it with a minimal stub that fails gracefully and is clearly marked as "future" in the code and docs.
3. **Trim legacy leftovers:** References to the old extension structure (paths, names from `todo.txt-ext`), duplicate or unused strings in `_locales`, unused CSS or HTML fragments.
4. **Document what remains:** In README or a short CONTRIBUTING/ARCHITECTURE note, list the active parts of the codebase (background, popup, options, experiments in use) so future contributors know what is live vs. deprecated.

Recommended after or in parallel with repo migration (phase 0a). Cleanup is easier when the repo boundary is clear and the "single product" is the webext only.

---

## Summary

- **Popup** = quick view, **pending only**; "Tab" opens the **full page**.
- **Full page (tab)** = power view: all tasks, filters/search/sort/group; implemented.
- **Done:** Dual UI, filters/search/sort/group, read-only and error reporting, calendar Phase 1, multi-language (EN + ES, display language selector), §8.2 UX recommendations (empty state, feedback, loading, delete, edit, collapsible filters, tooltips, task count, a11y, first-run). **Planned:** Form-based Add task (Todoist-style) (§ 4 Phase B). **Backlog:** Calendar Phase 2, planning window, recurrence/archiving; §8.3 sleek-style and filter toggles; repo migration and legacy cleanup optional.
