# Story 003: Deduplicare Funzioni Condivise

## Descrizione
`showToast()` e duplicata in 4 componenti e `formatAIResponse()` in 2.
Queste vanno estratte in un modulo condiviso per eliminare la duplicazione.

## Funzioni Duplicate
- `showToast(message)` - dashboard.js, timeline.js, coaching.js, settings.js
- `formatAIResponse(text)` - coaching.js, reports.js

## Criteri di Accettazione
- [ ] Creato `utils/ui.js` con showToast e formatAIResponse
- [ ] Tutti i 6 file aggiornati per importare dal modulo condiviso
- [ ] Funzionamento identico al precedente
