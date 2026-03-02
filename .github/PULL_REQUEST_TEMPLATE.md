## Descripción

<!-- Breve descripción del cambio -->

## Tipo de cambio

- [ ] Corrección de errores
- [ ] Nueva funcionalidad (integración calendario / otras)
- [ ] Cambio que rompe compatibilidad
- [ ] Documentación o CI

## Checklist

- [ ] El código cumple las reglas de **AGENTS.md** (complejidad ≤10, tests con aserciones significativas).
- [ ] He ejecutado `npm run ci` localmente y pasa (tests, cobertura, lint, complejidad).
- [ ] Si hay strings nuevos, están en `_locales` (en, de, fr).
- [ ] No hay credenciales ni datos sensibles en el código ni en logs.

## QA manual (recomendado para cambios de integración calendario)

1. Instalar la extensión en un perfil limpio (o cargar temporalmente).
2. En Opciones: configurar rutas de todo.txt y done.txt.
3. Activar **"Habilitar integración con Calendar"** y guardar.
4. Crear en todo.txt 3 ítems: uno **sin** `due:`, dos **con** `due:YYYY-MM-DD`.
5. Comprobar que en la vista Calendario de Thunderbird aparece el calendario "Todo.txt" y solo las 2 tareas con fecha.
6. Editar una tarea en el calendario (completar o cambiar fecha) y comprobar que se sincroniza a todo.txt.
7. Editar todo.txt (añadir due a una tarea) y comprobar que en un lapso razonable se refleja en el calendario.

## Limitaciones conocidas (si aplica)

<!-- Ej.: dependencia de Experiment API en TB 140.7; sin mapeo de @context; resolución de conflictos "último gana". -->

## Siguientes pasos (Fase 2, si aplica)

<!-- Ej.: resolución de conflictos avanzada, opción para mostrar tareas sin due en vista separada, tests de integración en Thunderbird real. -->
