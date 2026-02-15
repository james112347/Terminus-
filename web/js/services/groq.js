// Terminus PWA - Groq AI Service
// Provides AI analysis, coaching, and insight generation via Groq API

import { CONFIG } from '../config.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

async function callGroq(messages, options = {}) {
  const apiKey = CONFIG.GROQ_API_KEY || localStorage.getItem('terminus_groq_key');
  if (!apiKey) throw new Error('Groq API key non configurata. Vai in Impostazioni.');

  const model = options.fast ? CONFIG.GROQ_MODEL_FAST : CONFIG.GROQ_MODEL;

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${CONFIG.GROQ_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        throw new Error(`Groq API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && err.message.includes('fetch')) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }
  throw lastError;
}

// System prompt for the wellness coaching AI
const SYSTEM_PROMPT = `Sei Terminus AI, un assistente di wellness e produttività avanzato.
Rispondi SEMPRE in italiano. Sii conciso, pratico e basato sui dati.
Il tuo ruolo è:
1. Analizzare dati biometrici e comportamentali dell'utente
2. Identificare pattern e correlazioni
3. Dare suggerimenti personalizzati e actionable
4. Usare un tono motivante ma realistico
5. Basarti su evidenze scientifiche (cronobiologia, sleep science, nutrizione)

Formatta le risposte in modo chiaro con bullet points o sezioni brevi.
Non usare mai disclaimer medici generici - dai consigli specifici basati sui dati.`;

// Analyze energy data and provide coaching
export async function analyzeEnergy(energyData, profile) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analizza il mio stato energetico attuale e dammi 3 consigli pratici immediati.

**Energy Score:** ${energyData.score}/100 (${energyData.label})
**Componenti:**
- Ritmo Circadiano: ${energyData.components.circadian?.score}/100
- Sonno: ${energyData.components.sleep?.score}/100 (debito: ${energyData.components.sleep?.data?.debt || 0}h)
- Carico Attività: ${energyData.components.activity?.score}/100
- Stile di Vita: ${energyData.components.lifestyle?.score}/100 (caffeina: ${energyData.components.lifestyle?.caffeine}/100, idratazione: ${energyData.components.lifestyle?.hydration}/100)

**Profilo:** Cronotipo ${profile?.chronotype || 'Orso'}, ${profile?.age || '?'} anni, ${profile?.weight || '?'}kg
**Ora attuale:** ${new Date().toLocaleTimeString('it-IT')}

Dammi:
1. Diagnosi rapida (cosa sta causando il punteggio attuale)
2. Azione immediata (cosa fare ORA)
3. Piano per le prossime 4 ore` },
  ];

  return await callGroq(messages);
}

// Generate weekly report analysis
export async function analyzeWeeklyReport(weekData) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Genera un report settimanale completo basato su questi dati:

**Energia Media:** ${weekData.avgEnergy}/100
**Trend:** ${weekData.trend}
**Bottleneck principale:** ${weekData.bottleneck?.label || 'Nessuno identificato'}
**Sonno medio:** ${weekData.avgSleep}h/notte
**Giorni con energia alta (>70):** ${weekData.highDays}/7
**Giorni con energia bassa (<40):** ${weekData.lowDays}/7
**Correlazioni trovate:** ${weekData.correlations?.map(c => `${c.name}: r=${c.r}`).join(', ') || 'Dati insufficienti'}

Genera:
1. **Riepilogo** (2-3 frasi)
2. **Bottleneck della settimana** (il fattore singolo che ha impattato di più)
3. **Pattern rilevati** (crash ricorrenti, miglioramenti)
4. **3 obiettivi SMART** per la prossima settimana` },
  ];

  return await callGroq(messages, { maxTokens: 1500 });
}

// Analyze lifestyle habits for coaching
export async function analyzeHabits(habitData) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analizza le mie abitudini e dimmi come ottimizzare la mia energia:

**Abitudini registrate:**
${JSON.stringify(habitData, null, 2)}

Identifica:
1. Abitudini positive da mantenere
2. Abitudini negative da cambiare
3. Un piano pratico giornaliero ottimizzato` },
  ];

  return await callGroq(messages);
}

// Generate dynamic suggestion based on current state
export async function getDynamicSuggestion(context) {
  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nRispondi in MAX 2 frasi. Sii diretto e pratico.` },
    { role: 'user', content: `Energy: ${context.energy}/100, Ora: ${context.time}, Fase: ${context.phase}, Prossima attività suggerita?` },
  ];

  return await callGroq(messages, { fast: true, maxTokens: 100, temperature: 0.5 });
}

// Virtual agenda: analyze timeline and predict energy
export async function analyzeTimeline(timeline, profile) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analizza la mia timeline di oggi e predici come andrà il resto della giornata:

**Timeline:**
${timeline.map(t => `${t.time} - ${t.label} (${t.duration}min) [Mood: ${t.mood || '?'}, Focus: ${t.focus || '?'}]`).join('\n')}

**Cronotipo:** ${profile?.chronotype || 'Orso'}
**Energy Score attuale:** ${profile?.currentEnergy || '?'}

Analizza:
1. Come ho usato la mia energia finora
2. Previsione per le prossime ore
3. Suggerimento per ottimizzare il resto della giornata` },
  ];

  return await callGroq(messages, { maxTokens: 800 });
}

// Health check - verify API is working
export async function healthCheck() {
  try {
    const result = await callGroq(
      [{ role: 'user', content: 'Rispondi solo "OK"' }],
      { fast: true, maxTokens: 10, temperature: 0 }
    );
    return { ok: true, response: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export default {
  analyzeEnergy, analyzeWeeklyReport, analyzeHabits,
  getDynamicSuggestion, analyzeTimeline, healthCheck,
};
