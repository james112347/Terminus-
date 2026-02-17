# Story 010: Update Service Worker Cache

> **Sprint:** 3 | **Priorità:** ALTO | **Fase ROADMAP:** 2

## Problema
`js/utils/ui.js` non è nella lista STATIC_ASSETS del service worker.
Contiene showToast(), formatAIResponse(), escapeHtml() - essenziali per UI.
In modalità offline, l'app si rompe perché il modulo non è cached.

## Soluzione
Aggiungere `./js/utils/ui.js` alla lista STATIC_ASSETS in sw.js.
Incrementare la versione cache a v3.1.0.

## Acceptance Criteria
- [ ] ui.js nella lista STATIC_ASSETS
- [ ] Cache version bumped
- [ ] Offline mode funziona correttamente
