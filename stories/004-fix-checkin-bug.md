# Story 004: Fix Bug Check-in Data Quality

## Descrizione
In checkin.js riga 148, la condizione `caffeine.length >= 0` e sempre true
perche la lunghezza di un array e sempre >= 0. Questo assegna 5 punti
di data quality gratis anche quando non ci sono log caffeina.

## Fix
Cambiare `caffeine.length >= 0` in `caffeine.length > 0`

## Criteri di Accettazione
- [ ] Il punteggio data quality riflette correttamente la presenza di log caffeina
- [ ] Un utente senza log caffeina oggi non riceve i 5 punti bonus
