// Terminus PWA - Dashboard Component v3.0
// Energy Score hero, 4-component breakdown, routine outlook, bottlenecks, quick check-in

import { calcEnergyScore, generatePredictionCurve, getRoutineOutlook } from '../models/energy.js';
import { calcResidualCaffeine } from '../models/caffeine.js';
import { calcHydrationProgress } from '../models/hydration.js';
import { getRecommendedActivities, getOptimalAction } from '../models/guidance.js';
import { calcDataQuality, logCheckin } from '../models/checkin.js';
import { Storage } from '../utils/storage.js';
import { showToast } from '../utils/ui.js';

export function render(container, profile) {
  const energy = calcEnergyScore(profile);
  const prediction = generatePredictionCurve(profile);
  const caffeineMg = calcResidualCaffeine();
  const hydration = calcHydrationProgress(profile?.weight || 70, profile?.activityLevel);
  const outlook = getRoutineOutlook(profile);
  const optimalAction = getOptimalAction(energy.score, profile);
  const dataQuality = calcDataQuality();

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
            ${energy.components.circadian?.phase?.icon || '📊'} ${energy.components.circadian?.phase?.label || 'Attivo'}
          </div>
          <p class="energy-suggestion">${energy.suggestion}</p>
          ${energy.interactionPenalty > 0 ? `<div class="interaction-warning">-${energy.interactionPenalty} penalita interazione (${energy.criticalCount} componenti critici)</div>` : ''}
        </div>
      </div>

      <!-- 4 Component Bars (0-25 each) -->
      <div class="card">
        <h3 class="card-title">Composizione Energy Score (4x25)</h3>
        <div class="components-list">
          ${renderComponent('circadian', 'Circadiano', energy.components.circadian)}
          ${renderComponent('sleep', 'Sonno', energy.components.sleep)}
          ${renderComponent('lifestyle', 'Lifestyle', energy.components.lifestyle)}
          ${renderComponent('allostatic', 'Allostatico', energy.components.allostatic)}
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">😴</div>
          <div class="stat-value">${energy.components.sleep?.avgDuration || '—'}h</div>
          <div class="stat-label">Media Sonno</div>
          <div class="stat-sub ${(energy.components.sleep?.debt || 0) > 3 ? 'stat-warn' : ''}">Debito: ${energy.components.sleep?.debt || 0}h</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">☕</div>
          <div class="stat-value">${Math.round(caffeineMg)}mg</div>
          <div class="stat-label">Caffeina Attiva</div>
          <div class="stat-sub">${caffeineMg > 200 ? 'Alta' : caffeineMg > 100 ? 'Moderata' : 'Bassa'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💧</div>
          <div class="stat-value">${hydration.percentage}%</div>
          <div class="stat-label">Idratazione</div>
          <div class="stat-sub">${hydration.consumed}/${hydration.target}ml</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${dataQuality}%</div>
          <div class="stat-label">Qualita Dati</div>
          <div class="stat-sub">${dataQuality >= 80 ? 'Ottima' : dataQuality >= 50 ? 'Sufficiente' : 'Migliora!'}</div>
        </div>
      </div>

      <!-- Optimal Action -->
      <div class="card optimal-action-card">
        <h3 class="card-title">Cosa fare ora?</h3>
        <div class="optimal-action">
          <span class="optimal-icon">${optimalAction.icon}</span>
          <div class="optimal-content">
            <strong>${optimalAction.name}</strong>
            <p>${optimalAction.reason}</p>
            ${optimalAction.duration ? `<span class="optimal-duration">${optimalAction.duration}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Routine Outlook -->
      <div class="card">
        <h3 class="card-title">Prospettiva Giornata</h3>
        <div class="routine-timeline">
          ${(outlook.events || []).slice(0, 6).map(e => `
            <div class="routine-event ${e.status}">
              <span class="routine-time">${e.time}</span>
              <span class="routine-icon">${e.icon}</span>
              <span class="routine-label">${e.label}</span>
            </div>
          `).join('')}
        </div>
        ${outlook.lifestyleProjection ? `
          <div class="lifestyle-projection">
            <span>💧 ${outlook.lifestyleProjection.hydrationPct}% idratazione</span>
            <span>☕ ~${outlook.lifestyleProjection.residualCaffeineBed}mg caffeina al bed</span>
            <span>📱 ${outlook.lifestyleProjection.screenMinutes}min schermo</span>
          </div>
        ` : ''}
      </div>

      <!-- Bottleneck Alerts -->
      ${energy.bottlenecks.length > 0 ? `
        <div class="card bottleneck-card">
          <h3 class="card-title">Bottleneck Rilevati</h3>
          ${energy.bottlenecks.slice(0, 3).map(b => `
            <div class="bottleneck-item ${b.severity}">
              <div class="bottleneck-header">
                <span>${b.icon} ${b.label}</span>
                <span class="bottleneck-severity">${b.severity}</span>
              </div>
              <p class="bottleneck-advice">${b.advice}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- 12h Prediction Chart -->
      <div class="card">
        <h3 class="card-title">Previsione Energia 12h</h3>
        <div class="prediction-chart" id="prediction-chart">
          <canvas id="prediction-canvas" width="340" height="160"></canvas>
        </div>
      </div>

      <!-- Quick Check-in -->
      <div class="card">
        <h3 class="card-title">Check-in Rapido</h3>
        <div class="checkin-grid" id="checkin-grid">
          <div class="checkin-row">
            <label>Umore</label>
            <div class="checkin-slider-wrap">
              <input type="range" min="1" max="10" value="5" class="checkin-slider" data-field="mood">
              <span class="checkin-value">5</span>
            </div>
          </div>
          <div class="checkin-row">
            <label>Stress</label>
            <div class="checkin-slider-wrap">
              <input type="range" min="1" max="10" value="5" class="checkin-slider" data-field="stress">
              <span class="checkin-value">5</span>
            </div>
          </div>
          <div class="checkin-row">
            <label>Focus</label>
            <div class="checkin-slider-wrap">
              <input type="range" min="1" max="10" value="5" class="checkin-slider" data-field="focus">
              <span class="checkin-value">5</span>
            </div>
          </div>
          <div class="checkin-row">
            <label>Energia Fisica</label>
            <div class="checkin-slider-wrap">
              <input type="range" min="1" max="10" value="5" class="checkin-slider" data-field="physicalEnergy">
              <span class="checkin-value">5</span>
            </div>
          </div>
        </div>
        <button class="btn-primary" id="btn-checkin">Salva Check-in</button>
      </div>

      <!-- Quick Log Buttons -->
      <div class="card">
        <h3 class="card-title">Log Rapido</h3>
        <div class="quick-actions">
          <button class="quick-btn" data-action="caffeine" data-type="espresso">☕ Espresso</button>
          <button class="quick-btn" data-action="water" data-type="water_medium">💧 Acqua 500ml</button>
          <button class="quick-btn" data-action="activity" data-type="HIGH_FOCUS">🧠 Focus</button>
          <button class="quick-btn" data-action="activity" data-type="RECOVERY">🧘 Pausa</button>
          <button class="quick-btn" data-action="activity" data-type="EXERCISE_LIGHT">🚶 Camminata</button>
          <button class="quick-btn" data-action="activity" data-type="MEAL">🍽️ Pasto</button>
        </div>
      </div>
    </div>
  `;

  // Draw prediction chart
  setTimeout(() => drawPredictionChart(prediction, energy.score), 50);

  // Attach events
  attachDashboardEvents(container, profile);
}

function renderComponent(key, label, comp) {
  if (!comp) return '';
  const pct = (comp.score / comp.max) * 100;
  return `
    <div class="component-row">
      <div class="component-info">
        <span class="component-name">${label}</span>
        <span class="component-score">${comp.score}/${comp.max}</span>
      </div>
      <div class="component-bar-bg">
        <div class="component-bar" style="width: ${pct}%; background: ${getComponentColor(pct)}"></div>
      </div>
    </div>
  `;
}

function drawPredictionChart(prediction, currentScore) {
  const canvas = document.getElementById('prediction-canvas');
  if (!canvas || !prediction?.length) return;

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

  // Grid
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg3') || '#eee';
  ctx.lineWidth = 0.5;
  for (let y = 0; y <= 100; y += 25) {
    const py = pad.top + plotH - (y / 100) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(pad.left + plotW, py); ctx.stroke();
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text3') || '#999';
    ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(y, pad.left - 5, py + 3);
  }

  // Hour labels
  ctx.textAlign = 'center';
  for (let i = 0; i <= 12; i += 2) {
    const px = pad.left + (i / 12) * plotW;
    ctx.fillText(`+${i}h`, px, h - 5);
  }

  // Energy curve
  ctx.strokeStyle = '#6c5ce7'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  prediction.forEach((p, i) => {
    const px = pad.left + ((p.hour || p.x || 0) / 12) * plotW;
    const py = pad.top + plotH - ((p.energy || p.y || 0) / 100) * plotH;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Fill area
  const last = prediction[prediction.length - 1];
  ctx.lineTo(pad.left + ((last.hour || last.x || 12) / 12) * plotW, pad.top + plotH);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.closePath(); ctx.fillStyle = 'rgba(108, 92, 231, 0.08)'; ctx.fill();

  // Current dot
  ctx.fillStyle = '#6c5ce7'; ctx.beginPath();
  ctx.arc(pad.left, pad.top + plotH - (currentScore / 100) * plotH, 5, 0, Math.PI * 2); ctx.fill();

  // Low zone line
  ctx.strokeStyle = 'rgba(231, 76, 111, 0.3)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); const lowLine = pad.top + plotH - (40 / 100) * plotH;
  ctx.moveTo(pad.left, lowLine); ctx.lineTo(pad.left + plotW, lowLine); ctx.stroke();
  ctx.setLineDash([]);
}

function getComponentColor(pct) {
  if (pct >= 70) return '#26c281';
  if (pct >= 50) return '#4a90d9';
  if (pct >= 30) return '#f4b740';
  return '#e74c6f';
}

function attachDashboardEvents(container, profile) {
  // Check-in sliders
  container.querySelectorAll('.checkin-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      slider.nextElementSibling.textContent = slider.value;
    });
  });

  // Check-in submit
  const checkinBtn = container.querySelector('#btn-checkin');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', () => {
      const data = {};
      container.querySelectorAll('.checkin-slider').forEach(slider => {
        data[slider.dataset.field] = parseInt(slider.value);
      });
      logCheckin(data);
      showToast('Check-in salvato!');
      render(container, profile);
    });
  }

  // Quick actions
  container.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const type = btn.dataset.type;

      switch (action) {
        case 'caffeine':
          import('../models/caffeine.js').then(m => {
            m.logCaffeine(type);
            showToast('☕ Caffeina registrata');
            render(container, profile);
          });
          break;
        case 'water':
          import('../models/hydration.js').then(m => {
            m.logHydration(type);
            showToast('💧 Acqua registrata');
            render(container, profile);
          });
          break;
        case 'activity':
          import('../models/energy.js').then(m => {
            m.logActivity(type, type === 'MEAL' ? 0 : 30);
            showToast(`${btn.textContent.trim()} registrato`);
            render(container, profile);
          });
          break;
      }
    });
  });
}

export default { render };
