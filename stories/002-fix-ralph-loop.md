# Story 002: Fix Ralph Loop Imports

## Descrizione
Il Ralph Loop (ralph-loop.js) importa 4 funzioni che non esistono nei moduli referenziati,
rendendo il ciclo di miglioramento continuo inutilizzabile.

## Import Rotti
- `getEnergyTrend` da patterns.js (non esportata con quel nome)
- `analyzeCorrelations` da patterns.js (si chiama `discoverCorrelations`)
- `identifyWeeklyBottleneck` da patterns.js (non esiste)
- `calcSleepDebt` da sleep.js (non esportata)

## Criteri di Accettazione
- [ ] Tutte le funzioni necessarie sono disponibili
- [ ] Ralph Loop esegue `runCycle(profile)` senza errori
- [ ] Ogni fase (REVIEW, ANALYZE, LEARN, PLAN, HABITUATE) produce output valido
- [ ] Habit streaks vengono tracciati correttamente
