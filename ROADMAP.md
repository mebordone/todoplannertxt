# Todo.txt MailExtension – Roadmap

This document outlines planned and potential future work for the Todo.txt MailExtension. Features are grouped by **version** and by **packages of value** (epics/tasks) so the development team has a clear, incremental work plan. Each package includes acceptance criteria and suggested order; the recommended order of implementation is in the table below.

---

## 1. Recommended order of implementation (future work only)

Implemented milestones and details have been moved to `CHANGELOG.md`.  
Versión actual publicada: **3.6.3** (adecuación para publicación + mejoras de UX en tab). La tabla asigna **fases próximas** a **versiones 3.6, 3.7, 3.8**, según la visión de producto (planner centrado en UX, 70% UX / 30% features, week planner después).

| Version | Phase | Focus | Status |
|---------|--------|--------|--------|
| **3.5** | 8 | UX polish & daily planner basics (vista "hoy", backlog sin fecha/semanal ligero, quick wins visuales) | **Implemented** (ver `CHANGELOG.md`) |
| **3.6** | — | Adecuación para primera publicación (manifest, i18n DE/FR, docs, permisos) | **Implemented** (esta release) |
| **3.7** | 9 | Ampliaciones del formulario de tarea (recurrence, threshold, etc.); base ya en 3.6.1 ("Añadir con formulario") | Planned |
| **3.8** | 10 | Week planner & Calendar Phase 2 (backlog → semana → día/hora con calendario) | Backlog |

El resto del documento está ordenado por este plan: primero 3.5 (Phase 8), luego 3.6 (adecuación publicación), luego 3.7 (Phase 9), luego 3.8 (Phase 10).

---

## Version 3.5 – Phase 8: UX polish & daily planner basics ✅ (implementado)

**Objetivo de la release:** Mejorar la experiencia diaria (legibilidad, vista "Hoy", backlog básico) sin tocar aún el week planner ni el calendario avanzado. Entregas incrementales por paquete de valor.

**Estado:** Completado. Detalle en `CHANGELOG.md` (Version 3.5). Paquetes 3.5-A, 3.5-B y 3.5-C implementados; toolbar, opciones y descripción de la extensión actualizados.

---

### 3.5-A. Quick wins de legibilidad (listas)

**Objetivo:** Que en un vistazo se vea prioridad, vencimiento y la acción principal "añadir".

| # | Tarea | Detalle | Dónde |
|---|--------|---------|--------|
| A1 | Prioridad visible con color/letra | Mostrar prioridad (A, B, C…) con color (ej. A = más destacado). Misma lógica en popup y tab. | Popup + Tab |
| A2 | Vencimiento + icono calendario | Si la tarea tiene `due:`, mostrar fecha y/o un icono de calendario. Reutilizar `tab_meta_priority` / `tab_meta_due` donde aplique; en popup añadir al menos prioridad e icono cuando exista `due:`. | Popup + Tab |
| A3 | Botón "Añadir" como acción primaria | Estilo primario (color/contraste) para el botón "+" / "Añadir" en toolbar; que sea la acción obvia. | Popup + Tab |
| A4 | Separadores y contraste en filas | Líneas o separadores suaves entre tareas; leve contraste extra (color/borde) para filas con prioridad alta o vencidas. Solo estilo, sin lógica nueva. | Tab (popup opcional) |

**Criterios de aceptación:** El usuario ve prioridad y vencimiento sin abrir la tarea; el botón de añadir destaca; las filas se distinguen visualmente (separadores y resalte de urgentes/vencidas).

---

### 3.5-B. Flujo diario "Hoy" y preferencias de vista

**Objetivo:** Un atajo "Hoy", un resumen de tareas para hoy/vencidas y poder elegir con qué vista se abre el tab.

| # | Tarea | Detalle | Dónde |
|---|--------|---------|--------|
| B1 | Vista/atajo "Hoy" | Botón o atajo que aplique: **Vencimiento = Hoy**, **Estado = Abiertas**, orden por vencimiento. Persistir como vista guardada en `tabViewPrefs` si aplica. | Tab (popup opcional) |
| B2 | Indicadores "hoy" y "vencidas" | Encima de la lista, texto tipo: "N tareas vencen hoy · M vencidas". Enlaces que apliquen los filtros correspondientes al hacer clic. Los números se calculan sobre la lista actual (sin nuevos datos). | Tab (popup opcional) |
| B3 | Preferencia "Vista por defecto" | Opción (en Opciones o en la barra del tab) para elegir con qué filtros se abre la vista completa: p.ej. "Todas", "Solo hoy", "Hoy + sin fecha". Guardar preset en `tabViewPrefs`. | Tab + Options |

**Opcional para 3.5 (si hay capacidad):** Toggles tipo switch para "Tareas completadas" (mostrar/ocultar) y "Due en el futuro" (solo due > hoy); contadores en los desplegables de filtro (número por proyecto/contexto/prioridad); tooltip (?) en filtros que necesiten explicación (i18n).

**Criterios de aceptación:** Un clic lleva a "solo lo de hoy"; el usuario ve cuántas vencen hoy y cuántas vencidas; puede elegir la vista por defecto al abrir el tab.

---

### 3.5-C. Backlog sin fecha y backlog semanal (preparación para 3.8)

**Objetivo:** Exponer en el tab las tareas sin fecha y un subconjunto "esta semana", sin UI de calendario ni drag & drop (eso va en 3.8).

| # | Tarea | Detalle | Dónde |
|---|--------|---------|--------|
| C1 | Vista "Backlog" (sin fecha) | Vista o filtro que muestre solo tareas **sin** `due:`. Misma barra de filtros/agrupación que el tab actual (p.ej. agrupar por proyecto). | Tab |
| C2 | Backlog semanal (lista simple) | Posibilidad de marcar o seleccionar un subconjunto de tareas como "para esta semana". Representación mínima (lista o checkbox/tag); sin asignar día/hora ni arrastrar. Preparar modelo/datos para que 3.8 reutilice (backlog semanal → día/hora). | Tab |

**Criterios de aceptación:** Se puede ver solo el backlog sin fecha; se puede definir un conjunto "esta semana" de forma simple; no se implementa aún calendario semanal ni DnD.

---

### Fuera de alcance 3.5 (3.8 o posterior)

- Reorganización de Opciones en secciones/pestañas (Archivos, Comportamiento, Calendario, Apariencia/Idioma).
- Selector "Agrupar por defecto" / "Ordenar por defecto" en Opciones.
- Copys "planificador" / "Vista completa / organizar tareas" (si implica reestructura de navegación, 3.8).
- Pills/chips en la fila de tarea con clic para filtrar.
- Pestañas Atributos / Filtros / Ordenación, flechas historial de vista, toggles "Fecha umbral" / "Tareas ocultas" (dependen de modelo o más UX; 3.8+).

---

### Referencia: matriz impacto/dificultad (sleek)

Para priorización fina dentro de 3.5-A y 3.5-B. No duplica ítems ya listados arriba; sirve para ordenar tareas o dejar algo para 3.8.

| Idea | Impacto | Dificultad | Asignación |
|------|---------|------------|------------|
| Contadores en filtros | 5 | 2 | Opcional 3.5 |
| Prioridad color/letra | 4 | 1–2 | 3.5-A |
| Icono calendario en tareas con due | 3 | 1 | 3.5-A |
| Separadores entre tareas | 2 | 1 | 3.5-A |
| Botón "+" destacado | 3 | 1 | 3.5-A |
| Toggles completadas / due futuro | 4 | 2 | Opcional 3.5 |
| Pills/chips (clic = filtrar) | 4 | 3 | 3.8 |
| Filtros colapsables (por tipo) | 3 | 2 | 3.8 |
| Tooltip (?) en filtros | 3 | 1 | Opcional 3.5 |
| Nombre "Todo.txt" en cabecera | 1–2 | 1 | 3.8 |
| Toggle "Fecha umbral" / "Tareas ocultas" | 2 | 3 | 3.8+ (requiere modelo) |

---

## Version 3.6 – Adecuación para primera publicación

**Objetivo:** Preparar la extensión para la primera publicación en addons.thunderbird.net (manifest, ID, browser_specific_settings, strict_max_version, idiomas DE/FR en Opciones, documento de textos para el formulario, permisos Experiment APIs, PUBLISHING.md). **Estado:** Implementado con esta release.

---

## Version 3.7 – Phase 9: Form-based "Add task" (ampliaciones)

En 3.6.1 se añadió "Añadir con formulario" en el tab (modal con título, prioridad, fecha, proyectos, contextos). Esta fase amplía el formulario y el flujo (recurrence, threshold, etc.). Encajar con la vista "Hoy" y el backlog básico de 3.5 (añadir tareas a hoy, a la semana o al backlog sin fecha).

### 3.7.1 Form-based "Add task" (detalle)

Parte de la paridad con sleek / Phase B de feature parity; ver [sleek](https://github.com/ransome1/sleek). Campos propuestos:

- **Task description** (entrada principal).
- **Priority** (dropdown A–Z o 1–9).
- **Due date** (date picker).
- **Threshold date** (opcional, fecha de inicio).
- **Recurrence** (opcional, p. ej. diario/semanal/mensual).
- **Project / Context** (dropdowns o chips).

Un botón de ayuda (?) puede explicar el formato todo.txt para usuarios avanzados. Al enviar, la extensión construye la línea todo.txt (p. ej. `(A) 2025-12-01 task description +project @context due:2025-12-15`). Implementable en popup y/o tab; respeta modo solo lectura.

**Otros ítems Phase B (no obligatorios en 3.7):** Recurring todos, due/reminders first-class, archiving/housekeeping de done.txt, file watching (ya implementado o complementar). Se pueden dejar para 3.8 o releases posteriores.

Todo debe respetar `AGENTS.md` (tests, complejidad, sin regresión de popup + file sync).

---

## Version 3.8 – Phase 10: Week planner & Calendar Phase 2

Convertir la experiencia en un **planner semanal**: backlog por proyecto → backlog semanal → asignar día (y opcionalmente día+hora); ver eventos del calendario para evitar solapamientos.

### 3.8.1 Calendar integration — Phase 2

Phase 1 está implementada (ver `CHANGELOG.md`). Phase 2 incluye:

- Resolución de conflictos más rica (p. ej. timestamps), mapeo opcional de recurrencia, mejoras de UX/rendimiento cuando la Experiment API esté estable.

### 3.8.2 Planning window (backlog → calendar / week planner)

Vista de **planificación** que combine backlog Todo.txt con calendario/semana:

- **Backlog pane:** Todas las tareas sin fecha como backlog, separado por proyecto; filtros/agrupación como en el tab. Vista de "backlog semanal" seleccionable (las que quiero hacer esta semana).
- **Vista semana/día:** Vista tipo semana (o día/semana/mes cuando sea posible con la UI de Thunderbird o custom). **Drag & drop** desde backlog semanal:
  - A un **día (all-day)** → asignar/actualizar solo fecha (`due:YYYY-MM-DD`).
  - A un **bloque día+hora** → asignar día y hora (y cuando las APIs lo permitan, crear evento en calendario enlazado al ítem Todo.txt).
- **Eventos del calendario visibles** en la misma vista para no superponer actividades; reutilizar lo que ya ofrece Thunderbird (Lightning).
- **Sync:** Arrastrar a fecha actualiza todo.txt; arrastrar a slot puede crear/actualizar evento de calendario con reglas claras cuando existan las APIs.

Depende de la integración con calendario y del full tab existente. Primera iteración puede usar una UI tipo calendario propia y solo fechas `due:`; integración más profunda con el calendario nativo de Thunderbird cuando las MailExtension APIs estén estables. Antes de implementar a fondo, tiene sentido un **spike de usabilidad y diseño** (pantallas, flexibilidad de ventanas/pestañas en Thunderbird, reutilización de bloques).

### 3.8.3 Bloque C de UX (si no se hizo en 3.5)

Si la reorganización de Opciones, ajustes por defecto de agrupación/orden y copys de planificación no se cerraron en 3.5, completarlos aquí.

---

## 6. Repository migration (own repo) — implementado

Ver `CHANGELOG.md` (Phase 0a). Se mantiene aquí como referencia opcional para otros repos.

---

## 7. Legacy and dead code cleanup — implementado

Ver `CHANGELOG.md` (Phase 0b). Se mantiene aquí como referencia opcional.

---

## Summary

- **Versión actual publicada:** 3.6.3. Lo implementado hasta 3.5 está en `CHANGELOG.md`; adecuación 3.6, mejoras 3.6.1, pulido 3.6.2 y 3.6.3 en este release.
- **Roadmap por versión:**
  - **3.5 (Phase 8):** ✅ Implementado — UX polish y bases del daily planner (vista "Hoy", backlog sin fecha/semanal ligero, quick wins visuales).
  - **3.6:** ✅ Implementado — Adecuación para primera publicación en addons.thunderbird.net.
  - **3.6.1:** ✅ Implementado — Mejoras tab: toolbar (Todas/Sin planificar/Esta semana/Hoy), agrupar por día, grupos plegables, edición completa por modal, "Añadir con formulario", completar sin recarga, id determinista (MD5), vista semana vacía, conservar vista al cambiar agrupación/orden. Ver `CHANGELOG.md`.
  - **3.6.2:** ✅ Implementado — Pulido: descripción corta en Detalles (sin HTML), tooltip del icono localizado, docs y fallback del botón Sin planificar. Ver `CHANGELOG.md`.
  - **3.6.3:** ✅ Implementado — Añadir según vista (Hoy → due hoy, Esta semana → flag semanal), opción inicio de semana (Lunes/Domingo), vista Esta semana = flag + due en semana, toolbar fija, fix weekRange IIFE, fix Agrupar por Ninguno. Ver `CHANGELOG.md`.
  - **3.7 (Phase 9):** Ampliaciones del formulario de tarea (recurrence, threshold, etc.).
  - **3.8 (Phase 10):** Week planner y Calendar Phase 2 (backlog → semana → día/hora, eventos de calendario visibles, drag & drop).
