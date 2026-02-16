# Scenari di Validazione

## Scenari Principali

### S1: Primo Utilizzo (Cold Start)
- Utente apre l'app senza profilo
- Aspettato: mostra setup profilo, energy score 50 "Non configurato"
- Check: nessun crash, nessun NaN, navigazione funzionante

### S2: Check-in Giornaliero Completo
1. Utente compila profilo completo (cronotipo, sonno, peso, etc.)
2. Logga sonno (7.5h, qualita 4/5)
3. Logga 3 bicchieri d'acqua
4. Logga 2 caffe (espresso)
5. Logga 2 attivita (lavoro, pausa)
6. Fa check-in (mood 7, stress 4, focus 8)
- Aspettato: energy score 50-80, bottlenecks coerenti, previsione 12h visibile

### S3: GSD Pipeline Completo
1. Utente ha almeno 3 giorni di dati
2. Esegue "Analisi GSD" dal dashboard
- Aspettato: 5 fasi completano senza errore
- CAPTURE raccoglie dati dal localStorage
- CLARIFY produce dataQuality 0-100
- ORGANIZE produce energyScore + bottleneck
- REFLECT produce insights ordinati per priorita
- ENGAGE produce azioni + goals

### S4: Ralph Loop Completo
1. Utente ha almeno 7 giorni di dati
2. Esegue "Ciclo Ralph" dal coaching
- Aspettato: 5 fasi completano senza errore
- REVIEW mostra media settimanale
- ANALYZE trova correlazioni significative
- LEARN genera lezioni dal bottleneck
- PLAN produce SMART goals
- HABITUATE traccia streaks corrette

### S5: AI Coaching Chat
1. Utente ha Groq API key configurata
2. Apre sezione coaching
3. Scrive messaggio nella chat
- Aspettato: risposta AI coerente col contesto energetico
- Chat history mantenuta tra messaggi
- Input utente sanitizzato (no XSS)

## Scenari Limite (Edge Cases)

### E1: Nessun Dato
- Tutti i modelli chiamati senza dati in localStorage
- Aspettato: valori di default ragionevoli, nessun crash, nessun NaN/Infinity

### E2: Un Solo Giorno di Dati
- Solo 1 entry per ogni tipo di log
- Aspettato: calcoli funzionano, trend/correlazioni mostrano "dati insufficienti"

### E3: Dati Estremi
- Sleep: 0h o 14h
- Caffeine: 10+ espresso
- Water: 0ml o 5000ml
- Stress: 10/10 per 7 giorni
- Aspettato: score clamped 0-100, bottlenecks corretti, nessun overflow

### E4: Cronotipo Switch
- Utente cambia cronotipo da ORSO a LUPO
- Aspettato: circadian score ricalcolato, previsione 12h aggiornata

### E5: Offline Mode
- App funziona senza connessione
- Aspettato: service worker serve cache, Groq/Supabase/Sahha degradano gracefully

## Controlli Logici

### CL1: Energy Score Consistency
- score = circadian + sleep + lifestyle + allostatic - penalty
- score sempre in [0, 100]
- ogni componente in [0, 25]
- penalty in [0, 15]

### CL2: Sleep Debt Non-negative
- debt >= 0 sempre
- debt = 0 quando durata >= optimal per tutti i giorni

### CL3: Caffeine Decay Monotonic
- calcResidualCaffeine(t) <= calcResidualCaffeine(t-1) quando nessun nuovo intake

### CL4: Hydration Progress Bounded
- percentage in [0, 150]
- consumed >= 0
- remaining >= 0

### CL5: Pattern Correlations Valid
- pearsonCorrelation output in [-1, 1]
- Richiede minimo 3 data points
