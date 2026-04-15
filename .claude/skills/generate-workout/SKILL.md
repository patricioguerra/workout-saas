---
name: generate-workout
description: Generate weekly CrossFit workout plan and upload to Supabase
user_invocable: true
---

# Generate Weekly Workout

Generate a CrossFit-style workout plan for a given week and insert it into the Supabase `workouts` table.

## Steps

1. Ask for the week start date (Monday) if not provided as argument. Format: YYYY-MM-DD. Default: next Monday.

2. Read the env vars from `.env.local` to get `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

3. Check if a workout already exists for that week AND fetch previous weeks for progression context:
```bash
# Check current week
curl -s "${SUPABASE_URL}/rest/v1/workouts?week_start=eq.${WEEK_START}&select=id" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"

# Fetch last 4 weeks for progression (order desc, limit 4)
curl -s "${SUPABASE_URL}/rest/v1/workouts?select=week_start,content&order=week_start.desc&limit=4" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
```
If current week exists, ask if user wants to replace it. Use previous weeks' data to inform progression.

4. Generate the workout JSON. Structure per day has 3 sections: warmup, fuerza, wod (except Thursday = recovery).

```json
{
  "lunes": { "titulo": "...", "warmup": [...], "fuerza": [...], "wod": { "tipo": "...", "descripcion": "...", "ejercicios": [...] } },
  "martes": { ... },
  "miercoles": { ... },
  "jueves": { "titulo": "Recuperacion activa", "recuperacion": "..." },
  "viernes": { ... },
  "sabado": { ... },
  "domingo": { "titulo": "Descanso", "recuperacion": "Descanso completo" }
}
```

Warmup exercise format:
```json
{ "nombre": "Row", "repeticiones": "200m" }
```

Fuerza exercise format:
```json
{
  "nombre": "Back Squat",
  "series": 5,
  "repeticiones": "5",
  "tempo": "Every 2 min for 10 min",
  "peso": "RPE 8",
  "notas": "2 series de calentamiento previas"
}
```

WOD format:
```json
{
  "tipo": "For Time | AMRAP X' | EMOM X' | Rounds For Time",
  "cap": "8 min",
  "descripcion": "3 Rounds For Time (Cap 8 min)",
  "ejercicios": [
    { "nombre": "Thrusters", "repeticiones": "9", "peso": "43/30 kg" },
    { "nombre": "Toes-to-Bar", "repeticiones": "12" },
    { "nombre": "Shuttle Run", "repeticiones": "100m", "notas": "25m x 4" }
  ]
}
```

Thursday recovery:
```json
{
  "titulo": "Recuperacion activa",
  "recuperacion": "30-40 min carrera suave o natacion. Movilidad y estiramientos 15 min."
}
```

### Methodology — CrossFit con Fuerza

**Schedule:** 5 training days (Lun, Mar, Mie, Vie, Sab). Thursday = active recovery (run/swim). Sunday = full rest.

**Daily structure (except Thu/Sun):**
1. **Warm-up** — 2-3 rounds, 8-12 min. Related to the day's movements. Mix of cardio (row, bike, run) + mobility + movement prep.
2. **Fuerza (A)** — Strength block. EMOM, Every X min, or build to heavy single/set. 8-15 min.
3. **WOD (B)** — Metcon. For Time, AMRAP, EMOM, or chipper. 8-20 min.

**Weekly strength requirements:**
- At least 1 day: Snatch variation (hang snatch, power snatch, squat snatch) in fuerza
- At least 1 day: Clean & Jerk variation (hang clean, power clean, squat clean + jerk) in fuerza
- At least 1 day: Legs focus (back squat, front squat, deadlift) in fuerza
- Other days: pressing, pulling, accessory (DB bench, weighted pull-ups, Bulgarian squats, Romanian DL, etc.)

**WOD principles:**
- Vary formats: For Time, AMRAP, EMOM, chipper, couplets, triplets
- Include gymnastics: pull-ups, C2B, toes-to-bar, muscle-ups, HSPU, pistols, ring dips
- Include monostructural: row, bike, run, shuttle sprints
- Weights Rx: always specify male/female (e.g., 60/40 kg, 22.5/15 kg)
- Box heights: 24"/20"
- Wall ball: 9/6 kg
- KB swings: 32/24 kg or 24/16 kg
- Cap times where appropriate
- Hero WODs occasionally (with attribution)
- Pair/team WODs occasionally ("In pairs", "synchro" movements)

**Progression & variety:**
- CRITICAL: Before generating, read the PREVIOUS week's workout from Supabase to ensure progression and avoid repetition
- Don't repeat the same WOD structure two days in a row
- Vary muscle groups across the week
- Warm-ups should prep for that day's movements specifically
- Rotate accessory work week to week
- WODs must be DIFFERENT from examples and previous weeks. Be creative w/ formats, rep schemes, and exercise combos

**Strength progression across weeks (IMPORTANT):**
- Query the last 2-4 weeks of workouts to track what was programmed
- Increase intensity week over week: RPE 7 → 7.5 → 8 → deload RPE 6 (4-week cycle)
- Increase volume gradually: e.g., 5x5 → 5x5 heavier → 6x4 → deload 3x5
- Every 4th week = deload: reduce volume 40%, reduce RPE by 2 points
- Squat/Deadlift/Oly lifts: aim +2.5kg/week on working sets when possible
- Note in "notas" the progression context (e.g., "Semana 2/4: subir 2.5kg vs semana pasada")
- Vary rep ranges across the cycle: strength (3-5), hypertrophy (6-10), endurance (12-15)
- Don't repeat the exact same strength movement two weeks in a row (e.g., Back Squat → Front Squat → Back Squat)

**Language:** All in Spanish except exercise names that are universally known in English in CrossFit (Thrusters, Wall Balls, Toes-to-Bar, Clean & Jerk, Snatch, Box Jump Over, etc.). Titles and descriptions in Spanish.

### Example days

**Lunes — Squat + Metcon:**
```json
{
  "titulo": "Fuerza: Back Squat + Metcon",
  "warmup": [
    { "nombre": "Row", "repeticiones": "200m" },
    { "nombre": "Air Squats", "repeticiones": "10" },
    { "nombre": "Ring Rows", "repeticiones": "10" },
    { "nombre": "Inch Worms", "repeticiones": "5" }
  ],
  "fuerza": [
    {
      "nombre": "Back Squat",
      "series": 5,
      "repeticiones": "5",
      "tempo": "Every 2 min for 10 min",
      "peso": "RPE 8",
      "notas": "2 series de calentamiento previas. Profundidad completa."
    }
  ],
  "wod": {
    "tipo": "Rounds For Time",
    "cap": "12 min",
    "descripcion": "4 Rounds For Time (Cap 12 min)",
    "ejercicios": [
      { "nombre": "Power Cleans", "repeticiones": "7", "peso": "60/40 kg" },
      { "nombre": "Box Jump Over", "repeticiones": "10", "notas": "24\"/20\"" },
      { "nombre": "Chest-to-Bar Pull-ups", "repeticiones": "12" }
    ]
  }
}
```

**Miercoles — Clean & Jerk + Metcon:**
```json
{
  "titulo": "Fuerza: Hang Squat Clean + Metcon",
  "warmup": [
    { "nombre": "Hang Muscle Cleans", "repeticiones": "5", "notas": "Barra vacia" },
    { "nombre": "Front Squats", "repeticiones": "5" },
    { "nombre": "Push Jerks", "repeticiones": "5" },
    { "nombre": "Toes-to-Bar", "repeticiones": "5" }
  ],
  "fuerza": [
    {
      "nombre": "Hang Squat Clean",
      "series": 1,
      "repeticiones": "1",
      "tempo": "Build over 12 min",
      "peso": "RPE 6",
      "notas": "Subir a un single moderado. Velocidad bajo la barra, NO maxear."
    }
  ],
  "wod": {
    "tipo": "Rounds For Time",
    "cap": "8 min",
    "descripcion": "3 Rounds For Time (Cap 8 min)",
    "ejercicios": [
      { "nombre": "Thrusters", "repeticiones": "9", "peso": "43/30 kg" },
      { "nombre": "Toes-to-Bar", "repeticiones": "12" },
      { "nombre": "Shuttle Run", "repeticiones": "100m", "notas": "25m x 4" }
    ]
  }
}
```

**Sabado — Hero WOD:**
```json
{
  "titulo": "Hero WOD: NATE",
  "warmup": [
    { "nombre": "Row", "repeticiones": "500m" },
    { "nombre": "Kipping Pull-ups", "repeticiones": "10" },
    { "nombre": "Push-ups", "repeticiones": "10" },
    { "nombre": "KB Swings ligeros", "repeticiones": "10" }
  ],
  "fuerza": [],
  "wod": {
    "tipo": "AMRAP 20'",
    "descripcion": "AMRAP 20 Minutes — NATE",
    "ejercicios": [
      { "nombre": "Muscle-ups", "repeticiones": "2" },
      { "nombre": "Handstand Push-ups", "repeticiones": "4" },
      { "nombre": "KB Swings", "repeticiones": "8", "peso": "32/24 kg" }
    ],
    "notas": "In honor of Chief Petty Officer Nate Hardy, KIA Iraq, February 4, 2008"
  }
}
```

5. Insert into Supabase (or upsert if replacing):
```bash
curl -s "${SUPABASE_URL}/rest/v1/workouts" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"week_start": "${WEEK_START}", "content": ${WORKOUT_JSON}, "prompt_used": "claude-code-skill", "model_version": "claude-code"}'
```

6. Confirm: "Workout subido para semana del {WEEK_START}."
