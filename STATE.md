# Terminus PWA - STATE

> Ultimo aggiornamento: 2026-02-16 (post-refactor)

## Fase Corrente
**BMAD Phase:** Implementation (Sprint 2) - Stabilizzazione e strutturazione
**GSD Phase:** ENGAGE - Pipeline funzionante, prossimo ciclo di feedback
**Ralph Loop Phase:** Pronto per il primo ciclo completo

## Workflow Attivo

### BMAD (Build, Measure, Analyze, Decide)
- **Build:** Implementazione core completa, GSD/Ralph riparati
- **Measure:** Scenari di validazione definiti (stories/006)
- **Analyze:** Audit completato, problemi identificati e risolti
- **Decide:** Prossimo sprint = sync bidirezionale + test

### GSD (Get Stuff Done)
- CAPTURE: Completato (tutti i moduli raccolgono dati)
- CLARIFY: Completato (classificazione e validazione)
- ORGANIZE: Completato (modelli analitici strutturati)
- REFLECT: Completato (insights, SMART goals)
- ENGAGE: **Attivo** (coaching e notifiche funzionanti)

### Ralph Loop
- REVIEW: Pronto (dati settimanali disponibili)
- ANALYZE: Pronto (correlazioni e trend disponibili)
- LEARN: Pronto (lezioni da bottleneck)
- PLAN: Pronto (SMART goals generator funzionante)
- HABITUATE: Pronto (habit streaks implementati)

## Funzionalita Implementate

### Completo e Funzionante
- [x] Energy Score engine a 4 componenti con interaction penalty
- [x] Modello circadiano (Borbely Two-Process) con 4 cronotipi
- [x] Modello sonno (Van Dongen) con debito, trend, qualita, nap recovery
- [x] Modello caffeina (farmacocinetica esponenziale) con 11 fonti
- [x] Modello idratazione con target personalizzato
- [x] Modello allostatico (McEwen) con stress, HRV, burnout risk
- [x] Modello lifestyle composito
- [x] Sistema check-in soggettivi + daily energy log
- [x] ML Pipeline (pattern detection, correlazioni, trend, predizioni, report A-F)
- [x] GSD Pipeline 5 fasi (RIPARATO: tutti gli import corretti)
- [x] Ralph Loop 5 fasi (RIPARATO: tutti gli import corretti)
- [x] Dashboard, Timeline, Coaching, Reports, Profile, Settings
- [x] Servizi: Groq AI, Supabase, Sahha, Notifications
- [x] PWA: manifest, service worker, offline support
- [x] Modulo UI condiviso (showToast, formatAIResponse, escapeHtml)
- [x] Sanitizzazione XSS per input utente

### Risolto in questo refactor
- [x] Fix 5 import rotti in GSD Pipeline
- [x] Fix 4 import rotti in Ralph Loop
- [x] Fix import getTodayLoad in Timeline
- [x] Fix bug `caffeine.length >= 0` in checkin.js e gsd-pipeline.js
- [x] Deduplicazione showToast() (da 4 copie a 1 modulo)
- [x] Deduplicazione formatAIResponse() (da 2 copie a 1 modulo)
- [x] Sanitizzazione XSS per notes (timeline) e chat (coaching)
- [x] Aggiunto generateSMARTGoals con signature flessibile (bottleneck, profile)
- [x] Aggiunte funzioni bridge: getTodayLoad, calcSleepDebt, getCurrentPhase
- [x] Aggiunte funzioni bridge: analyzeCorrelations, getEnergyTrend, identifyWeeklyBottleneck

### Ancora mancante
- [ ] Test unitari e di integrazione
- [ ] Sincronizzazione bidirezionale localStorage <-> Supabase
- [ ] Onboarding guidato per primo utilizzo
- [ ] Export report PDF
- [ ] Service worker versioning

## Problemi Noti Residui

### Minori
1. Scala qualita sonno: modal usa 1-5, modello aspetta 1-10 in qualityFactor
2. Service worker non versioned
3. generatePredictions() usa solo media mobile 3 giorni (basico)

## Decisioni Tecniche
- localStorage primario, Supabase opzionale
- Groq come unico AI provider
- Vanilla JS senza framework
- SPA hash-based routing
- Modello 4x25=100 con interaction penalty
- Italiano come lingua UI e prompt
