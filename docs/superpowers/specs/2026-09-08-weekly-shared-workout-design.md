# Entreno semanal compartido (global, por fecha)

## Contexto

Hoy cada usuario tiene su propio ciclo de 6 semanas (`profiles.cycle_start_date`),
calculado desde su fecha de alta. `getUserCycleWeek` deriva `weekNumber` (1-6) por
usuario y `getTemplate(category, weekNumber)` sirve el contenido de
`workout_templates` (unique `category+week_number`).

En producción, la tabla ya tiene **16 semanas por categoría** (no 6): el check
constraint original (`week_number between 1 and 6`, migración 006) fue alterado
fuera de las migraciones versionadas (sin migración en el repo que lo refleje).
Las migraciones del repo están desincronizadas del esquema real.

## Objetivo

A partir de la semana que viene, el entreno deja de ser por-ciclo-de-usuario y
pasa a ser **semanal y global**: todo el mundo dentro de una categoría (ATHX /
ATHX PRO — esa distinción se mantiene) ve el mismo contenido, determinado por la
semana de calendario real, no por cuándo se dio de alta. Contenido nuevo cada
semana, sin repetir un ciclo fijo.

## Decisiones

1. **Clave de semana**: `week_start_date` (date, lunes ISO), no un contador
   incremental. Se calcula puramente desde "ahora" — sin tabla de config ni
   ancla global que mantener.
2. **Semana gratis (trial)**: la semana actual es gratis solo para el usuario
   cuya semana de alta coincide con la semana actual (`profiles.cycle_start_date
   === currentWeekStart`). Se reutiliza la columna existente tal cual — ya
   guarda "lunes de la semana de alta".
3. **Generación de contenido**: manual, admin sube cada semana (sin cron).
4. **Migración**: aditiva. No se toca nada de lo que los usuarios ven ahora
   hasta el corte. Filas/columna vieja se archivan, no se borran en este
   cambio.
5. **Fases de periodización (BASE/BUILD/PEAK/DELOAD) y `cycleNumber`**: se
   eliminan del dominio — ya no hay ciclo fijo que enforced en código; queda
   como criterio editorial libre del admin al redactar cada semana.

## Esquema BD

Migración nueva sobre `workout_templates` (idempotente, regulariza el drift ya
existente en prod):

```sql
alter table public.workout_templates
  drop constraint if exists workout_templates_week_number_check;

alter table public.workout_templates
  add column week_start_date date;

create unique index workout_templates_category_week_start_date_key
  on public.workout_templates (category, week_start_date)
  where week_start_date is not null;
```

- `week_number` y sus filas actuales quedan intactos (histórico), sin más
  escrituras nuevas en esa columna.
- `profiles.cycle_start_date` no cambia de forma ni de significado real (ya era
  "lunes de la semana de alta"); solo cambia su uso: antes conducía el
  contenido, ahora solo el gate de trial.

## Cambios de código

`src/modules/training/domain/cycle.ts`:
- Elimina `getUserCycleWeek`, `cycleNumber`, `getCyclePhase`.
- Añade `getCurrentWeekStartDate(): string` — pura, sin argumentos, reutiliza
  el shift ya existente (Madrid +2h antes de `getMondayOf`) para que el
  rollover siga siendo domingo 22:00.
- `isFreeWeek(currentWeekStart: string, signupWeekStart: string | null):
  boolean` — `signupWeekStart === currentWeekStart`.

`src/modules/training/infra/template-repository.ts`:
- `getTemplate(category, weekStartDate, locale)` filtra por
  `week_start_date` en vez de `week_number`.
- `getPublicTemplate` idem, para el preview.
- Mismo cambio en `getRawTemplate` / `updateTemplateBlock` / helper de listado
  de semanas disponibles por categoría (admin).

`src/modules/training/application/`:
- `get-week-workout.ts`: ya no deriva la semana de contenido del perfil;
  usa `getCurrentWeekStartDate()` (o override admin). El perfil solo se
  consulta para `isFreeWeek`.
- `get-current-week-workout.ts`: se borra (dead code, variante no usada,
  redundante con la de arriba).
- `get-preview-workout.ts`: pasa de "athx_pro semana 1 fija" a "athx_pro
  semana actual" — el preview público siempre enseña lo vigente.
- `get-admin-week-numbers.ts`: lista `week_start_date` disponibles por
  categoría en vez de enteros 1-6.
- `get-admin-template.ts` / `update-template-block.ts`: reciben
  `weekStartDate` en vez de `weekNumber`.

`app/admin/entrenos/[category]/[week]/page.tsx`:
- El segmento `[week]` pasa de entero 1-6 a fecha ISO (`YYYY-MM-DD`).
  Validación: formato fecha + debe ser lunes.

`app/[locale]/entrenamiento/page.tsx`:
- Si `getTemplate` no devuelve fila para la semana actual (admin no subió
  a tiempo), no debe romper: mostrar mensaje "contenido de esta semana en
  camino" en vez de error/crash. Antes esto no era posible (1-6 siempre
  precargadas); con generación manual semanal es un riesgo real a cubrir.

## Testing

- Unit: `getCurrentWeekStartDate` (boundary domingo 22:00 → lunes, ambos
  lados), `isFreeWeek` (igualdad de fechas, `null` seguro).
- Manual: crear/editar semana nueva desde el editor admin; preview público
  sin auth; página de entreno con y sin suscripción; caso "semana sin
  contenido todavía" (mensaje, no crash).

## Rollout

1. Migración aditiva — desplegable en cualquier momento, cero riesgo: código
   viejo sigue leyendo `week_number` sin cambios hasta el paso 3.
2. Generar contenido del próximo lunes (ATHX + ATHX PRO) en `week_start_date`
   nuevo, antes del corte.
3. Desplegar el código nuevo justo en el corte (domingo noche / lunes).
4. Verificar en prod: preview, `/entrenamiento`, editor admin.
5. Limpieza (cambio aparte, más adelante): drop `week_number` y filas viejas
   cuando se confirme que no hace falta rollback.
