# Terminus PWA - ROADMAP

> Aggiornato: 2026-02-17

## Fase 1: Core Fix (Critico) - COMPLETATA Sprint 2
> Rendere funzionante cio che esiste

- [x] Fix import rotti in GSD Pipeline (gsd-pipeline.js)
- [x] Fix import rotti in Ralph Loop (ralph-loop.js)
- [x] Fix import rotto in Timeline (getTodayLoad)
- [x] Aggiungere funzioni bridge mancanti
- [x] Fix bug check-in (caffeine.length >= 0)
- [x] Testare che GSD Pipeline e Ralph Loop eseguano senza errori

## Fase 2: Stabilita - COMPLETATA Sprint 2-3
> Eliminare fragilita e inconsistenze

- [x] Estrarre showToast() in modulo condiviso (utils/ui.js)
- [x] Estrarre formatAIResponse() in modulo condiviso
- [x] Sanitizzare input utente prima di renderizzare con innerHTML
- [x] Verificare coerenza scale (sleep quality 1-5 normalizzata)
- [x] Aggiungere gestione errori (patterns.js array vuoti, division-by-zero)
- [x] Fix operator precedence in profile.js
- [x] Aggiornare SW cache con ui.js (v3.1.0)
- [x] Fix CI workflows (deploy-web, build-ios)

## Fase 3: Ottimizzazione - PROSSIMA
> Migliorare qualita algoritmica

- [ ] Migliorare generatePredictions() con modello piu robusto
- [ ] Calibrare pesi energia con feedback loop dai dati utente
- [ ] Aggiungere validazione input nei modelli (clamp, type checking)
- [ ] Migliorare gestione edge case (no data, primo utilizzo, dati insufficienti)
- [ ] Ottimizzare accesso localStorage (batch reads per rendering)

## Fase 4: Funzionalita
> Estendere il sistema

- [ ] Sincronizzazione bidirezionale localStorage <-> Supabase
- [ ] Export report in PDF
- [ ] Confronto settimana su settimana nei report
- [ ] Integrazione completa Sahha nel calcolo energy (non solo display)
- [ ] Sistema di achievement/gamification
- [ ] Onboarding guidato per primo utilizzo
