# Terminus PWA - ROADMAP

> Prossimi step dedotti dallo stato attuale del codice

## Fase 1: Core Fix (Critico)
> Rendere funzionante cio che esiste

- [ ] Fix import rotti in GSD Pipeline (gsd-pipeline.js)
- [ ] Fix import rotti in Ralph Loop (ralph-loop.js)
- [ ] Fix import rotto in Timeline (getTodayLoad)
- [ ] Aggiungere funzioni bridge mancanti (getTodayLoad, calcSleepDebt, getCurrentPhase, etc.)
- [ ] Fix bug check-in (caffeine.length >= 0)
- [ ] Testare che GSD Pipeline e Ralph Loop eseguano senza errori

## Fase 2: Stabilita
> Eliminare fragilita e inconsistenze

- [ ] Estrarre showToast() in modulo condiviso (utils/ui.js)
- [ ] Estrarre formatAIResponse() in modulo condiviso
- [ ] Sanitizzare input utente prima di renderizzare con innerHTML
- [ ] Verificare coerenza scale (sleep quality 1-5 vs 1-10)
- [ ] Aggiungere gestione errori dove manca (patterns.js con array vuoti)
- [ ] Separare logica mood/focus da logActivity

## Fase 3: Ottimizzazione
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
