// Terminus PWA - Groq AI Service v3.0
// Enhanced: WOOP goals wizard, multi-turn chat, energy card analysis,
// data quality assessment, bottleneck interpretation

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const CHAT_KEY = 'groq_chat_history';

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

// System prompt
const SYSTEM_PROMPT = `Sei Terminus AI, un assistente di wellness e produttivita avanzato.
Rispondi SEMPRE in italiano. Sii conciso, pratico e basato sui dati.
Il tuo ruolo e:
1. Analizzare dati biometrici e comportamentali dell'utente
2. Identificare pattern e correlazioni
3. Dare suggerimenti personalizzati e actionable
4. Usare un tono motivante ma realistico
5. Basarti su evidenze scientifiche (Borbely, Van Dongen, McEwen, Ganio, Nehlig)

Modello Energy Score: 4 componenti x 25 = 100 (Circadiano, Sonno, Lifestyle, Allostatico)
Con penalita interazione fino a -15 quando multipli componenti sono critici.

Formatta le risposte in modo chiaro con bullet points o sezioni brevi.
Non usare mai disclaimer medici generici - dai consigli specifici basati sui dati.`;

// === 1. Energy Card Analysis ===
export async function analyzeEnergyCard(energyData, profile) {
  const components = energyData.components || {};
  const bottlenecks = energyData.bottlenecks || [];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analizza il mio stato energetico e dammi 3 consigli pratici immediati.

**Energy Score:** ${energyData.score}/100 (${energyData.label})
**Penalita Interazione:** -${energyData.interactionPenalty || 0} (${energyData.criticalCount || 0} componenti critici)

**Componenti (0-25 ciascuno):**
- Circadiano: ${components.circadian?.score || '?'}/25 — Fase: ${components.circadian?.phase?.name || '?'}
- Sonno: ${components.sleep?.score || '?'}/25 — Debito: ${components.sleep?.debt || 0}h, Durata media: ${components.sleep?.avgDuration || '?'}h, Trend: ${components.sleep?.trend || '?'}
- Lifestyle: ${components.lifestyle?.score || '?'}/25 — Idratazione: ${components.lifestyle?.details?.hydrationPct || '?'}%, Caffeina: ${components.lifestyle?.details?.caffeineTotalMg || 0}mg, Esercizio: ${components.lifestyle?.details?.exerciseMinutes || 0}min
- Allostatico: ${components.allostatic?.score || '?'}/25 — Lavoro: ${components.allostatic?.details?.workHours || 0}h, Stress: ${components.allostatic?.details?.stressLatest || '?'}/10

**Bottleneck principali:** ${bottlenecks.slice(0, 3).map(b => `${b.icon} ${b.label} (${b.severity})`).join(', ') || 'Nessuno'}

**Profilo:** Cronotipo ${profile?.chronotype || 'Orso'}, ${profile?.age || '?'} anni, ${profile?.weight || '?'}kg
**Ora:** ${new Date().toLocaleTimeString('it-IT')}

Dammi:
1. **Diagnosi** (cosa causa il punteggio attuale, riferimenti ai 4 componenti)
2. **Azione immediata** (cosa fare ORA, specifica e pratica)
3. **Piano prossime 4 ore** (con orari)` },
  ];

  return await callGroq(messages, { maxTokens: 1200 });
}

// === 2. WOOP Goals Wizard (3 modes) ===
export async function generateWOOPGoal(mode, context, profile) {
  const modePrompts = {
    energia: `L'utente vuole migliorare la sua energia. Score attuale: ${context.energyScore}/100. Componente piu debole: ${context.weakestComponent || '?'}.`,
    produttivita: `L'utente vuole essere piu produttivo. Finestre picco: ${context.peakWindows || '?'}. Ore lavoro: ${context.workHours || '?'}.`,
    benessere: `L'utente vuole migliorare il benessere generale. Stress: ${context.stress || '?'}/10, Mood: ${context.mood || '?'}/10, Sonno: ${context.avgSleep || '?'}h.`,
  };

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nUsa il framework WOOP (Wish-Outcome-Obstacle-Plan) per creare un obiettivo concreto.` },
    { role: 'user', content: `Crea un obiettivo WOOP per: ${mode.toUpperCase()}

${modePrompts[mode] || modePrompts.energia}

**Profilo:** ${profile?.chronotype || 'Orso'}, ${profile?.age || '?'} anni
**Dati recenti:** ${JSON.stringify(context.recentData || {}).substring(0, 500)}

Genera un obiettivo WOOP strutturato:
1. **Wish (Desiderio):** Cosa vuole raggiungere in modo specifico
2. **Outcome (Risultato):** Come si sentira/cosa cambiera quando raggiunge l'obiettivo
3. **Obstacle (Ostacolo):** L'ostacolo interno principale che potrebbe impedirlo
4. **Plan (Piano):** "Se [ostacolo], allora [azione specifica]"

Aggiungi anche:
- **Metrica:** Come misurare il progresso
- **Timeline:** Quando raggiungere l'obiettivo
- **Check-in:** Quando fare il punto della situazione` },
  ];

  return await callGroq(messages, { maxTokens: 1000 });
}

// === 3. Multi-turn Chat ===
export async function chat(userMessage, context = {}) {
  const history = Storage.get(CHAT_KEY, []);

  const contextPrompt = context.energyScore
    ? `\n\nContesto attuale: Energy ${context.energyScore}/100, Fase ${context.phase || '?'}, Stress ${context.stress || '?'}/10, Ora ${new Date().toLocaleTimeString('it-IT')}`
    : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + contextPrompt },
    ...history.slice(-8),
    { role: 'user', content: userMessage },
  ];

  const response = await callGroq(messages, { maxTokens: 800 });

  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: response });
  Storage.set(CHAT_KEY, history.slice(-20));

  return response;
}

export function getChatHistory() {
  return Storage.get(CHAT_KEY, []);
}

export function clearChatHistory() {
  Storage.set(CHAT_KEY, []);
}

// === 4. Weekly Report Analysis ===
export async function analyzeWeeklyReport(reportData) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Genera un report settimanale completo:

**Voto Complessivo:** ${reportData.overallGrade?.letter || '?'} (${reportData.overallGrade?.score || '?'}/100)
**Periodo:** ${reportData.period?.start || '?'} - ${reportData.period?.end || '?'} (${reportData.period?.days || 0} giorni)

**Dimensioni (A-F):**
- Energia: ${reportData.dimensions?.energy?.grade?.letter || '?'} (${reportData.dimensions?.energy?.score || '?'}/100)
- Sonno: ${reportData.dimensions?.sleep?.grade?.letter || '?'} (${reportData.dimensions?.sleep?.avgHours || '?'}h/notte, ${reportData.dimensions?.sleep?.onTarget || 0}/7 on-target)
- Lifestyle: ${reportData.dimensions?.lifestyle?.grade?.letter || '?'} (${reportData.dimensions?.lifestyle?.score || '?'}/100)
- Consistenza: ${reportData.dimensions?.consistency?.grade?.letter || '?'} (variabilita ±${reportData.dimensions?.consistency?.stdDev || '?'})
- Progresso: ${reportData.dimensions?.progress?.grade?.letter || '?'}

**Stats:** Media ${reportData.stats?.avgEnergy || '?'}, Best ${reportData.stats?.bestDay || '?'}, Worst ${reportData.stats?.worstDay || '?'}
**Giorni alti (>70):** ${reportData.stats?.highDays || 0}/7, **Bassi (<40):** ${reportData.stats?.lowDays || 0}/7
**Bottleneck:** ${reportData.bottleneck?.label || 'Nessuno'} (media ${reportData.bottleneck?.avgScore || '?'}/25)
**Trend:** ${reportData.trend || '?'}
**Correlazioni:** ${(reportData.significantCorrelations || []).map(c => `${c.name}: r=${c.r}`).join(', ') || 'N/D'}

Genera:
1. **Pagella** (commento A-F)
2. **Top 3 Successi**
3. **Top 3 Aree di Miglioramento**
4. **Bottleneck** (analisi del fattore limitante)
5. **3 Obiettivi WOOP** per la prossima settimana` },
  ];

  return await callGroq(messages, { maxTokens: 2000 });
}

// === 5. Data Quality Assessment ===
export async function assessDataQuality(qualityScore, details) {
  if (qualityScore >= 80) return null;

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nRispondi in MAX 3 frasi. Sii motivante.` },
    { role: 'user', content: `Qualita dati: ${qualityScore}/100. Check-in=${details.checkins || 0}, log giornaliero=${details.dailyLog ? 'si' : 'no'}, attivita=${details.activities || 0}, sonno=${details.sleep ? 'si' : 'no'}, caffeina=${details.caffeine || 0}, idratazione=${details.hydration || 0}. Cosa registrare?` },
  ];

  return await callGroq(messages, { fast: true, maxTokens: 200, temperature: 0.5 });
}

// === 6. Bottleneck Interpretation ===
export async function interpretBottleneck(bottleneck, energyData, profile) {
  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nRispondi in MAX 4 frasi. Usa evidenze scientifiche.` },
    { role: 'user', content: `Bottleneck: ${bottleneck.label} (severita: ${bottleneck.severity}). Valore: ${bottleneck.value}. Energy: ${energyData.score}/100. Cronotipo: ${profile?.chronotype || 'Orso'}. Spiega e dai azione concreta.` },
  ];

  return await callGroq(messages, { fast: true, maxTokens: 250, temperature: 0.5 });
}

// === 7. Dynamic Suggestion ===
export async function getDynamicSuggestion(context) {
  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nRispondi in MAX 2 frasi.` },
    { role: 'user', content: `Energy: ${context.energy}/100, Fase: ${context.phase}, Ora: ${context.time}, Stress: ${context.stress || '?'}/10, Idratazione: ${context.hydration || '?'}%. Prossima azione?` },
  ];

  return await callGroq(messages, { fast: true, maxTokens: 100, temperature: 0.5 });
}

// === 8. Routine Outlook Analysis ===
export async function analyzeRoutineOutlook(outlook, profile) {
  const upcomingEvents = (outlook.events || []).map(e => `${e.time} ${e.icon} ${e.label}`).join('\n');
  const projection = outlook.lifestyleProjection || {};

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nRispondi conciso con consigli per le prossime ore.` },
    { role: 'user', content: `Eventi rimanenti:\n${upcomingEvents || 'Nessuno'}\n\nProiezione: Idratazione ${projection.hydrationPct || '?'}% (mancano ${projection.hydrationRemaining || '?'}ml), Caffeina bed ~${projection.residualCaffeineBed || '?'}mg, Schermo ${projection.screenMinutes || 0}min.\nFase: ${outlook.currentPhase?.name || '?'}. Cronotipo: ${profile?.chronotype || 'Orso'}.\n\n1. Ottimizza prossime ore\n2. Alert urgenti\n3. Pre-sonno` },
  ];

  return await callGroq(messages, { maxTokens: 600 });
}

// Health check
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
  analyzeEnergyCard, generateWOOPGoal, chat, getChatHistory, clearChatHistory,
  analyzeWeeklyReport, assessDataQuality, interpretBottleneck,
  getDynamicSuggestion, analyzeRoutineOutlook, healthCheck,
};
