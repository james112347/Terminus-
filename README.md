# Terminus - Wellness Intelligence Platform

**Terminus** è una PWA (Progressive Web App) di wellness intelligence che trasforma dati biometrici, abitudini quotidiane e pattern comportamentali in un punteggio di prontezza (Energy Score) per ottimizzare energia, produttività e benessere.

## Metodologie di Sviluppo

### BMAD (Breakthrough Method for Agile AI-Driven Development)
Framework di sviluppo in 4 fasi:
1. **Analysis** → PRD, requisiti, analisi del dominio (cronobiologia, sleep science)
2. **Planning** → User stories, architettura, schema database
3. **Solutioning** → Design moduli, algoritmi predittivi, integrazione servizi
4. **Implementation** → Sprint iterativi con validazione continua

### GSD (Get Stuff Done)
Pipeline di produttività in 5 fasi applicato sia allo sviluppo che all'app:
1. **Capture** → Raccolta dati/requisiti
2. **Clarify** → Classificazione e validazione
3. **Organize** → Strutturazione in modelli
4. **Reflect** → Analisi e insight
5. **Engage** → Azione e coaching

### Ralph Loop
Ciclo di miglioramento continuo:
1. **Review** → Revisione giornaliera
2. **Analyze** → Pattern analysis
3. **Learn** → Calibrazione modelli
4. **Plan** → Obiettivi SMART
5. **Habituate** → Formazione abitudini

## Features

### 1. Energy Score & Algoritmi Predittivi
- **Ritmo Circadiano**: Sincronizzazione con cronotipo (Lupo/Leone/Orso/Delfino)
- **Cortisol Awakening Response (CAR)**: Calcolo qualità del risveglio
- **Debito di Sonno**: Modello accumulatore su finestra mobile 7 giorni
- **Farmacocinetica Caffeina**: Curva di decadimento (emivita 5h)
- **Bilancio Idrico**: Algoritmo basato su peso e attività (ml/kg)
- **Previsione 12h**: Curva spline basata su cronobiologia + dati reali

### 2. Activity Tracking (Timeline)
- **Categorie**: Focus Intenso, Lavoro, Esercizio, Recupero, Sociale, Pasti
- **Log Biometrico**: Umore (Likert 1-5), Focus, Caffeina, Idratazione, Sonno
- **Carico Attività**: Calcolo drain/recovery energetico in tempo reale

### 3. Intelligence & Pattern Detection
- **Crash Energetici**: Identificazione cali ricorrenti per giorno/ora
- **Correlazioni di Pearson**: Analisi statistica (sonno→energia, caffeina→sonno, etc.)
- **Regressione Lineare**: Trend e previsioni
- **Spline Cubica**: Curve smooth per previsioni energetiche

### 4. Coaching Proattivo
- **Suggerimenti Dinamici**: Basati su Energy Score (>70→Focus, <30→Pausa)
- **Wind-down Protocol**: Notifiche graduate -2h, -1h, -30min dal sonno
- **Analisi AI**: Coaching personalizzato via Groq AI
- **Due Canali**: Suggestion (gentle) e Alert (urgente)

### 5. Report & Gamification
- **Heatmap Settimanale**: Visualizzazione energia per giorno/ora
- **Bottleneck Analysis**: Identificazione fattore singolo più impattante
- **Obiettivi SMART**: 3 goal generati automaticamente
- **Streaks**: Tracking delle abitudini quotidiane
- **Report AI**: Analisi settimanale completa con Groq

## Tech Stack

| Componente | Tecnologia |
|------------|-----------|
| **Frontend** | PWA vanilla JS con ES Modules |
| **AI** | Groq API (Llama 3.3 70B Versatile) |
| **Database** | Supabase (Postgres + Auth + Realtime) |
| **Biometrics** | Sahha REST API |
| **Hosting** | GitHub Pages |
| **CI/CD** | GitHub Actions |
| **iOS App** | Swift 6.0 / SwiftUI (iPhone 17+) |

## Architettura PWA

```
web/
├── index.html                    # App shell
├── manifest.json                 # PWA manifest
├── sw.js                         # Service Worker (offline)
├── css/
│   └── app.css                   # Design system completo
├── js/
│   ├── app.js                    # Router e inizializzazione
│   ├── config.js                 # Configurazione e costanti
│   ├── services/
│   │   ├── supabase.js           # Database, auth, realtime
│   │   ├── groq.js               # AI coaching e analisi
│   │   ├── sahha.js              # Dati biometrici wearable
│   │   └── notifications.js      # Push & wind-down
│   ├── models/
│   │   ├── energy.js             # Energy Score engine
│   │   ├── circadian.js          # Ritmo circadiano + CAR
│   │   ├── sleep.js              # Debito sonno + fasi
│   │   ├── caffeine.js           # Farmacocinetica caffeina
│   │   ├── hydration.js          # Bilancio idrico
│   │   ├── patterns.js           # ML: correlazioni, trend
│   │   ├── gsd-pipeline.js       # GSD 5-phase engine
│   │   └── ralph-loop.js         # Ralph Loop engine
│   ├── components/
│   │   ├── dashboard.js          # Dashboard + Energy Score
│   │   ├── timeline.js           # Activity tracking
│   │   ├── profile.js            # Profilo utente completo
│   │   ├── coaching.js           # AI coaching + suggerimenti
│   │   ├── reports.js            # Report + heatmap + goals
│   │   └── settings.js           # Configurazione servizi
│   └── utils/
│       ├── storage.js            # localStorage wrapper
│       ├── datetime.js           # Date/time utilities
│       └── stats.js              # Statistiche + spline
└── docs/
    └── PRD.md                    # Product Requirements Document
```

## Setup

### PWA (Web)
1. Configura le API key nelle Impostazioni dell'app
2. **Groq AI**: Ottieni chiave su [console.groq.com](https://console.groq.com)
3. **Supabase**: Crea progetto su [supabase.com](https://supabase.com)
4. **Sahha**: Registrati su [sahha.ai](https://sahha.ai)
5. Crea il tuo profilo con cronotipo, dati fisici e abitudini
6. Inizia a tracciare la tua giornata!

### iOS App (iPhone 17+)
1. Open `Terminus.xcodeproj` in Xcode 16+
2. Configure API key in Settings tab or Secrets.plist
3. Set Development Team in Signing & Capabilities
4. Build and run on iPhone 17

## Schema Database Supabase

```sql
-- Tabelle principali
profiles, energy_scores, activities, sleep_logs,
caffeine_logs, hydration_logs, biometric_data,
ai_insights, weekly_reports, goals
```

## Algoritmi Chiave

- **Energy Score**: Media pesata di 4 componenti (Sonno 35%, Circadiano 25%, Attività 20%, Lifestyle 20%)
- **Caffeina**: Decadimento esponenziale C(t) = C₀ × 0.5^(t/5h)
- **Correlazione**: Pearson r tra variabili su 30 giorni
- **Previsione**: Spline cubica su curva circadiana corretta dai dati reali
- **Sleep Debt**: Accumulo deficit su 7gg vs ottimale (8h)

## License

Private project.
