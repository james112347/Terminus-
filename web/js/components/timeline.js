// Terminus PWA - Timeline Component
// Activity tracking, logging, and daily agenda view

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { logActivity, getTodayLoad } from '../models/energy.js';
import { logCaffeine, CAFFEINE_SOURCES, getTodayCaffeine } from '../models/caffeine.js';
import { logHydration, HYDRATION_SOURCES, getTodayHydration } from '../models/hydration.js';
import { logSleep } from '../models/sleep.js';
import { formatTime, formatRelative } from '../utils/datetime.js';
import { showToast, escapeHtml } from '../utils/ui.js';

export function render(container, profile) {
  const activities = Storage.getToday('activity_logs');
  const load = getTodayLoad();
  const caffeine = getTodayCaffeine();
  const hydration = getTodayHydration();

  // Merge all logs into unified timeline
  const timeline = [
    ...activities.map(a => ({ ...a, category: 'activity' })),
    ...caffeine.map(c => ({ ...c, category: 'caffeine', label: c.label, icon: '☕' })),
    ...hydration.map(h => ({ ...h, category: 'hydration', label: h.label, icon: '💧' })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  container.innerHTML = `
    <div class="timeline-page">
      <!-- Day Summary -->
      <div class="card day-summary">
        <div class="day-summary-row">
          <div class="day-stat">
            <span class="day-stat-value">${activities.length}</span>
            <span class="day-stat-label">Attività</span>
          </div>
          <div class="day-stat">
            <span class="day-stat-value" style="color: ${load.net < -15 ? '#e74c6f' : '#26c281'}">${load.net > 0 ? '+' : ''}${load.net}</span>
            <span class="day-stat-label">Carico Netto</span>
          </div>
          <div class="day-stat">
            <span class="day-stat-value">${Math.round(caffeine.reduce((s, c) => s + c.mg, 0))}mg</span>
            <span class="day-stat-label">Caffeina</span>
          </div>
          <div class="day-stat">
            <span class="day-stat-value">${hydration.reduce((s, h) => s + h.ml, 0)}ml</span>
            <span class="day-stat-label">Acqua</span>
          </div>
        </div>
      </div>

      <!-- Add Activity Button Group -->
      <div class="card">
        <h3 class="card-title">Registra</h3>
        <div class="log-categories">
          <button class="log-cat-btn" data-modal="activity">
            <span class="log-cat-icon">📋</span>
            <span>Attività</span>
          </button>
          <button class="log-cat-btn" data-modal="caffeine">
            <span class="log-cat-icon">☕</span>
            <span>Caffeina</span>
          </button>
          <button class="log-cat-btn" data-modal="hydration">
            <span class="log-cat-icon">💧</span>
            <span>Acqua</span>
          </button>
          <button class="log-cat-btn" data-modal="sleep">
            <span class="log-cat-icon">😴</span>
            <span>Sonno</span>
          </button>
          <button class="log-cat-btn" data-modal="mood">
            <span class="log-cat-icon">😊</span>
            <span>Umore</span>
          </button>
        </div>
      </div>

      <!-- Timeline -->
      <div class="card">
        <h3 class="card-title">Timeline di Oggi</h3>
        <div class="timeline-list">
          ${timeline.length === 0 ? `
            <div class="timeline-empty">
              <p>Nessuna attività registrata oggi.</p>
              <p class="text-muted">Inizia a tracciare la tua giornata!</p>
            </div>
          ` : timeline.map(item => `
            <div class="timeline-item ${item.category}">
              <div class="timeline-dot" style="background: ${getCategoryColor(item.category)}"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="timeline-icon">${item.icon || getActivityIcon(item.type)}</span>
                  <span class="timeline-label">${item.label}</span>
                  <span class="timeline-time">${formatTime(item.timestamp)}</span>
                </div>
                ${item.duration ? `<span class="timeline-duration">${item.duration}min</span>` : ''}
                ${item.mg ? `<span class="timeline-detail">${item.mg}mg</span>` : ''}
                ${item.ml ? `<span class="timeline-detail">${item.ml}ml</span>` : ''}
                ${item.mood ? `<span class="timeline-detail">Umore: ${['', '😫', '😞', '😐', '😊', '😄'][item.mood]}</span>` : ''}
                ${item.focus ? `<span class="timeline-detail">Focus: ${item.focus}/5</span>` : ''}
                ${item.notes ? `<span class="timeline-notes">${escapeHtml(item.notes)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  attachTimelineEvents(container, profile);
}

function getCategoryColor(category) {
  const colors = { activity: '#6c5ce7', caffeine: '#f0883e', hydration: '#4a90d9', sleep: '#a855f7' };
  return colors[category] || '#6c5ce7';
}

function getActivityIcon(type) {
  return CONFIG.ACTIVITY_TYPES[type]?.icon || '📋';
}

function attachTimelineEvents(container, profile) {
  container.querySelectorAll('.log-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.dataset.modal;
      switch (modal) {
        case 'activity': showActivityModal(container, profile); break;
        case 'caffeine': showCaffeineModal(container, profile); break;
        case 'hydration': showHydrationModal(container, profile); break;
        case 'sleep': showSleepModal(container, profile); break;
        case 'mood': showMoodFocusModal(container, profile); break;
      }
    });
  });
}

function showActivityModal(container, profile) {
  const types = Object.entries(CONFIG.ACTIVITY_TYPES)
    .filter(([k]) => !['CAFFEINE', 'HYDRATION', 'SLEEP'].includes(k));

  const overlay = createModal(`
    <h3>Registra Attività</h3>
    <div class="modal-form">
      <label>Tipo</label>
      <div class="type-grid">
        ${types.map(([key, t]) => `
          <button class="type-btn" data-type="${key}">${t.icon}<br>${t.label}</button>
        `).join('')}
      </div>
      <label>Durata (minuti)</label>
      <input type="range" id="activity-duration" min="5" max="180" value="30" step="5">
      <span id="duration-display">30 min</span>
      <label>Note (opzionale)</label>
      <input type="text" id="activity-notes" placeholder="Es. riunione importante...">
      <button class="btn-primary" id="btn-save-activity" disabled>Salva</button>
    </div>
  `);

  let selectedType = null;
  overlay.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedType = btn.dataset.type;
      overlay.querySelector('#btn-save-activity').disabled = false;
    });
  });

  const durationInput = overlay.querySelector('#activity-duration');
  const durationDisplay = overlay.querySelector('#duration-display');
  durationInput.addEventListener('input', () => {
    durationDisplay.textContent = `${durationInput.value} min`;
  });

  overlay.querySelector('#btn-save-activity').addEventListener('click', () => {
    if (!selectedType) return;
    logActivity(selectedType, parseInt(durationInput.value), {
      notes: overlay.querySelector('#activity-notes').value,
    });
    overlay.remove();
    showToast('Attività registrata!');
    render(container, profile);
  });
}

function showCaffeineModal(container, profile) {
  const overlay = createModal(`
    <h3>☕ Registra Caffeina</h3>
    <div class="modal-form">
      <div class="type-grid">
        ${Object.entries(CAFFEINE_SOURCES).map(([key, s]) => `
          <button class="type-btn" data-type="${key}">${s.icon}<br>${s.label}<br><small>${s.mg}mg</small></button>
        `).join('')}
      </div>
    </div>
  `);

  overlay.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      logCaffeine(btn.dataset.type);
      overlay.remove();
      showToast('☕ Caffeina registrata');
      render(container, profile);
    });
  });
}

function showHydrationModal(container, profile) {
  const overlay = createModal(`
    <h3>💧 Registra Acqua</h3>
    <div class="modal-form">
      <div class="type-grid">
        ${Object.entries(HYDRATION_SOURCES).map(([key, s]) => `
          <button class="type-btn" data-type="${key}">${s.icon}<br>${s.label}<br><small>${s.ml}ml</small></button>
        `).join('')}
      </div>
    </div>
  `);

  overlay.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      logHydration(btn.dataset.type);
      overlay.remove();
      showToast('💧 Acqua registrata');
      render(container, profile);
    });
  });
}

function showSleepModal(container, profile) {
  const overlay = createModal(`
    <h3>😴 Registra Sonno</h3>
    <div class="modal-form">
      <label>Ora addormentamento</label>
      <input type="time" id="sleep-bedtime" value="23:00">
      <label>Ora risveglio</label>
      <input type="time" id="sleep-waketime" value="07:00">
      <label>Qualità (1-5)</label>
      <div class="quality-picker">
        ${[1, 2, 3, 4, 5].map(q => `
          <button class="quality-btn" data-quality="${q}">${q}</button>
        `).join('')}
      </div>
      <label>Risvegli notturni</label>
      <input type="number" id="sleep-interruptions" value="0" min="0" max="10">
      <label>Note</label>
      <input type="text" id="sleep-notes" placeholder="Es. incubi, caldo...">
      <button class="btn-primary" id="btn-save-sleep">Salva</button>
    </div>
  `);

  let quality = null;
  overlay.querySelectorAll('.quality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      quality = parseInt(btn.dataset.quality);
    });
  });

  overlay.querySelector('#btn-save-sleep').addEventListener('click', () => {
    logSleep({
      bedtime: overlay.querySelector('#sleep-bedtime').value,
      wakeTime: overlay.querySelector('#sleep-waketime').value,
      quality,
      interruptions: parseInt(overlay.querySelector('#sleep-interruptions').value),
      notes: overlay.querySelector('#sleep-notes').value,
    });
    overlay.remove();
    showToast('😴 Sonno registrato');
    render(container, profile);
  });
}

function showMoodFocusModal(container, profile) {
  const overlay = createModal(`
    <h3>Come ti senti?</h3>
    <div class="modal-form">
      <label>Umore</label>
      <div class="mood-picker">
        ${CONFIG.MOOD_SCALE.map(m => `
          <button class="mood-btn" data-mood="${m.value}">${m.emoji}<br><small>${m.label}</small></button>
        `).join('')}
      </div>
      <label>Focus</label>
      <div class="mood-picker">
        ${CONFIG.FOCUS_SCALE.map(f => `
          <button class="focus-btn" data-focus="${f.value}">${f.emoji}<br><small>${f.label}</small></button>
        `).join('')}
      </div>
      <button class="btn-primary" id="btn-save-mood">Salva</button>
    </div>
  `);

  let mood = null, focus = null;

  overlay.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      mood = parseInt(btn.dataset.mood);
    });
  });

  overlay.querySelectorAll('.focus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.focus-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      focus = parseInt(btn.dataset.focus);
    });
  });

  overlay.querySelector('#btn-save-mood').addEventListener('click', () => {
    if (mood || focus) {
      logActivity('RECOVERY', 0, { mood, focus });
      overlay.remove();
      showToast('Stato registrato!');
      render(container, profile);
    }
  });
}

function createModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export default { render };
