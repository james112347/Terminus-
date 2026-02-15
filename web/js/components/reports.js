// Terminus PWA - Reports & Gamification Component
// Weekly reports, heatmap, bottleneck analysis, SMART goals

import { Storage } from '../utils/storage.js';
import { mean } from '../utils/stats.js';
import { getEnergyTrend, identifyWeeklyBottleneck, generateSMARTGoals, analyzeCorrelations } from '../models/patterns.js';
import { calcSleepDebt } from '../models/sleep.js';
import { analyzeWeeklyReport } from '../services/groq.js';
import { dayName, dayOfWeek, eachDay, startOfWeek, formatDate } from '../utils/datetime.js';

export function render(container, profile) {
  const energyHistory = Storage.getLastDays('energy_scores', 30);
  const trend = getEnergyTrend(14);
  const bottleneck = identifyWeeklyBottleneck();
  const sleepData = calcSleepDebt();
  const correlations = analyzeCorrelations();
  const goals = generateSMARTGoals(bottleneck, profile);

  // Build weekly heatmap data
  const heatmapData = buildHeatmap(energyHistory);

  container.innerHTML = `
    <div class="reports-page">
      <!-- Energy Trend -->
      <div class="card">
        <h3 class="card-title">📈 Trend Energia (14 giorni)</h3>
        <div class="trend-summary">
          <div class="trend-stat">
            <span class="trend-direction ${trend.trend}">${getTrendIcon(trend.trend)}</span>
            <span class="trend-label">${getTrendLabel(trend.trend)}</span>
          </div>
          <div class="trend-stat">
            <span class="trend-value">${trend.average || '—'}</span>
            <span class="trend-label">Media</span>
          </div>
        </div>
        <div class="trend-chart">
          <canvas id="trend-canvas" width="340" height="140"></canvas>
        </div>
      </div>

      <!-- Weekly Heatmap -->
      <div class="card">
        <h3 class="card-title">🗓️ Heatmap Energia</h3>
        <div class="heatmap-container">
          <div class="heatmap-labels">
            ${['', '06', '09', '12', '15', '18', '21'].map(h => `<span class="heatmap-hour">${h}</span>`).join('')}
          </div>
          ${[0, 1, 2, 3, 4, 5, 6].map(day => `
            <div class="heatmap-row">
              <span class="heatmap-day">${dayName(day)}</span>
              ${[6, 9, 12, 15, 18, 21].map(hour => {
                const value = heatmapData[`${day}-${hour}`];
                return `<div class="heatmap-cell" style="background: ${getHeatColor(value)}" title="${dayName(day)} ${hour}:00 - ${value ? Math.round(value) : '—'}"></div>`;
              }).join('')}
            </div>
          `).join('')}
          <div class="heatmap-legend">
            <span>Basso</span>
            <div class="heatmap-gradient"></div>
            <span>Alto</span>
          </div>
        </div>
      </div>

      <!-- Bottleneck -->
      <div class="card ${bottleneck ? 'bottleneck-highlight' : ''}">
        <h3 class="card-title">⚠️ Bottleneck Settimanale</h3>
        ${bottleneck ? `
          <div class="bottleneck-detail">
            <div class="bottleneck-icon-large">${getBottleneckIcon(bottleneck.component)}</div>
            <h4>${bottleneck.label}</h4>
            <p>Fattore limitante nel <strong>${bottleneck.percentage}%</strong> delle rilevazioni questa settimana.</p>
            <div class="bottleneck-bar-bg">
              <div class="bottleneck-bar" style="width: ${bottleneck.percentage}%"></div>
            </div>
          </div>
        ` : `
          <p class="text-muted">Dati insufficienti per identificare un bottleneck. Continua a tracciare!</p>
        `}
      </div>

      <!-- Correlations -->
      <div class="card">
        <h3 class="card-title">🔗 Correlazioni</h3>
        ${correlations.length > 0 ? `
          <div class="correlations-list">
            ${correlations.map(c => `
              <div class="correlation-item">
                <div class="correlation-header">
                  <span class="correlation-name">${c.name}</span>
                  <span class="correlation-r" style="color: ${Math.abs(c.r) > 0.5 ? '#6c5ce7' : '#999'}">${c.r > 0 ? '+' : ''}${c.r}</span>
                </div>
                <div class="correlation-bar-bg">
                  <div class="correlation-bar ${c.r > 0 ? 'positive' : 'negative'}" style="width: ${Math.abs(c.r) * 100}%"></div>
                </div>
                <span class="correlation-desc">${c.description}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="text-muted">Servono almeno 5 giorni di dati per calcolare correlazioni.</p>
        `}
      </div>

      <!-- SMART Goals -->
      <div class="card">
        <h3 class="card-title">🎯 Obiettivi SMART</h3>
        <div class="goals-list">
          ${goals.map((g, i) => `
            <div class="goal-card">
              <div class="goal-number">${i + 1}</div>
              <div class="goal-content">
                <h4>${g.specific}</h4>
                <div class="goal-meta">
                  <span class="goal-tag">📏 ${g.measurable}</span>
                  <span class="goal-tag">⏱️ ${g.timeBound}</span>
                </div>
                <p class="goal-relevant">${g.relevant}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- AI Weekly Report -->
      <div class="card">
        <h3 class="card-title">📊 Report IA Settimanale</h3>
        <div id="weekly-ai-report">
          <p class="text-muted">Genera un report dettagliato con l'analisi AI</p>
        </div>
        <button class="btn-primary" id="btn-weekly-report">Genera Report AI</button>
      </div>

      <!-- Sleep Stats -->
      <div class="card">
        <h3 class="card-title">😴 Riepilogo Sonno</h3>
        <div class="sleep-stats">
          <div class="sleep-stat">
            <span class="sleep-stat-value">${sleepData.avgDuration}h</span>
            <span class="sleep-stat-label">Media/notte</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-stat-value ${sleepData.debt > 5 ? 'text-danger' : ''}">${sleepData.debt}h</span>
            <span class="sleep-stat-label">Debito 7gg</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-stat-value">${sleepData.score}/100</span>
            <span class="sleep-stat-label">Score</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-stat-value">${getTrendIcon(sleepData.trend)}</span>
            <span class="sleep-stat-label">Trend</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Draw trend chart
  setTimeout(() => drawTrendChart(trend), 50);

  attachReportEvents(container, profile, trend, bottleneck, sleepData, correlations);
}

function buildHeatmap(energyHistory) {
  const map = {};

  energyHistory.forEach(e => {
    const d = new Date(e.timestamp);
    const dow = dayOfWeek(d);
    const hour = Math.floor(d.getHours() / 3) * 3; // Group by 3h blocks
    const key = `${dow}-${hour}`;

    if (!map[key]) map[key] = [];
    map[key].push(e.score);
  });

  const result = {};
  for (const [key, values] of Object.entries(map)) {
    result[key] = mean(values);
  }
  return result;
}

function getHeatColor(value) {
  if (!value) return 'var(--bg3)';
  if (value >= 70) return 'rgba(38, 194, 129, 0.7)';
  if (value >= 50) return 'rgba(74, 144, 217, 0.5)';
  if (value >= 30) return 'rgba(244, 183, 64, 0.5)';
  return 'rgba(231, 76, 111, 0.5)';
}

function getTrendIcon(trend) {
  const icons = { improving: '📈', stable: '➡️', declining: '📉', insufficient: '❓' };
  return icons[trend] || '❓';
}

function getTrendLabel(trend) {
  const labels = { improving: 'In miglioramento', stable: 'Stabile', declining: 'In calo', insufficient: 'Dati insufficienti' };
  return labels[trend] || 'N/D';
}

function getBottleneckIcon(component) {
  const icons = { sleep: '😴', lifestyle: '☕', activity: '🏃', circadian: '🌅' };
  return icons[component] || '⚠️';
}

function drawTrendChart(trend) {
  const canvas = document.getElementById('trend-canvas');
  if (!canvas || !trend.data?.length) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const pad = { top: 15, right: 10, bottom: 25, left: 35 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const data = trend.data;
  const n = data.length;

  // Grid
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg3') || '#eee';
  ctx.lineWidth = 0.5;
  [0, 25, 50, 75, 100].forEach(y => {
    const py = pad.top + plotH - (y / 100) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, py);
    ctx.lineTo(pad.left + plotW, py);
    ctx.stroke();
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text3') || '#999';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(y, pad.left - 5, py + 3);
  });

  // Data points and line
  ctx.strokeStyle = '#6c5ce7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const px = pad.left + (i / (n - 1)) * plotW;
    const py = pad.top + plotH - (d.score / 100) * plotH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Moving average line
  if (trend.movingAverage?.length) {
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    trend.movingAverage.forEach((v, i) => {
      const px = pad.left + (i / (n - 1)) * plotW;
      const py = pad.top + plotH - (v / 100) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Date labels
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text3') || '#999';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  [0, Math.floor(n / 2), n - 1].forEach(i => {
    if (data[i]) {
      const px = pad.left + (i / (n - 1)) * plotW;
      ctx.fillText(formatDate(data[i].timestamp), px, h - 5);
    }
  });
}

function attachReportEvents(container, profile, trend, bottleneck, sleepData, correlations) {
  const reportBtn = container.querySelector('#btn-weekly-report');
  if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
      const reportDiv = container.querySelector('#weekly-ai-report');
      reportBtn.disabled = true;
      reportBtn.textContent = 'Generazione in corso...';
      reportDiv.innerHTML = '<div class="loading-dots">Analizzando la settimana con Groq AI...</div>';

      try {
        const weekData = {
          avgEnergy: trend.average || 0,
          trend: trend.trend,
          bottleneck,
          avgSleep: sleepData.avgDuration,
          highDays: (trend.data || []).filter(d => d.score >= 70).length,
          lowDays: (trend.data || []).filter(d => d.score < 40).length,
          correlations,
        };

        const result = await analyzeWeeklyReport(weekData);
        reportDiv.innerHTML = `<div class="ai-response">${formatAIResponse(result)}</div>`;
      } catch (err) {
        reportDiv.innerHTML = `<div class="error-msg">Errore: ${err.message}</div>`;
      }

      reportBtn.disabled = false;
      reportBtn.textContent = 'Genera Report AI';
    });
  }
}

function formatAIResponse(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n<br>• ')
    .replace(/\n\d\. /g, (m) => `<br>${m.trim()} `)
    .replace(/\n/g, '<br>');
}

export default { render };
