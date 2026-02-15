// Terminus PWA - Dashboard Component
// Main view showing Energy Score, predictions, quick actions

import { calcEnergyScore, generatePredictionCurve, identifyBottleneck } from '../models/energy.js';
import { getCurrentPhase } from '../models/circadian.js';
import { calcResidualCaffeine } from '../models/caffeine.js';
import { calcHydrationProgress } from '../models/hydration.js';
import { calcSleepDebt } from '../models/sleep.js';
import { Storage } from '../utils/storage.js';
import { formatTime } from '../utils/datetime.js';

export function render(container, profile) {
  const energy = calcEnergyScore(profile);
  const phase = getCurrentPhase(profile?.chronotype || 'ORSO');
  const prediction = generatePredictionCurve(profile);
  const caffeineMg = calcResidualCaffeine();
  const hydration = calcHydrationProgress(profile?.weight || 70, profile?.activityLevel);
  const sleepData = calcSleepDebt();
  const bottleneck = identifyBottleneck(profile);

  container.innerHTML = `
    <div class="dashboard">
      <!-- Energy Score Hero -->
      <div class="energy-hero">
        <div class="energy-ring" style="--score: ${energy.score}; --color: ${energy.color}">
          <div class="energy-ring-inner">
            <span class="energy-number">${energy.score}</span>
            <span class="energy-label">${energy.label}</span>
          </div>
        </div>
        <div class="energy-meta">
          <div class="phase-badge" style="background: ${energy.color}20; color: ${energy.color}">
            ${phase.icon} ${phase.label}
          </div>
          <p class="energy-suggestion">${energy.suggestion}</p>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">😴</div>
          <div class="stat-value">${sleepData.avgDuration}h</div>
          <div class="stat-label">Media Sonno</div>
          <div class="stat-sub ${sleepData.debt > 3 ? 'stat-warn' : ''}">Debito: ${sleepData.debt}h</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">☕</div>
          <div class="stat-value">${Math.round(caffeineMg)}mg</div>
          <div class="stat-label">Caffeina Attiva</div>
          <div class="stat-sub">${caffeineMg > 100 ? 'Moderata' : 'Bassa'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💧</div>
          <div class="stat-value">${hydration.percentage}%</div>
          <div class="stat-label">Idratazione</div>
          <div class="stat-sub">${hydration.consumed}/${hydration.target}ml</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🧠</div>
          <div class="stat-value">${energy.components.circadian?.score || '—'}</div>
          <div class="stat-label">Circadiano</div>
          <div class="stat-sub">${phase.label}</div>
        </div>
      </div>

      <!-- Energy Components Breakdown -->
      <div class="card">
        <h3 class="card-title">Composizione Energy Score</h3>
        <div class="components-list">
          ${Object.entries(energy.components).map(([key, comp]) => `
            <div class="component-row">
              <div class="component-info">
                <span class="component-name">${comp.label}</span>
                <span class="component-weight">${Math.round(comp.weight * 100)}%</span>
              </div>
              <div class="component-bar-bg">
                <div class="component-bar" style="width: ${comp.score}%; background: ${getComponentColor(comp.score)}"></div>
              </div>
              <span class="component-score">${comp.score}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 12h Prediction Chart -->
      <div class="card">
        <h3 class="card-title">Previsione Energia 12h</h3>
        <div class="prediction-chart" id="prediction-chart">
          <canvas id="prediction-canvas" width="340" height="160"></canvas>
        </div>
      </div>

      <!-- Bottleneck Alert -->
      ${bottleneck ? `
        <div class="card bottleneck-card">
          <div class="bottleneck-icon">⚠️</div>
          <div class="bottleneck-content">
            <h4>Bottleneck: ${bottleneck.label}</h4>
            <p>${bottleneck.message}</p>
          </div>
        </div>
      ` : ''}

      <!-- Quick Log Buttons -->
      <div class="card">
        <h3 class="card-title">Log Rapido</h3>
        <div class="quick-actions">
          <button class="quick-btn" data-action="caffeine" data-type="espresso">☕ Espresso</button>
          <button class="quick-btn" data-action="water" data-type="water_medium">💧 Acqua 500ml</button>
          <button class="quick-btn" data-action="mood">😊 Umore</button>
          <button class="quick-btn" data-action="activity" data-type="HIGH_FOCUS">🧠 Focus</button>
          <button class="quick-btn" data-action="activity" data-type="RECOVERY">🧘 Pausa</button>
          <button class="quick-btn" data-action="sleep">😴 Sonno</button>
        </div>
      </div>

      <!-- GSD Phase Indicator -->
      <div class="card gsd-card">
        <h3 class="card-title">Pipeline GSD</h3>
        <div class="gsd-phases">
          <div class="gsd-phase active">📥 Capture</div>
          <div class="gsd-phase">🔍 Clarify</div>
          <div class="gsd-phase">📊 Organize</div>
          <div class="gsd-phase">🤔 Reflect</div>
          <div class="gsd-phase">🚀 Engage</div>
        </div>
        <button class="btn-primary" id="btn-run-gsd">Esegui Analisi GSD</button>
      </div>
    </div>
  `;

  // Draw prediction chart
  setTimeout(() => drawPredictionChart(prediction, energy.score), 50);

  // Attach event listeners
  attachDashboardEvents(container, profile);
}

function drawPredictionChart(prediction, currentScore) {
  const canvas = document.getElementById('prediction-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const pad = { top: 20, right: 15, bottom: 30, left: 35 };

  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Background grid
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg3') || '#eee';
  ctx.lineWidth = 0.5;
  for (let y = 0; y <= 100; y += 25) {
    const py = pad.top + plotH - (y / 100) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text3') || '#999';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(y, pad.left - 5, py + 3);
  }

  // Hour labels
  ctx.textAlign = 'center';
  for (let i = 0; i <= 12; i += 2) {
    const px = pad.left + (i / 12) * plotW;
    const hour = prediction.find(p => Math.abs(p.x - i) < 0.01);
    ctx.fillText(`+${i}h`, px, h - 5);
  }

  // Draw energy curve
  ctx.strokeStyle = '#6c5ce7';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  prediction.forEach((p, i) => {
    const px = pad.left + (p.x / 12) * plotW;
    const py = pad.top + plotH - (p.y / 100) * plotH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Fill area under curve
  const lastP = prediction[prediction.length - 1];
  ctx.lineTo(pad.left + (lastP.x / 12) * plotW, pad.top + plotH);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(108, 92, 231, 0.08)';
  ctx.fill();

  // Current score dot
  const currentPx = pad.left;
  const currentPy = pad.top + plotH - (currentScore / 100) * plotH;
  ctx.fillStyle = '#6c5ce7';
  ctx.beginPath();
  ctx.arc(currentPx, currentPy, 5, 0, Math.PI * 2);
  ctx.fill();

  // Low energy zone
  const lowLine = pad.top + plotH - (40 / 100) * plotH;
  ctx.strokeStyle = 'rgba(231, 76, 111, 0.3)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, lowLine);
  ctx.lineTo(pad.left + plotW, lowLine);
  ctx.stroke();
  ctx.setLineDash([]);
}

function getComponentColor(score) {
  if (score >= 70) return '#26c281';
  if (score >= 50) return '#4a90d9';
  if (score >= 30) return '#f4b740';
  return '#e74c6f';
}

function attachDashboardEvents(container, profile) {
  // Quick action buttons
  container.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const type = btn.dataset.type;

      switch (action) {
        case 'caffeine':
          import('../models/caffeine.js').then(m => {
            m.logCaffeine(type);
            showToast('☕ Caffeina registrata');
            render(container, profile); // Refresh
          });
          break;
        case 'water':
          import('../models/hydration.js').then(m => {
            m.logHydration(type);
            showToast('💧 Acqua registrata');
            render(container, profile);
          });
          break;
        case 'mood':
          showMoodPicker(container, profile);
          break;
        case 'activity':
          import('../models/energy.js').then(m => {
            m.logActivity(type, 30);
            showToast(`${type === 'HIGH_FOCUS' ? '🧠' : '🧘'} Attività registrata`);
            render(container, profile);
          });
          break;
        case 'sleep':
          window.location.hash = '#timeline';
          break;
      }
    });
  });

  // GSD button
  const gsdBtn = container.querySelector('#btn-run-gsd');
  if (gsdBtn) {
    gsdBtn.addEventListener('click', async () => {
      gsdBtn.textContent = 'Analisi in corso...';
      gsdBtn.disabled = true;
      try {
        const { runPipeline } = await import('../models/gsd-pipeline.js');
        const result = runPipeline(profile);
        showGSDResults(container, result);
      } catch (err) {
        showToast('Errore nell\'analisi GSD');
      }
      gsdBtn.textContent = 'Esegui Analisi GSD';
      gsdBtn.disabled = false;
    });
  }
}

function showMoodPicker(container, profile) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Come ti senti?</h3>
      <div class="mood-picker">
        <button class="mood-btn" data-mood="1">😫<br>Pessimo</button>
        <button class="mood-btn" data-mood="2">😞<br>Male</button>
        <button class="mood-btn" data-mood="3">😐<br>Medio</button>
        <button class="mood-btn" data-mood="4">😊<br>Bene</button>
        <button class="mood-btn" data-mood="5">😄<br>Ottimo</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
    const moodBtn = e.target.closest('.mood-btn');
    if (moodBtn) {
      const mood = parseInt(moodBtn.dataset.mood);
      import('../models/energy.js').then(m => {
        m.logActivity('RECOVERY', 0, { mood });
        showToast(`Umore registrato: ${['', '😫', '😞', '😐', '😊', '😄'][mood]}`);
        overlay.remove();
        render(container, profile);
      });
    }
  });

  document.body.appendChild(overlay);
}

function showGSDResults(container, result) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-large">
      <h3>🔬 Risultati Analisi GSD</h3>
      <div class="gsd-results">
        <div class="gsd-section">
          <h4>⚡ Energy Score: ${result.energyScore?.score || '—'}/100</h4>
          <p>${result.energyScore?.suggestion || ''}</p>
        </div>
        <div class="gsd-section">
          <h4>💡 Insight (${result.insights?.length || 0})</h4>
          ${(result.insights || []).slice(0, 5).map(i => `
            <div class="insight-item ${i.type}">
              <span class="insight-badge">${i.type}</span>
              ${i.text}
            </div>
          `).join('')}
        </div>
        <div class="gsd-section">
          <h4>🎯 Obiettivi SMART</h4>
          ${(result.goals || []).map(g => `
            <div class="goal-item">
              <strong>${g.specific}</strong>
              <div class="goal-meta">${g.measurable} • ${g.timeBound}</div>
            </div>
          `).join('')}
        </div>
        <div class="gsd-section">
          <h4>📋 Azioni (${result.actions?.length || 0})</h4>
          ${(result.actions || []).slice(0, 3).map(a => `
            <div class="action-item">${a.text}</div>
          `).join('')}
        </div>
      </div>
      <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Chiudi</button>
    </div>
  `;

  document.body.appendChild(overlay);
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
