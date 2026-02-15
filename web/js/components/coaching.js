// Terminus PWA - Coaching Component
// Proactive AI coaching, suggestions, wind-down protocol, Ralph Loop visualization

import { analyzeEnergy, getDynamicSuggestion, analyzeTimeline } from '../services/groq.js';
import { calcEnergyScore } from '../models/energy.js';
import { getCurrentPhase } from '../models/circadian.js';
import { runCycle, getState as getRalphState } from '../models/ralph-loop.js';
import { runPipeline, getState as getGSDState } from '../models/gsd-pipeline.js';
import { Storage } from '../utils/storage.js';
import { formatTime, formatRelative } from '../utils/datetime.js';
import { setupWinddown } from '../services/notifications.js';

export function render(container, profile) {
  const energy = calcEnergyScore(profile);
  const phase = getCurrentPhase(profile?.chronotype || 'ORSO');
  const ralphState = getRalphState();
  const gsdState = getGSDState();
  const insightHistory = Storage.get('ai_insight_history', []);

  container.innerHTML = `
    <div class="coaching-page">
      <!-- Current State -->
      <div class="card coaching-state">
        <div class="coaching-energy" style="color: ${energy.color}">
          <span class="coaching-score">${energy.score}</span>/100
        </div>
        <div class="coaching-phase">
          ${phase.icon} ${phase.label}
        </div>
        <p class="coaching-suggestion">${energy.suggestion}</p>
      </div>

      <!-- AI Analysis -->
      <div class="card">
        <h3 class="card-title">🤖 Analisi IA</h3>
        <div id="ai-analysis" class="ai-content">
          <p class="text-muted">Premi il pulsante per ottenere un'analisi personalizzata dalla IA</p>
        </div>
        <button class="btn-primary" id="btn-ai-analyze">Analizza con Groq AI</button>
      </div>

      <!-- Dynamic Suggestions -->
      <div class="card">
        <h3 class="card-title">💡 Suggerimenti Dinamici</h3>
        <div class="suggestions-list">
          ${generateRuleSuggestions(energy, phase, profile).map(s => `
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
        <h3 class="card-title">🌙 Wind-down Protocol</h3>
        <p class="text-muted">Notifiche graduate prima del sonno per prepararti a dormire bene.</p>
        <div class="winddown-schedule">
          <div class="winddown-step">
            <span class="winddown-time">-2h</span>
            <span>Riduci luce blu e stimoli</span>
          </div>
          <div class="winddown-step">
            <span class="winddown-time">-1h</span>
            <span>Routine serale (lettura, tisana)</span>
          </div>
          <div class="winddown-step">
            <span class="winddown-time">-30min</span>
            <span>Spegni schermi, prepara camera</span>
          </div>
        </div>
        <button class="btn-secondary" id="btn-winddown">
          Attiva Wind-down (bedtime: ${profile?.bedtime || '23:00'})
        </button>
      </div>

      <!-- Ralph Loop Status -->
      <div class="card">
        <h3 class="card-title">🔄 Ralph Loop - Ciclo Miglioramento</h3>
        <div class="ralph-phases">
          ${['REVIEW', 'ANALYZE', 'LEARN', 'PLAN', 'HABITUATE'].map(p => `
            <div class="ralph-phase ${ralphState.currentPhase === p ? 'active' : ''}">
              <span class="ralph-icon">${getRalphIcon(p)}</span>
              <span class="ralph-name">${p}</span>
            </div>
          `).join('')}
        </div>
        <div class="ralph-info">
          <span>Cicli completati: ${ralphState.cycleCount || 0}</span>
          ${ralphState.lastCycle ? `<span>Ultimo: ${formatRelative(ralphState.lastCycle)}</span>` : ''}
        </div>
        <button class="btn-primary" id="btn-ralph-cycle">Esegui Ciclo Ralph</button>
      </div>

      <!-- Habit Streaks -->
      <div class="card">
        <h3 class="card-title">🔥 Streaks Abitudini</h3>
        <div id="habit-streaks" class="streaks-list">
          <p class="text-muted">Esegui un ciclo Ralph per vedere le tue streaks</p>
        </div>
      </div>

      <!-- AI Insight History -->
      ${insightHistory.length > 0 ? `
        <div class="card">
          <h3 class="card-title">📜 Storico Insight IA</h3>
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

  attachCoachingEvents(container, profile);
}

function generateRuleSuggestions(energy, phase, profile) {
  const suggestions = [];

  // Energy-based
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

  // Hydration check
  const hydration = Storage.getToday('hydration_logs');
  const totalWater = hydration.reduce((s, h) => s + (h.ml || 0), 0);
  const hour = new Date().getHours();
  if (totalWater < 500 && hour > 10) {
    suggestions.push({
      icon: '💧', text: `Hai bevuto solo ${totalWater}ml oggi. Bevi subito!`,
      priority: 'warning', action: 'log_water', actionLabel: 'Log Acqua',
    });
  }

  // Caffeine check
  if (hour >= 15) {
    suggestions.push({
      icon: '☕', text: 'Dopo le 15:00: evita caffeina per proteggere il sonno.',
      priority: 'info',
    });
  }

  // Phase-based
  if (phase.phase === 'winddown') {
    suggestions.push({
      icon: '🌙', text: 'Sei in fase wind-down. Riduci stimoli e luci.',
      priority: 'warning',
    });
  } else if (phase.phase === 'dip') {
    suggestions.push({
      icon: '📉', text: 'Calo pomeridiano. Una passeggiata breve aiuta.',
      priority: 'info',
    });
  }

  // Activity check
  const activities = Storage.getToday('activity_logs');
  const lastActivity = activities[activities.length - 1];
  if (lastActivity) {
    const minutesSince = (Date.now() - new Date(lastActivity.timestamp).getTime()) / 60000;
    if (minutesSince > 120 && lastActivity.type !== 'SLEEP') {
      suggestions.push({
        icon: '⏰', text: `Nessuna attività registrata da ${Math.round(minutesSince / 60)}h. Registra qualcosa!`,
        priority: 'info', action: 'log_activity', actionLabel: 'Registra',
      });
    }
  }

  return suggestions;
}

function getRalphIcon(phase) {
  const icons = { REVIEW: '📋', ANALYZE: '🔬', LEARN: '📚', PLAN: '🗺️', HABITUATE: '🔁' };
  return icons[phase] || '❓';
}

function attachCoachingEvents(container, profile) {
  // AI Analysis button
  const aiBtn = container.querySelector('#btn-ai-analyze');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      const analysisDiv = container.querySelector('#ai-analysis');
      aiBtn.disabled = true;
      aiBtn.textContent = 'Analisi in corso...';
      analysisDiv.innerHTML = '<div class="loading-dots">Analizzando i tuoi dati con Groq AI...</div>';

      try {
        const energy = calcEnergyScore(profile);
        const result = await analyzeEnergy(energy, profile);
        analysisDiv.innerHTML = `<div class="ai-response">${formatAIResponse(result)}</div>`;

        // Save to history
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

  // Wind-down button
  const winddownBtn = container.querySelector('#btn-winddown');
  if (winddownBtn) {
    winddownBtn.addEventListener('click', () => {
      setupWinddown(profile?.bedtime || '23:00');
      winddownBtn.textContent = 'Wind-down attivato!';
      winddownBtn.disabled = true;
      import('../services/notifications.js').then(m => m.requestPermission());
    });
  }

  // Ralph Loop button
  const ralphBtn = container.querySelector('#btn-ralph-cycle');
  if (ralphBtn) {
    ralphBtn.addEventListener('click', () => {
      ralphBtn.disabled = true;
      ralphBtn.textContent = 'Ciclo in corso...';

      try {
        const result = runCycle(profile);
        showRalphResults(container, result);
      } catch (err) {
        showToast('Errore nel ciclo Ralph');
      }

      ralphBtn.disabled = false;
      ralphBtn.textContent = 'Esegui Ciclo Ralph';
      render(container, profile); // Refresh
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
      } else if (action === 'log_activity') {
        window.location.hash = '#timeline';
      }
    });
  });
}

function showRalphResults(container, result) {
  const streaksDiv = container.querySelector('#habit-streaks');
  if (streaksDiv && result.habituate) {
    streaksDiv.innerHTML = result.habituate.habits.map(h => `
      <div class="streak-item ${h.completed ? 'completed' : ''}">
        <span class="streak-check">${h.completed ? '✅' : '⬜'}</span>
        <span class="streak-label">${h.label}</span>
        <span class="streak-count">${h.streak > 0 ? `🔥 ${h.streak}g` : ''}</span>
      </div>
    `).join('');
  }
}

function formatAIResponse(text) {
  // Convert markdown-like formatting to HTML
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n<br>• ')
    .replace(/\n\d\. /g, (m) => `<br>${m.trim()} `)
    .replace(/\n/g, '<br>');
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
}

export default { render };
