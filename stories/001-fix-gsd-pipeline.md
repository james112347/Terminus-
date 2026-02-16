# Story 001: Fix GSD Pipeline Imports

## Descrizione
Il GSD Pipeline (gsd-pipeline.js) importa 5 funzioni che non esistono nei moduli referenziati,
rendendo l'intero engine inutilizzabile a runtime.

## Import Rotti
- `getTodayLoad` da energy.js (non esportata)
- `calcSleepDebt` da sleep.js (non esportata, funzione interna)
- `getCurrentPhase` da circadian.js (non esportata)
- `analyzeCorrelations` da patterns.js (funzione si chiama `discoverCorrelations`)
- `identifyWeeklyBottleneck` da patterns.js (non esiste)

## Criteri di Accettazione
- [ ] Tutte le funzioni necessarie sono esportate dai moduli corretti
- [ ] GSD Pipeline esegue `runPipeline(profile)` senza errori
- [ ] Ogni fase (CAPTURE, CLARIFY, ORGANIZE, REFLECT, ENGAGE) produce output valido
- [ ] Il pipeline log viene salvato correttamente in localStorage
