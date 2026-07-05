# Quitar tope de 6 semanas en progresión de entrenamiento

## Problema

`workout_templates` ya no tiene el CHECK constraint de `week_number between 1 and 6`
(quitado a mano) y la semana 7 ya está subida en DB para al menos una categoría.
Pero el código sigue capando todo a 6 semanas en varios sitios, así que nadie
puede ver más allá de la semana 6:

- `src/modules/training/domain/cycle.ts` — `weekNumber` usa `% WEEKS_PER_CYCLE`
  (WEEKS_PER_CYCLE=6), así que la progresión real de un usuario suscrito nunca
  pasa de 6, vuelve a empezar en 1.
- `src/modules/training/application/get-week-workout.ts` — el override de admin
  (`?week=`) solo acepta 1-6.
- `app/[locale]/admin/entrenos/[category]/[week]/page.tsx` — `notFound()` si
  `weekNumber` no está en 1-6.
- `app/[locale]/admin/entrenos/page.tsx` — grid de semanas hardcodeado
  `WEEKS = [1,2,3,4,5,6]`.
- `app/[locale]/entrenamiento/admin-week-badge.tsx` — dropdown de semanas
  hardcodeado a 6 opciones.

## Contexto de negocio

El admin sube semanas de forma continua e indefinida (no hay "ciclos" con
significado de negocio — el campo `cycle_number` no se muestra en ningún
sitio de la UI, solo se usa como parte de una key de localStorage). Los
suscritos deben ver las semanas secuencialmente sin límite: quien está en
semana 6 debe pasar a ver la 7 en el próximo rollover semanal (domingo 22:00
hora Madrid, lógica de `SHIFT_MS` sin cambios).

## Diseño

### 1. `src/modules/training/domain/cycle.ts`

- Quitar el `% WEEKS_PER_CYCLE` de `weekNumber`. Pasa a ser
  `weekNumber = weeksElapsed + 1`, creciendo sin tope.
- `cycleNumber` se queda fijo en `1` siempre (ya no se calcula desde
  `weeksElapsed`). Se mantiene el campo por compatibilidad con
  `UserWeekWorkout`, `isFreeWeek` y la key de localStorage
  (`done:c${cycleNumber}:w${weekNumber}`), pero deja de tener significado de
  "ciclo" — es un valor constante.
- `getCyclePhase(weekNumber)` pasa a calcular la fase sobre
  `((weekNumber - 1) % 6) + 1` en vez de sobre `weekNumber` directo, para que
  el patrón Base(1-2)/Build(3-4)/Peak(5)/Deload(6) se repita cada bloque de 6
  semanas indefinidamente (semana 7 = Base, 8 = Base, 9 = Build, ...).

### 2. `get-week-workout.ts`

- El clamp del override de admin pasa de `>= 1 && <= 6` a solo `>= 1`
  (entero positivo). Si apunta a una semana sin plantilla, `getTemplate`
  devuelve `null` igual que hoy (comportamiento de "no encontrado" sin
  cambios).

### 3. `admin/entrenos/[category]/[week]/page.tsx`

- El `notFound()` deja de comprobar el tope superior de 6; solo valida que
  `weekNumber` sea un entero `>= 1`.

### 4. Nueva función de repo: `getWeekNumbersForCategory`

En `src/modules/training/infra/template-repository.ts`, nueva función:

```ts
export async function getWeekNumbersForCategory(category: Category): Promise<number[]>
```

Hace `select week_number from workout_templates where category = ? order by
week_number asc` con el cliente admin (mismo patrón que `getRawTemplate`).
Devuelve el array de semanas realmente existentes en DB para esa categoría.

### 5. `admin/entrenos/page.tsx`

- Se convierte en un componente que llama a `getWeekNumbersForCategory` para
  cada categoría (`athx`, `athx_pro`) y sustituye el `WEEKS = [1..6]`
  hardcodeado por el resultado real de la DB. El grid muestra tantas
  semanas como existan por categoría (pueden diferir entre categorías si una
  va más adelantada que la otra).

### 6. `entrenamiento/admin-week-badge.tsx`

- El dropdown de semanas (hoy `Array.from({length:6})`) pasa a recibir la
  lista de semanas disponibles como prop, poblada en el server component
  padre (`entrenamiento/page.tsx`) vía `getWeekNumbersForCategory` para la
  categoría efectiva. Así el selector de admin siempre refleja lo que
  realmente hay en DB.

## Fuera de alcance

- No se toca el rollover semanal (domingo 22:00 Madrid) — se confirmó que se
  mantiene igual.
- No se añade un límite superior configurable ni validación de "huecos" en
  la numeración de semanas (se asume que el admin sube semanas de forma
  contigua, como ha hecho hasta ahora).
- No se re-introduce el CHECK constraint en `workout_templates` — el usuario
  lo quitó a propósito y la numeración es ahora abierta.

## Testing

- Tests unitarios de `cycle.ts`: `getUserCycleWeek` para semanas 1, 6, 7, 12,
  13 (verificar que no envuelve y que `cycleNumber` siempre es 1);
  `getCyclePhase` para 1, 6, 7, 12, 13 (verificar que repite el patrón).
- Verificación manual: usuario con `cycle_start_date` tal que caiga en
  semana 7 ve el contenido de la semana 7 en `/entrenamiento`.
- Verificación manual admin: `/admin/entrenos` lista semana 7 si existe en
  DB para esa categoría; no la lista si solo existe para la otra categoría.
