# Story 005: Sanitizzazione XSS Input Utente

## Descrizione
L'input utente (note attivita, note sonno, nomi) viene inserito direttamente
nel DOM via innerHTML senza sanitizzazione. Questo espone a XSS.

## Aree Coinvolte
- timeline.js: `${item.notes}` nel template
- profile.js: `${profile.name}` nel template
- coaching.js: messaggi chat utente nel template

## Criteri di Accettazione
- [ ] Creata funzione `escapeHtml(str)` in utils/ui.js
- [ ] Tutti gli input utente sono sanitizzati prima del rendering
- [ ] Caratteri < > & " ' vengono escaped correttamente
