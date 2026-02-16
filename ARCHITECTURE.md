# Terminus PWA - ARCHITECTURE

## Overview
Terminus e una Progressive Web App vanilla JS per wellness intelligence. Calcola un Energy Score (0-100) basato su 4 componenti, fornisce coaching AI tramite Groq, e traccia abitudini nel tempo.

## Struttura Directory
```
web/
  index.html          # Shell SPA, navigation, theme, meta tags
  manifest.json       # PWA manifest (icons, display, theme)
  sw.js               # Service Worker (cache strategies, offline)
  css/
    app.css           # Tutti gli stili (dark mode, componenti, animazioni)
  js/
    app.js            # Router SPA, init, navigation, profile loading
    config.js         # Costanti globali (API URLs, cronotipi, scale, soglie)
    models/           # Logica di dominio (pura, no DOM)
      energy.js       # Energy Score engine, prediction curve, routine outlook
      circadian.js    # Modello circadiano con cronotipi e fasi
      sleep.js        # Calcolo score sonno, debito, trend
      caffeine.js     # Residuo caffeina (emivita 5.7h), log, fonti
      hydration.js    # Progresso idratazione, target, log
      allostatic.js   # Carico allostatico (stress, HRV, variabilita)
      lifestyle.js    # Score lifestyle composito (idratazione+caffeina+esercizio+screen)
      patterns.js     # Pattern detection, correlazioni, trend, predizioni, report
      checkin.js      # Check-in soggettivi, data quality scoring
      habits.js       # Tracking habit streaks, frequenza, regolarita
      guidance.js     # Attivita raccomandate, azione ottimale
      gsd-pipeline.js # GSD 5-phase pipeline (BROKEN: import rotti)
      ralph-loop.js   # Ralph Loop 5-phase cycle (BROKEN: import rotti)
    components/       # Rendering UI (DOM manipulation)
      dashboard.js    # Dashboard principale con Energy Ring, stats, check-in
      timeline.js     # Log attivita/caffeina/acqua/sonno con modal
      coaching.js     # AI analysis, chat, WOOP, guidance, wind-down
      reports.js      # Weekly grade, trend, heatmap, correlazioni, SMART goals
      profile.js      # Setup profilo 7 sezioni + visualizzazione
      settings.js     # Config servizi, theme, data management
    services/         # Integrazioni esterne
      groq.js         # Groq API (8 endpoint, retry, chat multi-turn)
      supabase.js     # Supabase (auth, CRUD 10 tabelle, real-time)
      sahha.js        # Sahha REST API (biometrics, health scores)
      notifications.js# Push notifications, wind-down, hydration reminders
    utils/            # Funzioni pure condivise
      storage.js      # localStorage wrapper con namespace terminus_
      datetime.js     # Formattazione date/ore in italiano
      stats.js        # Pearson, regressione lineare, spline cubica, patterns
```

## Flusso Dati

```
[Input Utente]            [Servizi Esterni]
    |                           |
    v                           v
 storage.js  <---------->  supabase.js
    |                        sahha.js
    v
 models/ (logica pura)
    |
    +-- energy.js ---------> calcEnergyScore(profile)
    |     |                      |
    |     +-- circadian.js       +-- score: 0-100
    |     +-- sleep.js           +-- components: {circadian, sleep, lifestyle, allostatic}
    |     +-- lifestyle.js       +-- bottlenecks: [{label, severity, advice}]
    |     +-- allostatic.js      +-- suggestion: string
    |                            +-- prediction: [{hour, energy}]
    |
    +-- patterns.js -------> correlazioni, trend, report settimanale
    +-- gsd-pipeline.js ---> pipeline 5 fasi (capture->engage)
    +-- ralph-loop.js -----> ciclo 5 fasi (review->habituate)
    |
    v
 components/ (rendering)
    |
    +-- dashboard.js  <-- energy score, prediction, check-in
    +-- timeline.js   <-- log giornaliero unificato
    +-- coaching.js   <-- AI analysis, chat, guidance
    +-- reports.js    <-- weekly grade, patterns, SMART goals
    |
    v
 services/groq.js ---------> AI coaching, analysis, WOOP goals
```

## Modello Energy Score

```
Energy Score = min(100, C + S + L + A - InteractionPenalty)

Dove:
  C = Circadian (0-25): fase circadiana basata su cronotipo
  S = Sleep (0-25): qualita/durata sonno + debito
  L = Lifestyle (0-25): idratazione + caffeina + esercizio + screen time
  A = Allostatic (0-25): carico stress + HRV + variabilita

InteractionPenalty = criticalCount >= 3 ? 15 : criticalCount >= 2 ? 10 : criticalCount >= 1 ? 5 : 0
(criticalCount = componenti con score < 8/25)
```

## Confini tra Moduli

| Layer | Responsabilita | Dipende da |
|-------|---------------|-----------|
| **utils/** | Funzioni pure, no side effects | Niente |
| **models/** | Logica di dominio, calcoli | utils/, config.js, storage.js |
| **services/** | Comunicazione esterna (API, notifiche) | config.js, storage.js |
| **components/** | Rendering DOM, gestione eventi | models/, services/, utils/ |
| **app.js** | Routing, init, orchestrazione | components/, services/ |

## Contratto Dati Principali

### Profile Object
```js
{
  name, age, sex, weight, height,
  chronotype: 'LUPO'|'LEONE'|'ORSO'|'DELFINO',
  bedtime, wakeTime, idealSleep,
  activityLevel, workType, workStart, workEnd,
  smoking, alcohol, exercise, screenTime,
  conditions: [], medications, goals: []
}
```

### Energy Result Object
```js
{
  score: 0-100,
  label: string,
  color: hex,
  suggestion: string,
  interactionPenalty: 0-15,
  criticalCount: 0-4,
  components: {
    circadian: { score: 0-25, max: 25, phase: {...} },
    sleep: { score: 0-25, max: 25, debt, avgDuration, trend },
    lifestyle: { score: 0-25, max: 25, details: {...} },
    allostatic: { score: 0-25, max: 25, details: {...} }
  },
  bottlenecks: [{ label, icon, severity, advice, value }]
}
```
