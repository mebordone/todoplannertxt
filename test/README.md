# Tests – Todo.txt Webext

Carpeta de tests: **funcionales**, **integración**, **cobertura** y **complejidad ciclomática**.

## Estructura

- **test/unit/** – Tests funcionales por módulo (todotxt, util, md5, exception, fileUtil).
- **test/integration/** – Tests de integración (todoclient con FSA y prefs mockeados).
- **test/coverage/** – Salida de cobertura (generada por Jest).
- **test/setup.js** – Setup global (globalThis, mock de `browser`).
- **scripts/complexity-report.js** – Reporte de complejidad ciclomática.

## Requisitos

```bash
npm install
```

## Comandos

| Comando | Descripción |
|--------|-------------|
| `npm test` | Ejecuta todos los tests |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests + cobertura (HTML en `test/coverage/`) |
| `npm run complexity` | Reporte de complejidad ciclomática (ESLint) |
| `npm run lint` | ESLint (incluye regla `complexity`) |

## Cobertura (AGENTS.md §2)

- **Umbrales** (en `jest.config.js`): statements, lines y functions ≥ 90%; **branches ≥ 80%**.
- El informe HTML se genera en `test/coverage/index.html` tras `npm run test:coverage`.
- Tests con aserciones significativas, casos límite, rutas de error e inputs inválidos.
- Cumplimiento completo: ver `COMPLIANCE-AGENTS.md` en la raíz de `webext`.

## Complejidad ciclomática (AGENTS.md §3)

- **ESLint**: regla `complexity` con **máximo 10** por función (`.eslintrc.cjs`). Recomendado ≤7.
- **Reporte**: `npm run complexity` lista funciones que superan el límite.

## Notas

- Los módulos se cargan en Node con `module.exports` cuando existe `module` (solo en tests).
- `lib/fsa.js` depende del runtime de Thunderbird y no se incluye en cobertura.
- `logger.js` no está en `collectCoverageFrom` (principalmente I/O y notificaciones).
