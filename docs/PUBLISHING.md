# Publicar en addons.thunderbird.net

Checklist y notas para publicar Todo.txt MailExtension (todoplannertxt) en el directorio oficial de complementos de Thunderbird.

---

## 1. Cambios ya aplicados en el proyecto

- **Add-on ID:** `todo.txt.planner@mebordone.com.ar` (único; no reutiliza el ID del complemento original de Roy Kokkelkoren).
- **Autor y homepage:** Matías Bordone; URL del desarrollador apuntando a este repositorio.
- **Descripción y resumen:** Textos en `_locales` (`extensionDescription`, `extensionSummary`) listos para la ficha en la tienda.
- **Textos listos para copiar y pegar en el formulario de alta:** [docs/SUBMISSION-FORM-TEXTS.md](SUBMISSION-FORM-TEXTS.md).

---

## 2. Recomendaciones antes de publicar

### 2.1 Licencia

- Existe archivo **LICENSE** en la raíz (MPL 2.0).
- En la ficha de addons.thunderbird.net, seleccionar **Mozilla Public License 2.0**.

### 2.2 Aclarar que el código es nuevo

En el README ya se indica que está “inspirado en” / “basado en” la extensión original. Para la tienda y para revisores conviene dejar claro:

- **Inspiración:** La idea y el formato todo.txt vienen de la [extensión original](https://github.com/rkokkelk/todo.txt-ext) (Roy Kokkelkoren) y de [sleek](https://github.com/ransome1/sleek).
- **Código:** Implementación desarrollada de cero como MailExtension (WebExtension) para Thunderbird 140+; no es un fork del código legacy (XUL/XPCOM).

Puedes usar el texto siguiente en “Notes for reviewers” (ver sección 4).

### 2.3 Privacidad y permisos

- La extensión **no recopila datos**, no usa analytics ni telemetría.
- **Permisos:** `storage` (preferencias locales), `tabs` (abrir pestaña de opciones/vista completa).
- **Archivos:** Acceso solo a los archivos todo.txt/done.txt que el usuario elige en Opciones (API de experimento integrada en Thunderbird; no se envían a ningún servidor).

Si addons.thunderbird.net ofrece un campo tipo “Privacy policy”, puedes indicar: “This add-on does not collect or transmit any personal data. All data stays on the user’s device.”

### 2.4 Soporte y código fuente

- **Support URL:** Por ejemplo `https://github.com/mebordone/todoplannertxt/issues`.
- **Source code URL:** `https://github.com/mebordone/todoplannertxt` (recomendado para aprobación y confianza).

### 2.5 Build para producción

- Generar el .xpi con `./build.sh` (sin la opción `-d`).
- Subir ese .xpi en “Submit a New Add-on” o “Nueva versión”.

### 2.6 Experiment APIs

La extensión usa **Experiment APIs** de Thunderbird para:

- Acceso a archivos locales (todo.txt / done.txt) sin complementos extra.
- Integración opcional con el calendario (Lightning).

Son APIs documentadas y permitidas para complementos; no es código ofuscado ni minificado. Al usar Experiment APIs, Thunderbird mostrará en la instalación el permiso único **“Have full, unrestricted access to Thunderbird, and your computer”**; es el comportamiento esperado y no implica recolección de datos. En “Notes for reviewers” incluye esta aclaración y el texto sugerido (ver sección 4 y [SUBMISSION-FORM-TEXTS.md](SUBMISSION-FORM-TEXTS.md)).

---

## 3. Checklist rápido

- [ ] Cuenta en addons.thunderbird.net (Mozilla Account).
- [ ] Add-on ID en manifest: `todo.txt.planner@mebordone.com.ar`.
- [ ] Build de producción: `./build.sh` (sin `-d`).
- [ ] Subir el .xpi generado en `dist/`.
- [ ] Completar ficha: resumen (`extensionSummary`), descripción, categoría, licencia MPL 2.0.
- [ ] Support URL y Source code URL (repositorio).
- [ ] “Notes for reviewers” (texto sugerido abajo).
- [ ] Política de privacidad: “No data collection” si el formulario lo pide.
- [ ] Screenshots: ver subsección “Screenshots para la ficha” más abajo o [SUBMISSION-FORM-TEXTS.md](SUBMISSION-FORM-TEXTS.md).

### Screenshots para la ficha

Subir 2–4 capturas en la página del complemento: (1) Popup con tareas, (2) Vista completa con filtros, (3) Opciones “Para empezar”, (4) opcional sintaxis o calendario. Detalle y recomendaciones en [SUBMISSION-FORM-TEXTS.md](SUBMISSION-FORM-TEXTS.md) (sección Screenshots).

---

## 4. Notas para revisores (inglés)

Puedes copiar y pegar este texto en el campo **“Notes for reviewers”** al enviar el complemento:

```
This add-on is a from-scratch implementation of a Todo.txt manager for Thunderbird 140+, inspired by the original "Todo.txt extension" by Roy Kokkelkoren (https://github.com/rkokkelk/todo.txt-ext). The codebase is not a fork of that project; it is a new MailExtension (WebExtension) using the same file format (todo.txt) and UX ideas.

Features:
- Popup and full-tab UI; local file access for todo.txt/done.txt via Thunderbird's built-in experiment API (no external add-ons required).
- Optional calendar (Lightning) integration via experiment APIs for tasks with due dates.
- No telemetry, no analytics, no data sent to any server. All data stays on the user's device.

The add-on uses Experiment APIs for: (1) file system access to user-chosen todo.txt/done.txt paths, (2) optional calendar sync. Because it uses Experiment APIs, the store will show the single permission "Have full, unrestricted access to Thunderbird, and your computer" during install; this is expected and does not imply data collection. Source code is readable and available at the repository URL. License: MPL 2.0.
```

*(Texto completo actualizado en [SUBMISSION-FORM-TEXTS.md](SUBMISSION-FORM-TEXTS.md).)*

---

## 5. Referencias

- [Add-ons Thunderbird – Developers](https://addons.thunderbird.net/en-US/developers/)
- [Extension Workshop – Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Thunderbird Developer Hub](https://developer.thunderbird.net/add-ons/about-add-ons)
