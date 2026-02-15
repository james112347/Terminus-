# Terminus PWA - Product Requirements Document (BMAD Phase 1-2)

## 1. Vision & Business Case

**Terminus** è una PWA di wellness intelligence che trasforma dati biometrici, abitudini quotidiane e pattern comportamentali in un punteggio di prontezza (Energy Score) per aiutare l'utente a ottimizzare energia, produttività e benessere.

### Problema
Le persone non hanno consapevolezza di come le loro abitudini quotidiane (sonno, caffeina, idratazione, ritmo circadiano) impattino la loro energia e performance. I dati esistono ma sono frammentati tra app diverse senza correlazione.

### Soluzione
Un assistente proattivo che:
- Raccoglie dati biometrici e comportamentali
- Calcola un Energy Score in tempo reale
- Predice l'energia futura basandosi su cronobiologia
- Identifica pattern invisibili con ML
- Fornisce coaching proattivo personalizzato

## 2. Metodologie di Sviluppo

### BMAD (Build, Measure, Analyze, Decide)
| Fase | Output |
|------|--------|
| **Build** | Implementazione moduli PWA |
| **Measure** | Raccolta metriche utente e feedback |
| **Analyze** | Pattern detection, correlazioni, bottleneck |
| **Decide** | Iterazione feature e suggerimenti AI |

### GSD Pipeline (5 Fasi)
1. **Capture** → Raccolta dati (biometrici, attività, mood, focus)
2. **Clarify** → Classificazione e validazione input
3. **Organize** → Strutturazione in modelli analitici
4. **Reflect** → Analisi AI con Groq per insight
5. **Engage** → Coaching proattivo e notifiche

### Ralph Loop (Ciclo Continuo)
1. **Review** → Revisione giornaliera dati
2. **Analyze** → Analisi pattern settimanali
3. **Learn** → Calibrazione modelli predittivi
4. **Plan** → Generazione obiettivi SMART
5. **Habituate** → Rinforzo abitudini positive

## 3. Tech Stack

| Componente | Tecnologia |
|------------|-----------|
| Frontend | PWA vanilla JS con ES Modules |
| AI Backend | Groq API (Llama 3.3 70B) |
| Database | Supabase (Postgres + Auth + Realtime) |
| Biometrics | Sahha REST API |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 4. User Stories (Epic Breakdown)

### Epic 1: Onboarding & Profilo
- US1.1: Come utente, voglio creare il mio profilo con dati fisici e abitudini
- US1.2: Come utente, voglio selezionare il mio cronotipo (Lupo/Leone/Orso/Delfino)
- US1.3: Come utente, voglio configurare le API key nelle impostazioni
- US1.4: Come utente, voglio collegarmi a Sahha per dati biometrici automatici

### Epic 2: Energy Score
- US2.1: Come utente, voglio vedere il mio Energy Score in tempo reale
- US2.2: Come utente, voglio capire cosa compone il mio punteggio
- US2.3: Come utente, voglio una previsione energetica delle prossime 12 ore
- US2.4: Come utente, voglio tracciare caffeina e vederne l'impatto sul sonno

### Epic 3: Timeline & Tracking
- US3.1: Come utente, voglio registrare attività (lavoro, pausa, social, ecc.)
- US3.2: Come utente, voglio loggare umore e focus
- US3.3: Come utente, voglio registrare sonno, acqua e caffeina
- US3.4: Come utente, voglio vedere la cronologia della giornata

### Epic 4: Intelligence & Pattern
- US4.1: Come utente, voglio che l'app identifichi crash energetici ricorrenti
- US4.2: Come utente, voglio correlazioni tra le mie variabili (passi vs sonno)
- US4.3: Come utente, voglio previsioni basate sui miei dati reali

### Epic 5: Coaching Proattivo
- US5.1: Come utente, voglio suggerimenti dinamici basati sul mio Energy Score
- US5.2: Come utente, voglio un protocollo wind-down prima di dormire
- US5.3: Come utente, voglio notifiche per disidratazione/stress
- US5.4: Come utente, voglio che l'AI analizzi i miei dati e dia consigli

### Epic 6: Report & Gamification
- US6.1: Come utente, voglio un report settimanale con heatmap
- US6.2: Come utente, voglio che l'app identifichi il bottleneck principale
- US6.3: Come utente, voglio 3 obiettivi SMART generati automaticamente
- US6.4: Come utente, voglio un'agenda virtuale che salvi tutto nel tempo

## 5. Schema Database (Supabase)

### Tabelle principali:
- `profiles` - Dati utente, cronotype, impostazioni
- `energy_scores` - Storico punteggi con componenti
- `activities` - Log attività con tipo, durata, mood, focus
- `sleep_logs` - Dati sonno con fasi
- `caffeine_logs` - Intake caffeina con tipo e quantità
- `hydration_logs` - Intake acqua
- `biometric_data` - Dati da Sahha (passi, HR, HRV)
- `ai_insights` - Analisi e consigli generati da Groq
- `weekly_reports` - Report settimanali con metriche aggregate
- `goals` - Obiettivi SMART attivi

## 6. Architettura Moduli

```
┌─────────────────────────────────────────────┐
│                  PWA Shell                   │
│  ┌─────┬──────┬────────┬────────┬────────┐  │
│  │Dash │Time  │Profile │Coaching│Reports │  │
│  │board│line  │       │        │        │  │
│  └──┬──┴──┬───┴───┬────┴───┬────┴───┬────┘  │
│     │     │       │        │        │        │
│  ┌──┴─────┴───────┴────────┴────────┴────┐  │
│  │         GSD Pipeline Engine            │  │
│  │  Capture→Clarify→Organize→Reflect→Engage│ │
│  └──┬─────────────────────────────────┬──┘  │
│     │                                 │      │
│  ┌──┴──────────┐  ┌──────────────────┴──┐  │
│  │Energy Engine│  │  Ralph Loop Engine   │  │
│  │•Circadian   │  │  •Review  •Analyze   │  │
│  │•Sleep Debt  │  │  •Learn   •Plan      │  │
│  │•Caffeine    │  │  •Habituate          │  │
│  │•Hydration   │  │                      │  │
│  │•Activity    │  │  BMAD Cycle:         │  │
│  └─────────────┘  │  Build→Measure→      │  │
│                    │  Analyze→Decide      │  │
│                    └─────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │            Services Layer              │  │
│  │  Supabase │ Groq AI │ Sahha │ Notif.  │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 7. Priorità e Sprint

### Sprint 1 (Foundation)
- [x] Architettura e struttura progetto
- [x] Modelli algoritmici (Energy, Sleep, Caffeine, Hydration, Circadian)
- [ ] App shell con routing e UI
- [ ] Servizi (Supabase, Groq, Sahha)

### Sprint 2 (Core Features)
- [ ] Dashboard con Energy Score
- [ ] Timeline e tracking attività
- [ ] Profilo utente completo
- [ ] GSD Pipeline engine

### Sprint 3 (Intelligence)
- [ ] Pattern detection e correlazioni
- [ ] Integrazione AI Groq per coaching
- [ ] Predizioni a 12h

### Sprint 4 (Engagement)
- [ ] Notifiche proattive e wind-down
- [ ] Report settimanali e heatmap
- [ ] Gamification e obiettivi SMART
- [ ] Sahha integration
