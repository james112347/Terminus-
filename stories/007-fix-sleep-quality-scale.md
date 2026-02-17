# Story 007: Fix Sleep Quality Scale Mismatch

> **Sprint:** 3 | **Priorità:** CRITICO | **Fase ROADMAP:** 2

## Problema
Il modal di inserimento sonno (timeline.js:237) usa scala 1-5.
Il modello (sleep.js:65) divide per 10, aspettandosi scala 1-10.
Risultato: qualità 5 (max) → qualityFactor = 0.5 invece di 1.0.

## Soluzione
Normalizzare in sleep.js: dividere per 5 (scala del modal) invece che per 10.
Aggiornare il commento nel codice.
Aggiornare config.js se serve (sleepQuality.scale).

## Acceptance Criteria
- [ ] Qualità 5 dal modal → qualityFactor ≈ 1.0
- [ ] Qualità 1 dal modal → qualityFactor ≈ 0.2
- [ ] Config.js riflette scala corretta
- [ ] Nessun impatto su pattern analysis
