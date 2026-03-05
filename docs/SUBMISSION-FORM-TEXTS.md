# Textos para el formulario de alta en addons.thunderbird.net

Usa estos textos al completar la ficha del complemento (Submit a New Add-on / Describe your add-on). Copia y pega en cada campo según el nombre indicado.

---

## Nombre del complemento (Add-on name)

```
Todo.txt Planner
```

*(Si el formulario toma el nombre del manifest, no hace falta rellenarlo; el manifest ya tiene el nombre localizado.)*

---

## Resumen corto (Summary) — una línea, para listados y búsqueda

**EN (recomendado para la tienda):**
```
Manage todo.txt from Thunderbird: tasks, priorities, projects and due dates in plain text.
```

**ES (si el formulario permite elegir idioma de la ficha):**
```
Gestiona todo.txt desde Thunderbird: tareas, prioridades, proyectos y fechas en texto plano.
```

---

## Descripción (Description) — texto largo para la página del complemento

Usa uno de los dos formatos según lo que acepte el formulario de addons.thunderbird.net. Si el campo permite HTML, pega la versión HTML para que la ficha y la ventana «Detalles» (tras instalar desde la tienda) se vean con párrafos y viñetas. Si solo acepta texto plano, pega la versión «Texto plano».

**EN — Versión HTML (si el formulario acepta HTML):**
```html
<p>Thunderbird extension to manage todo.txt files: plain-text tasks, priorities, projects, contexts and due dates in a file you control.</p>

<p>Based on the original Todo.txt extension by Roy Kokkelkoren. Version 3.x is a full rewrite as a MailExtension for Thunderbird 140+ and is not backward compatible with v2.</p>

<p><strong>Planning workflow:</strong> Capture ideas as unplanned tasks (no due date). Use "Add to week" to select which tasks you want to do this week. In the "This week" view, undated or overdue tasks appear at the top; below, tasks are grouped by day so you can assign due dates and plan your week.</p>

<ul>
<li><strong>No extra add-ons:</strong> Built-in file access for todo.txt and done.txt. After install, open Options → Browse to select your files.</li>
<li><strong>Popup:</strong> Quick view from the toolbar; add, complete and edit tasks.</li>
<li><strong>Full tab view:</strong> Filters, Today, Overdue, This week, Unplanned, sort by due date or priority.</li>
<li><strong>Options:</strong> File paths, behaviour, optional Calendar (Lightning) integration for tasks with due dates.</li>
<li><strong>Todo.txt syntax:</strong> Priorities (A)(B)(C), projects +name, contexts @name, due:YYYY-MM-DD.</li>
</ul>
```

**EN — Texto plano (si el campo no acepta HTML):**
```
Thunderbird extension to manage todo.txt files: plain-text tasks, priorities, projects, contexts and due dates in a file you control.

Based on the original Todo.txt extension by Roy Kokkelkoren. Version 3.x is a full rewrite as a MailExtension for Thunderbird 140+ and is not backward compatible with v2.

Planning workflow: capture ideas as unplanned tasks (no due date). Use "Add to week" to select which tasks you want to do this week. In the "This week" view, undated or overdue tasks appear at the top; below, tasks are grouped by day so you can assign due dates and plan your week.

• No extra add-ons: built-in file access for todo.txt and done.txt. After install, open Options → Browse to select your files.
• Popup: quick view from the toolbar; add, complete and edit tasks.
• Full tab view: filters, Today, Overdue, This week, Unplanned, sort by due date or priority.
• Options: file paths, behaviour, optional Calendar (Lightning) integration for tasks with due dates.
• Full Todo.txt syntax: priorities (A)(B)(C), projects +name, contexts @name, due:YYYY-MM-DD.
```

**ES — Versión HTML (si el formulario acepta HTML):**
```html
<p>Extensión de Thunderbird para gestionar archivos todo.txt: tareas en texto plano, prioridades, proyectos, contextos y fechas en un archivo que tú controlas.</p>

<p>Basada en la extensión original Todo.txt de Roy Kokkelkoren. La versión 3.x es una reescritura completa como MailExtension para Thunderbird 140+ y no es compatible con la v2.</p>

<p><strong>Flujo de planificación:</strong> Captura ideas como tareas sin planificar (sin fecha). Usa «Añadir a la semana» para elegir qué tareas quieres hacer esta semana. En la vista «Esta semana», las sin fecha o vencidas aparecen arriba; abajo se agrupan por día para asignar fechas y planificar.</p>

<ul>
<li><strong>Sin complementos extra:</strong> Acceso integrado a todo.txt y done.txt. Tras instalar, abre Opciones → Examinar para elegir tus archivos.</li>
<li><strong>Popup:</strong> Vista rápida desde la barra; añadir, completar y editar tareas.</li>
<li><strong>Vista en pestaña:</strong> Filtros, Hoy, Vencidas, Esta semana, Sin planificar, ordenar por fecha o prioridad.</li>
<li><strong>Opciones:</strong> Rutas de archivos, comportamiento, integración opcional con Calendario (Lightning) para tareas con fecha.</li>
<li><strong>Sintaxis Todo.txt:</strong> Prioridades (A)(B)(C), proyectos +nombre, contextos @nombre, due:AAAA-MM-DD.</li>
</ul>
```

**ES — Texto plano (si el campo no acepta HTML):**
```
Extensión de Thunderbird para gestionar archivos todo.txt: tareas en texto plano, prioridades, proyectos, contextos y fechas en un archivo que tú controlas.

Basada en la extensión original Todo.txt de Roy Kokkelkoren. La versión 3.x es una reescritura completa como MailExtension para Thunderbird 140+ y no es compatible con la v2.

Flujo de planificación: captura ideas como tareas sin planificar (sin fecha). Usa «Añadir a la semana» para elegir qué tareas quieres hacer esta semana. En la vista «Esta semana», las sin fecha o vencidas aparecen arriba; abajo se agrupan por día para asignar fechas y planificar.

• Sin complementos extra: acceso integrado a todo.txt y done.txt. Tras instalar, abre Opciones → Examinar para elegir tus archivos.
• Popup: vista rápida desde la barra; añadir, completar y editar tareas.
• Vista en pestaña: filtros, Hoy, Vencidas, Esta semana, Sin planificar, ordenar por fecha o prioridad.
• Opciones: rutas de archivos, comportamiento, integración opcional con Calendario (Lightning) para tareas con fecha.
• Sintaxis Todo.txt: prioridades (A)(B)(C), proyectos +nombre, contextos @nombre, due:AAAA-MM-DD.
```

---

## Notas para revisores (Notes for reviewers)

```
This add-on is a from-scratch implementation of a Todo.txt manager for Thunderbird 140+, inspired by the original "Todo.txt extension" by Roy Kokkelkoren (https://github.com/rkokkelk/todo.txt-ext). The codebase is not a fork of that project; it is a new MailExtension (WebExtension) using the same file format (todo.txt) and UX ideas.

Features:
- Popup and full-tab UI; local file access for todo.txt/done.txt via Thunderbird's built-in experiment API (no external add-ons required).
- Optional calendar (Lightning) integration via experiment APIs for tasks with due dates.
- No telemetry, no analytics, no data sent to any server. All data stays on the user's device.

The add-on uses Experiment APIs for: (1) file system access to user-chosen todo.txt/done.txt paths, (2) optional calendar sync. Because it uses Experiment APIs, the store will show the single permission "Have full, unrestricted access to Thunderbird, and your computer" during install; no other permission prompts are shown. This is expected and does not imply data collection. Source code is readable and available at the repository URL. License: MPL 2.0.
```

---

## Política de privacidad / Privacy (si el formulario pide declaración o URL)

**Si pide un texto corto:**
```
This add-on does not collect or transmit any personal data. All data stays on the user's device.
```

**Si pide una URL:** puedes usar la misma frase en una página del repo (p. ej. README o GitHub Pages) y poner esa URL.

---

## Licencia (License)

Seleccionar: **Mozilla Public License 2.0** (MPL 2.0).

---

## Support URL (URL de soporte)

```
https://github.com/mebordone/todoplannertxt/issues
```

---

## Support email (si lo pide)

mebordone@gmail.com

---

## Source code URL (si lo pide)

```
https://github.com/mebordone/todoplannertxt
```

---

## Categoría (Categories)

Elegir la que mejor encaje, por ejemplo **Productivity** (si existe en Thunderbird). Revisar en el propio formulario las opciones disponibles.

---

## Checklist rápido al rellenar el formulario

- [ ] Summary: texto EN (una línea).
- [ ] Description: pegar versión HTML (EN o ES) si el formulario acepta HTML; si no, versión texto plano (párrafos y viñetas arriba).
- [ ] Notes for reviewers: bloque completo EN.
- [ ] Privacy: "This add-on does not collect..." (o URL si pide).
- [ ] License: MPL 2.0.
- [ ] Support URL: `https://github.com/mebordone/todoplannertxt/issues`
- [ ] Source code URL: `https://github.com/mebordone/todoplannertxt`
- [ ] Categoría: p. ej. Productivity.
- [ ] Subir .xpi desde `dist/` (generado con `./build.sh` sin `-d`).

---

## Screenshots para la ficha en addons.thunderbird.net

Subir 2–4 capturas en la página del complemento (Add-on listing). Orden sugerido:

1. **Popup** — Ventana del popup con varias tareas (prioridad y vencimiento visibles), barra de herramientas y botón "Vista completa".
2. **Vista completa (tab)** — Pestaña con filtros (Hoy, Vencidas, Esta semana, Sin planificar), barra de filtros desplegable y lista de tareas.
3. **Opciones** — Página de Opciones mostrando el bloque "Para empezar" (Elegir carpeta / Seleccionar todo.txt) o las rutas ya configuradas.
4. **Opcional:** Vista con sintaxis todo.txt desplegada (tab) o integración calendario en Opciones.

**Recomendaciones:** resolución mínima 1280px de ancho para vistas amplias; formato PNG o JPEG; sin datos personales reales en las capturas.
