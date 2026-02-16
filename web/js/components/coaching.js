// Terminus PWA - Coaching Component v3.0
// AI coaching, WOOP goals, multi-turn chat, habit streaks, activity guidance

import { analyzeEnergyCard, generateWOOPGoal, chat, getChatHistory, clearChatHistory, getDynamicSuggestion, analyzeRoutineOutlook } from '../services/groq.js';
import { calcEnergyScore, getRoutineOutlook } from '../models/energy.js';
import { getRecommendedActivities } from '../models/guidance.js';
import { getHabitStreaks } from '../models/habits.js';
import { getLatestCheckin } from '../models/checkin.js';
import { Storage } from '../utils/storage.js';
import { formatRelative } from '../utils/datetime.js';
import { setupWinddown } from '../services/notifications.js';
import { showToast, formatAIResponse, escapeHtml } from '../utils/ui.js';

export function render(container, profile) {
  const energy = calcEnergyScore(profile);
  const activities = getRecommendedActivities(energy.score, profile);
  const streaks = getHabitStreaks();
  const latestCheckin = getLatestCheckin();
  const chatHistory = getChatHistory();
  const insightHistory = Storage.get('ai_insight_history', []);

  container.innerHTML = `
    <div class="coaching-page">
      <!-- Current State -->
      <div class="card coaching-state">
        <div class="coaching-energy" style="color: ${energy.color}">
          <span class="coaching-score">${energy.score}</span>/100
        </div>
        <div class="coaching-phase">
          ${energy.components.circadian?.phase?.icon || '📊'} ${energy.components.circadian?.phase?.label || 'Attivo'}
        </div>
        <p class="coaching-suggestion">${energy.suggestion}</p>
      </div>

      <!-- AI Analysis -->
      <div class="card">
        <h3 class="card-title">Analisi IA Energetica</h3>
        <div id="ai-analysis" class="ai-content">
          <p class="text-muted">Analisi basata su 4 componenti: Circadiano, Sonno, Lifestyle, Allostatico</p>
        </div>
        <button class="btn-primary" id="btn-ai-analyze">Analizza con Groq AI</button>
      </div>

      <!-- Multi-turn Chat -->
      <div class="card">
        <h3 class="card-title">Chat con Terminus AI</h3>
        <div class="chat-container" id="chat-container">
          ${chatHistory.length > 0 ? chatHistory.slice(-6).map(m => `
            <div class="chat-msg ${m.role}">
              <div class="chat-bubble">${formatAIResponse(m.content)}</div>
            </div>
          `).join('') : '<p class="text-muted">Chiedi qualsiasi cosa sulla tua energia, sonno, abitudini...</p>'}
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Chiedi a Terminus AI..." class="chat-input">
          <button class="btn-primary btn-small" id="btn-chat-send">Invia</button>
        </div>
        ${chatHistory.length > 0 ? '<button class="btn-text" id="btn-chat-clear">Pulisci chat</button>' : ''}
      </div>

      <!-- WOOP Goals Wizard -->
      <div class="card">
        <h3 class="card-title">Obiettivi WOOP</h3>
        <p class="text-muted">Wish-Outcome-Obstacle-Plan: crea obiettivi scientifici</p>
        <div class="woop-modes">
          <button class="btn-secondary woop-btn" data-mode="energia">⚡ Energia</button>
          <button class="btn-secondary woop-btn" data-mode="produttivita">🎯 Produttivita</button>
          <button class="btn-secondary woop-btn" data-mode="benessere">🧘 Benessere</button>
        </div>
        <div id="woop-result" class="ai-content"></div>
      </div>

      <!-- Activity Guidance -->
      <div class="card">
        <h3 class="card-title">Attivita Consigliate</h3>
        <div class="activities-list">
          ${activities.slice(0, 6).map(a => `
            <div class="activity-item">
              <span class="activity-icon">${a.icon}</span>
              <div class="activity-info">
                <strong>${a.name}</strong>
                <span class="activity-meta">${a.duration} | ${a.category}</span>
              </div>
              <span class="activity-compat">${a.compatibility}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Dynamic Suggestions -->
      <div class="card">
        <h3 class="card-title">Suggerimenti</h3>
        <div class="suggestions-list">
          ${generateRuleSuggestions(energy, latestCheckin, profile).map(s => `
            <div class="suggestion-item ${s.priority}">
              <span class="suggestion-icon">${s.icon}</span>
              <div class="suggestion-text">
                <p>${s.text}</p>
                ${s.action ? `<button class="btn-small suggestion-action" data-action="${s.action}">${s.actionLabel}</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Wind-down Protocol -->
      <div class="card">
        <h3 class="card-title">Wind-down Protocol</h3>
        <div class="winddown-schedule">
          <div class="winddown-step"><span class="winddown-time">-2h</span><span>Riduci luce blu e stimoli</span></div>
          <div class="winddown-step"><span class="winddown-time">-1h</span><span>Routine serale (lettura, tisana)</span></div>
          <div class="winddown-step"><span class="winddown-time">-30min</span><span>Spegni schermi, prepara camera</span></div>
        </div>
        <button class="btn-secondary" id="btn-winddown">
          Attiva Wind-down (bedtime: ${profile?.bedtime || '23:00'})
        </button>
      </div>

      <!-- Habit Streaks -->
      <div class="card">
        <h3 class="card-title">Streaks Abitudini</h3>
        <div class="streaks-list">
          ${streaks.map(h => `
            <div class="streak-item ${h.completedToday ? 'completed' : ''}">
              <span class="streak-check">${h.completedToday ? '✅' : '⬜'}</span>
              <span class="streak-label">${h.label}</span>
              <div class="streak-meta">
                ${h.currentStreak > 0 ? `<span class="streak-fire">🔥 ${h.currentStreak}g</span>` : ''}
                <span class="streak-freq">${h.frequency}%</span>
                ${h.regularity !== 'irregolare' ? `<span class="streak-reg">${h.regularity}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- AI Insight History -->
      ${insightHistory.length > 0 ? `
        <div class="card">
          <h3 class="card-title">Storico Insight IA</h3>
          <div class="insight-history">
            ${insightHistory.slice(-5).reverse().map(i => `
              <div class="insight-history-item">
                <span class="insight-time">${formatRelative(i.timestamp)}</span>
                <p>${i.content.substring(0, 200)}...</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  attachCoachingEvents(container, profile, energy);
}

function generateRuleSuggestions(energy, checkin, profile) {
  const suggestions = [];
  const hour = new Date().getHours();

  if (energy.score >= 70) {
    suggestions.push({
      icon: '🧠', text: 'Energia alta! Perfetto per lavoro profondo o studio.',
      priority: 'positive', action: 'log_focus', actionLabel: 'Log Focus',
    });
  } else if (energy.score < 30) {
    suggestions.push({
      icon: '🛑', text: 'Energia critica. Fermati e riposa.',
      priority: 'critical',
    });
  }

  // Bottleneck-based suggestions
  if (energy.bottlenecks?.length > 0) {
    const top = energy.bottlenecks[0];
    suggestions.push({ icon: top.icon, text: top.advice, priority: top.severity === 'alta' ? 'warning' : 'info' });
  }

  // Hydration
  const totalWater = Storage.getToday('hydration_logs').reduce((s, h) => s + (h.ml || 0), 0);
  if (totalWater < 500 && hour > 10) {
    suggestions.push({
      icon: '💧', text: `Solo ${totalWater}ml d'acqua oggi. Bevi subito!`,
      priority: 'warning', action: 'log_water', actionLabel: 'Log Acqua',
    });
  }

  if (hour >= 15) {
    suggestions.push({ icon: '☕', text: 'Dopo le 15:00: evita caffeina per proteggere il sonno.', priority: 'info' });
  }

  // Checkin-based
  if (checkin?.stress && checkin.stress >= 7) {
    suggestions.push({ icon: '🧘', text: 'Stress elevato. Prova respirazione 4-7-8: inspira 4s, trattieni 7s, espira 8s.', priority: 'warning' });
  }

  return suggestions;
}

function attachCoachingEvents(container, profile, energy) {
  // AI Analysis
  const aiBtn = container.querySelector('#btn-ai-analyze');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      const analysisDiv = container.querySelector('#ai-analysis');
      aiBtn.disabled = true;
      aiBtn.textContent = 'Analisi in corso...';
      analysisDiv.innerHTML = '<div class="loading-dots">Analizzando con Groq AI...</div>';

      try {
        const result = await analyzeEnergyCard(energy, profile);
        analysisDiv.innerHTML = `<div class="ai-response">${formatAIResponse(result)}</div>`;
        const history = Storage.get('ai_insight_history', []);
        history.push({ content: result, timestamp: new Date().toISOString() });
        Storage.set('ai_insight_history', history.slice(-20));
      } catch (err) {
        analysisDiv.innerHTML = `<div class="error-msg">Errore: ${err.message}</div>`;
      }
      aiBtn.disabled = false;
      aiBtn.textContent = 'Analizza con Groq AI';
    });
  }

  // Multi-turn Chat
  const chatInput = container.querySelector('#chat-input');
  const chatSendBtn = container.querySelector('#btn-chat-send');
  if (chatInput && chatSendBtn) {
    const sendChat = async () => {
      const msg = chatInput.value.trim();
      if (!msg) return;

      chatInput.value = '';
      const chatContainer = container.querySelector('#chat-container');
      chatContainer.innerHTML += `<div class="chat-msg user"><div class="chat-bubble">${escapeHtml(msg)}</div></div>`;
      chatContainer.innerHTML += '<div class="chat-msg assistant"><div class="chat-bubble loading-dots">Pensando...</div></div>';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      try {
        const context = { energyScore: energy.score, phase: energy.components.circadian?.phase?.name, stress: energy.components.allostatic?.details?.stressLatest };
        const response = await chat(msg, context);
        const loadingMsg = chatContainer.querySelector('.loading-dots');
        if (loadingMsg) loadingMsg.closest('.chat-msg').remove();
        chatContainer.innerHTML += `<div class="chat-msg assistant"><div class="chat-bubble">${formatAIResponse(response)}</div></div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } catch (err) {
        const loadingMsg = chatContainer.querySelector('.loading-dots');
        if (loadingMsg) loadingMsg.closest('.chat-msg').remove();
        chatContainer.innerHTML += `<div class="chat-msg assistant"><div class="chat-bubble error-msg">Errore: ${err.message}</div></div>`;
      }
    };

    chatSendBtn.addEventListener('click', sendChat);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });
  }

  // Clear chat
  const clearBtn = container.querySelector('#btn-chat-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearChatHistory();
      render(container, profile);
    });
  }

  // WOOP Goals
  container.querySelectorAll('.woop-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      const resultDiv = container.querySelector('#woop-result');
      btn.disabled = true;
      resultDiv.innerHTML = '<div class="loading-dots">Generando obiettivo WOOP...</div>';

      try {
        const weakest = Object.entries(energy.components).sort((a, b) => a[1].score - b[1].score)[0];
        const context = {
          energyScore: energy.score,
          weakestComponent: weakest ? `${weakest[0]} (${weakest[1].score}/25)` : null,
          stress: energy.components.allostatic?.details?.stressLatest,
          mood: null,
          avgSleep: energy.components.sleep?.avgDuration,
          recentData: energy.components,
        };
        const result = await generateWOOPGoal(mode, context, profile);
        resultDiv.innerHTML = `<div class="ai-response">${formatAIResponse(result)}</div>`;
      } catch (err) {
        resultDiv.innerHTML = `<div class="error-msg">Errore: ${err.message}</div>`;
      }
      btn.disabled = false;
    });
  });

  // Wind-down
  const winddownBtn = container.querySelector('#btn-winddown');
  if (winddownBtn) {
    winddownBtn.addEventListener('click', () => {
      setupWinddown(profile?.bedtime || '23:00');
      winddownBtn.textContent = 'Wind-down attivato!';
      winddownBtn.disabled = true;
    });
  }

  // Suggestion actions
  container.querySelectorAll('.suggestion-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'log_water') {
        import('../models/hydration.js').then(m => {
          m.logHydration('water_medium');
          showToast('💧 500ml registrati');
          render(container, profile);
        });
      } else if (action === 'log_focus') {
        import('../models/energy.js').then(m => {
          m.logActivity('HIGH_FOCUS', 30);
          showToast('🧠 Focus registrato');
          render(container, profile);
        });
      }
    });
  });
}

export default { render };
