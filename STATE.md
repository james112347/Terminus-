# Terminus PWA - STATE

> Ultimo aggiornamento: 2026-02-17 (Sprint 3 completato)

## Fase Corrente
**BMAD Phase:** Implementation (Sprint 3) - Bug fix e defensive coding
**GSD Phase:** ENGAGE completato, pronto per Ralph Loop Review
**Ralph Loop Phase:** Pronto per primo ciclo completo

## Workflow Attivo

### BMAD (Build, Measure, Analyze, Decide)
- **Build:** Implementazione core completa, bug critici risolti
- **Measure:** Scenari di validazione definiti (stories/006)
- **Analyze:** Sprint 3 audit completato, 11 bug trovati e risolti
- **Decide:** Prossimo sprint = Phase 3 ROADMAP (ottimizzazione) + Phase 4 (funzionalita)

### GSD (Get Stuff Done)
- CAPTURE: Completato (audit completo codebase, 11 issue trovate)
- CLARIFY: Completato (classificate per severita: critico/alto/medio)
- ORGANIZE: Completato (stories 007-010 create)
- REFLECT: Completato (piano validato)
- ENGAGE: **Completato** (stories 007-010 eseguite)

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
- [x] GSD Pipeline 5 fasi (tutti gli import corretti)
- [x] Ralph Loop 5 fasi (tutti gli import corretti)
- [x] Dashboard, Timeline, Coaching, Reports, Profile, Settings
- [x] Servizi: Groq AI, Supabase, Sahha, Notifications
- [x] PWA: manifest, service worker v3.1.0, offline support
- [x] Modulo UI condiviso (showToast, formatAIResponse, escapeHtml)
- [x] Sanitizzazione XSS per input utente
- [x] Scala qualita sonno coerente (1-5 ovunque)
- [x] Protezione division-by-zero in tutti i modelli
- [x] Defensive coding in patterns.js e profile.js
- [x] Service worker cache aggiornato con ui.js

### Risolto in Sprint 2 (refactor)
- [x] Fix 5 import rotti in GSD Pipeline
- [x] Fix 4 import rotti in Ralph Loop
- [x] Fix import getTodayLoad in Timeline
- [x] Fix bug `caffeine.length >= 0` in checkin.js e gsd-pipeline.js
- [x] Deduplicazione showToast() (da 4 copie a 1 modulo)
- [x] Deduplicazione formatAIResponse() (da 2 copie a 1 modulo)
- [x] Sanitizzazione XSS per notes (timeline) e chat (coaching)
- [x] Aggiunte funzioni bridge per GSD/Ralph

### Risolto in Sprint 3 (defensive coding)
- [x] Fix scala qualita sonno: modal 1-5 ora coerente con modello (sleep.js, config.js)
- [x] Fix division-by-zero: energy.js (hydrationTarget), hydration.js (target), circadian.js (CAR formula)
- [x] Fix reduce su array vuoto in patterns.js (best/worst day)
- [x] Fix string split senza bounds check in patterns.js (correlations)
- [x] Fix array access senza null check in patterns.js (SMART goals)
- [x] Fix operator precedence bug in profile.js (prefill form)
- [x] Aggiunto ui.js a SW cache, bump versione a v3.1.0
- [x] Fix CI: deploy-web.yml (deploy solo da main, JS syntax check per ES modules)
- [x] Fix CI: build-ios.yml (simulator build, paths filter, no code signing)

### Ancora mancante
- [ ] Test unitari e di integrazione
- [ ] Sincronizzazione bidirezionale localStorage <-> Supabase
- [ ] Onboarding guidato per primo utilizzo
- [ ] Export report PDF
- [ ] Confronto settimana su settimana
- [ ] Sistema achievement/gamification

## Problemi Noti Residui

### Minori
1. generatePredictions() usa solo media mobile 3 giorni (basico)
2. Nessun test automatizzato
3. Assets directory vuota (placeholder icons)

## Decisioni Tecniche
- localStorage primario, Supabase opzionale
- Groq come unico AI provider
- Vanilla JS senza framework
- SPA hash-based routing
- Modello 4x25=100 con interaction penalty
- Italiano come lingua UI e prompt
- Scala sonno: 1-5 (modal) → diviso per 5 nel modello
