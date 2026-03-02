# Todo.txt – MailExtension (Thunderbird 140+)

Extensión de **Thunderbird** para administrar archivos [todo.txt](http://todotxt.org/): tareas en texto plano, prioridades, proyectos, contextos y fechas en un archivo que tú controlas.

- **Basada en** [todo.txt extension](https://github.com/rkokkelk/todo.txt-ext) (Thunderbird extension for the Todo.txt application, por Roy Kokkelkoren).
- **Inspirada en** [sleek](https://github.com/ransome1/sleek) (interfaz limpia y moderna para todo.txt, por Robin Ahle).

**Versión 3.x** – Reescritura como WebExtension (MailExtension). **No es retrocompatible con la versión 2** (legacy XUL/XPCOM). Quienes usen la 2 deben reconfigurar rutas de archivos y preferencias al migrar a la 3.

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

- **Opciones**: Rutas para todo.txt y done.txt con el selector de archivos integrado (sin complemento externo). Opciones de comportamiento en Thunderbird, fecha de creación y visualización del título completo.
- **Popup**: Ver y editar tareas (añadir, completar, editar, actualizar).
- **Calendario (Lightning)**: El experimento intenta registrar un calendario “Todo.txt”. La integración completa depende de que Thunderbird ofrezca una API de proveedor de calendario; si no está el componente legacy XPCOM, el calendario puede no aparecer en Lightning. En builds 140 ESR (p. ej. Linux Mint `140.7.2esr`), el popup y la sincronización de archivos funcionan; la visualización de tareas en el calendario **no** está disponible por ahora.

Ver `ROADMAP.md` para reintroducir la integración con el calendario cuando existan APIs modernas de MailExtension.

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

El archivo `.xpi` quedará en `dist/` (p. ej. `dist/todotxt_3.1.0_20250302_143022.xpi`). Opción `-d` para build con logs de depuración; `-h` para ayuda.

## Estructura del proyecto

- `manifest.json` – Manifest de la extensión (TB 140, storage, options_ui, browser_action, experiment_apis).
- `background.js` – Script en segundo plano (FSA, todoclient, polling, manejadores de mensajes).
- `options/` – Página de opciones (HTML + JS).
- `popup/` – Interfaz del popup para la lista de tareas.
- `modules/` – todotxt, util, fileUtil, todoclient, logger, exception, md5.
- `lib/fsa.js` – File System Access: experimento integrado cuando está disponible, fallback opcional al proxy File Access Manager.
- `experiments/fileAccess/` – Experimento para leer/escribir todo.txt y done.txt (sin complemento externo).
- `experiments/calendarTodoTxt/` – Experimento para registrar el calendario en Lightning.
- `_locales/` – Mensajes en en, de, fr.
- `icons/` – Iconos 16, 32, 48 px.
- `dist/` – Salida de builds (archivos .xpi); no se versiona (véase `.gitignore`).

## Referencias

| Recurso | Enlace |
|--------|--------|
| **Todo.txt** (formato y filosofía) | http://todotxt.org/ |
| **todo.txt extension** (extensión Thunderbird original) | https://github.com/rkokkelk/todo.txt-ext |
| **sleek** (GUI moderna para todo.txt) | https://github.com/ransome1/sleek |

## Licencia

MPL 2.0 (igual que la extensión original).
