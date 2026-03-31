# Todo.txt MailExtension – Roadmap

This document outlines **planned** work for the Todo.txt MailExtension. **Shipped milestones** (3.5 through 3.6.4) are summarized in [CHANGELOG.md](CHANGELOG.md); they are not repeated here.

---

## Current release

**Versión actual publicada:** **3.6.4** — ver [CHANGELOG.md](CHANGELOG.md) (Version 3.6.4 en adelante y releases anteriores: 3.6.3, 3.6, 3.6.1, 3.6.2, Phase 8 / Version 3.5, etc.).

---

## Recommended order of implementation (future only)

| Version | Phase | Focus | Status |
|---------|--------|--------|--------|
| **3.7** | 9 | Ampliaciones del formulario de tarea (recurrence, threshold, etc.); base ya en 3.6.1 ("Añadir con formulario") | Planned |
| **3.8** | 10 | Week planner & Calendar Phase 2 (backlog → semana → día/hora con calendario, DnD cuando sea posible) | Backlog |

---

## Version 3.7 – Phase 9: Form-based "Add task" (ampliaciones)

En 3.6.1 se añadió "Añadir con formulario" en el tab (modal con título, prioridad, fecha, proyectos, contextos). Esta fase amplía el formulario y el flujo (recurrence, threshold, etc.). Encajar con la vista "Hoy" y el backlog básico ya descrito en `CHANGELOG.md` (Phase 8 / 3.5).

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

### 3.8.3 Bloque C de UX (pendiente si aplica)

Ideas que no entran en 3.7: reorganización de Opciones en secciones/pestañas; selector "Agrupar/ordenar por defecto" en Opciones; pills/chips en fila de tarea con clic para filtrar; filtros colapsables por tipo; toggles fecha umbral / tareas ocultas cuando el modelo lo permita. Priorizar según feedback tras 3.7.

---

## Repository migration and legacy cleanup (done)

Migración a repo propio (Phase 0a) y limpieza de código heredado (Phase 0b): **implementado** — ver [CHANGELOG.md](CHANGELOG.md) (Phase 0a–0b).
