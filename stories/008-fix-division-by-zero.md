# Story 008: Fix Division-by-Zero Errors

> **Sprint:** 3 | **Priorità:** CRITICO | **Fase ROADMAP:** 2-3

## Problema
Divisioni per zero non protette in più file:
- gsd-pipeline.js:76 (moodLogs.length)
- gsd-pipeline.js:79 (focusLogs.length)
- energy.js:406 (hydrationTarget)
- sleep.js:134 (duration=0)
- hydration.js:68 (target)
- circadian.js:61-62 (CAR formula)

## Soluzione
Aggiungere guard `length > 0` o `Math.max(1, ...)` prima di ogni divisione.

## Acceptance Criteria
- [ ] Nessuna divisione per zero possibile
- [ ] App funziona con dati vuoti (cold start)
- [ ] Valori fallback sensati quando dati mancanti
