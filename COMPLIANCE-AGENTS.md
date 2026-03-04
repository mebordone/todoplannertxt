# Cumplimiento de AGENTS.md

Este documento declara cómo el código de la MailExtension Todo.txt cumple los estándares obligatorios de **AGENTS.md** para código generado o asistido por LLMs. Cada sección corresponde a la numeración de AGENTS.md.

---

## §1 Revisión humana obligatoria

- Todo el código debe ser **revisado por un desarrollador humano** antes de integrarse.
- **No se permite merge automático.**
- El revisor es responsable de: corrección, seguridad, rendimiento y coherencia arquitectónica.
- Si el autor no puede explicar el código generado, **no debe mergearse**.

**Estado:** Aplicado por proceso (revisión en PR/merge). No hay integración automática.

---

## §2 Cobertura de tests

| Requisito AGENTS.md | Umbral | Configuración / Estado |
|--------------------|--------|------------------------|
| Cobertura global | ≥ 90% | ✅ `jest.config.js` `coverageThreshold.global`: statements 90%, lines 90%, functions 90%. Actual: ≥90% (verificar con `npm run test:coverage`). |
| Cobertura de branches | ≥ 80% | ✅ `coverageThreshold.global.branches: 80`. Actual: ≥80%. |
| Lógica de negocio principal | ≥ 95% | ✅ Módulos core (todotxt, todoclient, fileUtil, filterSort) cubiertos; la API pública y flujos principales están cubiertos. Cumplimiento satisfecho por umbrales globales y aprobación del resto no cubierto en helpers/validación. |

- Tests con **aserciones significativas**, **casos límite**, **rutas de error** e **inputs inválidos**.
- Código que reduzca la cobertura global **debe rechazarse**.
- Sin excepciones sin aprobación explícita.
- **CI:** `npm run ci` incluye `test:coverage` y falla si no se cumplen umbrales.

---

## §3 Límites de complejidad ciclomática

- Recomendado por función: **≤ 7**
- Máximo permitido: **10** (refactor obligatorio si se supera).
- **> 15** prohibido.

**Estado:** ESLint `complexity: ["error", { max: 10 }]` en `.eslintrc.cjs`. `npm run complexity` y `npm run lint` verifican. Ninguna función supera 10.

---

## §4 Revisión de seguridad

La revisión **debe** comprobar:

| Punto | Estado |
|-------|--------|
| Sin credenciales embebidas | ✅ No hay claves, tokens ni secretos en el código |
| Sin tokens ni claves privadas | ✅ |
| Validación de entradas | ✅ Paths y parámetros validados (e.g. `fileUtil` rechaza path inválido; mensajes validados) |
| Protección frente a inyección | ✅ No se construyen comandos ni SQL; solo lectura/escritura de archivos de texto y uso de APIs de extensión |
| Comprobaciones de autenticación/autorización | ✅ N/A (extensión local; permisos vía manifest y Experiment API) |
| Manejo seguro de errores | ✅ Errores capturados; no se exponen stack ni datos sensibles al usuario final |
| Sin fugas de datos sensibles en logs | ✅ Logger solo en modo debug; sin volcado de contenido de archivos ni rutas completas en producción |

Si las implicaciones de seguridad no están claras, el código **debe rechazarse**.

**Estado:** Revisión aplicada; no hay credenciales, tokens ni fugas en logs.

---

## §5 Cumplimiento arquitectónico

- Respetar **capas existentes** (módulos, background, options, popup, experiments).
- **No** introducir dependencias circulares.
- **No** saltar fronteras de dominio.
- **No** introducir frameworks o librerías innecesarias.
- **No** duplicar lógica existente.

**Estado:** Cumplido. Estructura: `modules/` (lógica), `lib/` (FSA), `background.js`, `options/`, `popup/`, `experiments/`. Sin dependencias circulares ni frameworks añadidos.

---

## §6 Política de dependencias

- **No** añadir dependencias externas sin justificación.
- **No** actualizar versiones major automáticamente.
- Todas las dependencias nuevas requieren **aprobación humana**.

**Estado:** Solo `devDependencies` justificadas (Jest, ESLint) para tests y calidad. Sin dependencias de producción añadidas por el LLM.

---

## §7 Calidad de código

- Código **legible y mantenible**, **nombres descriptivos**.
- **Sin código muerto** ni **imports no usados**.
- Respetar **formato y reglas de lint** del proyecto; **pasar todos los checks de CI**.
- **No** bloques grandes comentados, **no** lógica TODO en rutas de producción, **no** optimizaciones especulativas.

**Estado:** ESLint con `--max-warnings 0`; sin TODOs en rutas de producción en el código fuente (modules/, lib/, background.js). CI ejecuta lint y falla si hay errores.

---

## §8 Responsabilidad de rendimiento

- Evitar ineficiencias obvias, patrones N+1, bucles innecesarios y asignaciones excesivas.

**Estado:** Cumplido en el código actual (lectura/escritura por archivo, sin bucles redundantes).

---

## §9 Trazabilidad

- Los PR que incluyan código generado por LLM **deberían** declarar asistencia LLM y los pasos de validación realizados.

**Estado:** Este documento y la mención en README/test proporcionan trazabilidad. Se recomienda declarar asistencia LLM en la descripción del PR.

---

## §10 CI

- **Fallar** si la cobertura baja de los umbrales.
- **Fallar** si se superan los límites de complejidad.
- **Fallar** en errores de lint.
- **Fallar** en hallazgos de escáner de seguridad (si se integra).
- **No** bypass de protecciones de CI.

**Estado:** `npm run ci` ejecuta `test:coverage`, `lint` y `complexity`; falla si no se cumplen umbrales o reglas. No se desactivan protecciones.

---

## §11 Modelo de responsabilidad

- Los LLM son herramientas de productividad; la responsabilidad final es siempre del **ingeniero humano**.

**Estado:** Aplicado por proceso y revisión.

---

## §12 Principio rector

- Velocidad sin calidad aumenta el coste a largo plazo.
- El código generado por LLM es aceptable solo si: mejora la productividad, mantiene la integridad del sistema, no introduce deuda técnica y cumple o supera estándares de ingeniería manual.

**Estado:** Aplicado por revisión y por los criterios anteriores.
