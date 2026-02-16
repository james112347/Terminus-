// Terminus PWA - Reports & Gamification Component v3.0
// A-F weekly grading, 5-module ML visualization, correlations, SMART goals

import { Storage } from '../utils/storage.js';
import { mean } from '../utils/stats.js';
import { generateWeeklyReport, generateSMARTGoals, discoverCorrelations, analyzeTrends, detectAllPatterns, generatePredictions } from '../models/patterns.js';
import { calcSleepScore } from '../models/sleep.js';
import { analyzeWeeklyReport } from '../services/groq.js';
import { dayName, dayOfWeek, formatDate } from '../utils/datetime.js';
import { formatAIResponse } from '../utils/ui.js';

export function render(container, profile) {
  const report = generateWeeklyReport();
  const trends = analyzeTrends();
  const patterns = detectAllPatterns();
  const predictions = generatePredictions();
  const correlations = discoverCorrelations();
  const goals = generateSMARTGoals(profile);
  const sleep = calcSleepScore(profile);
  const energyHistory = Storage.getLastDays('energy_scores', 30);
  const heatmapData = buildHeatmap(energyHistory);

  container.innerHTML = `
    <div class="reports-page">
      <!-- Weekly Grade Card -->
      ${report.available ? `
        <div class="card grade-card" style="border-left: 4px solid ${report.overallGrade.color}">
          <div class="grade-hero">
            <div class="grade-letter" style="color: ${report.overallGrade.color}">${report.overallGrade.letter}</div>
            <div class="grade-info">
              <h3>${report.overallGrade.label}</h3>
              <span>Score composito: ${report.overallGrade.score}/100</span>
              <span class="grade-period">${report.period.start} - ${report.period.end}</span>
            </div>
          </div>
          <div class="grade-dimensions">
            ${Object.entries(report.dimensions).map(([key, dim]) => `
              <div class="grade-dim">
                <span class="grade-dim-letter" style="color: ${dim.grade.color}">${dim.grade.letter}</span>
                <span class="grade-dim-name">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span class="grade-dim-weight">${dim.weight}</span>
              </div>
            `).join('')}
          </div>
          <div class="grade-stats">
            <span>Media: ${report.stats.avgEnergy}</span>
            <span>Best: ${report.stats.bestDay}</span>
            <span>Worst: ${report.stats.worstDay}</span>
            <span>Alti: ${report.stats.highDays}/7</span>
            <span>Bassi: ${report.stats.lowDays}/7</span>
          </div>
        </div>
      ` : '<div class="card"><p class="text-muted">Registra almeno 3 giorni per il report settimanale</p></div>'}

      <!-- Energy Trend -->
      <div class="card">
        <h3 class="card-title">Trend Energia</h3>
        ${trends.energy.windows ? `
          <div class="trend-windows">
            ${Object.entries(trends.energy.windows).map(([window, data]) => `
              <div class="trend-window">
                <span class="trend-period">${window}</span>
                <span class="trend-direction ${data.trend}">${getTrendIcon(data.trend)}</span>
                <span class="trend-mean">${data.mean}</span>
              </div>
            `).join('')}
          </div>
          ${trends.energy.periodComparison ? `
            <div class="period-comparison ${trends.energy.periodComparison.label}">
              <span>vs settimana scorsa: ${trends.energy.periodComparison.change > 0 ? '+' : ''}${trends.energy.periodComparison.change}%</span>
              <span>${trends.energy.periodComparison.label}</span>
            </div>
          ` : ''}
        ` : '<p class="text-muted">Dati insufficienti</p>'}
        <div class="trend-chart"><canvas id="trend-canvas" width="340" height="140"></canvas></div>
      </div>

      <!-- Predictions & Alarms -->
      ${predictions.available ? `
        <div class="card">
          <h3 class="card-title">Previsioni & Allarmi</h3>
          <div class="prediction-summary">
            <div class="prediction-value">
              <span>Previsione domani:</span>
              <strong style="color: ${predictions.predicted >= 60 ? '#26c281' : predictions.predicted >= 40 ? '#f4b740' : '#e74c6f'}">${predictions.predicted}/100</strong>
              <span>Confidenza: ${predictions.confidence}%</span>
            </div>
            ${predictions.crashAlarm ? `
              <div class="crash-alarm">
                <span class="alarm-icon">⚠️</span>
                <span>CRASH ALARM: ${predictions.crashReason}</span>
              </div>
            ` : ''}
          </div>
          ${predictions.alarms.length > 0 ? `
            <div class="alarms-list">
              ${predictions.alarms.map(a => `
                <div class="alarm-item ${a.severity}">
                  <span>${a.icon}</span>
                  <span>${a.message}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Weekly Heatmap -->
      <div class="card">
        <h3 class="card-title">Heatmap Energia</h3>
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
          <div class="heatmap-legend"><span>Basso</span><div class="heatmap-gradient"></div><span>Alto</span></div>
        </div>
      </div>

      <!-- Patterns -->
      ${patterns.weeklyCycles ? `
        <div class="card">
          <h3 class="card-title">Pattern Settimanali</h3>
          <div class="pattern-summary">
            <span>Giorno migliore: <strong>${patterns.weeklyCycles.bestDay || '?'}</strong></span>
            <span>Giorno peggiore: <strong>${patterns.weeklyCycles.worstDay || '?'}</strong></span>
            ${patterns.weeklyCycles.weekendEffect ? `<span>${patterns.weeklyCycles.weekendEffect.label}</span>` : ''}
          </div>
          ${patterns.productivityWindows ? `
            <div class="productivity-peaks">
              <h4>Finestre Produttive</h4>
              ${patterns.productivityWindows.peakHours.map(p => `
                <span class="peak-badge">⚡ ${p.hour} (${p.energy}/100)</span>
              `).join('')}
            </div>
          ` : ''}
          ${patterns.crashPatterns?.patterns.length > 0 ? `
            <div class="crash-patterns">
              <h4>Crash Ricorrenti</h4>
              ${patterns.crashPatterns.patterns.map(c => `<p>${c.description}</p>`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Correlations -->
      <div class="card">
        <h3 class="card-title">Correlazioni</h3>
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
                <span class="correlation-desc">${c.interpretation}</span>
                ${c.tertileAnalysis?.impact ? `<span class="tertile-impact">Impatto: ${c.tertileAnalysis.impact > 0 ? '+' : ''}${c.tertileAnalysis.impact} punti</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-muted">Servono almeno 5 giorni di dati</p>'}
      </div>

      <!-- Bottleneck -->
      ${report.available && report.bottleneck ? `
        <div class="card bottleneck-highlight">
          <h3 class="card-title">Bottleneck Settimanale</h3>
          <div class="bottleneck-detail">
            <h4>${report.bottleneck.label}</h4>
            <p>Media: ${report.bottleneck.avgScore}/25 - il componente piu debole questa settimana</p>
            <div class="component-averages">
              ${Object.entries(report.componentAverages).map(([key, val]) => `
                <div class="comp-avg ${key === report.bottleneck.component ? 'worst' : ''}">
                  <span>${key}</span>
                  <span>${Math.round(val * 10) / 10}/25</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- SMART Goals -->
      <div class="card">
        <h3 class="card-title">Obiettivi SMART</h3>
        <div class="goals-list">
          ${goals.map((g, i) => `
            <div class="goal-card">
              <div class="goal-number">${i + 1}</div>
              <div class="goal-content">
                <h4>${g.specific}</h4>
                <div class="goal-meta">
                  <span class="goal-tag">${g.measurable}</span>
                  <span class="goal-tag">${g.timeBound}</span>
                  <span class="goal-priority ${g.priority}">${g.priority}</span>
                </div>
                <p class="goal-relevant">${g.relevant}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sleep Stats -->
      <div class="card">
        <h3 class="card-title">Riepilogo Sonno</h3>
        <div class="sleep-stats">
          <div class="sleep-stat">
            <span class="sleep-stat-value">${sleep.avgDuration}h</span>
            <span class="sleep-stat-label">Media/notte</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-stat-value ${sleep.debt > 5 ? 'text-danger' : ''}">${sleep.debt}h</span>
            <span class="sleep-stat-label">Debito</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-stat-value">${sleep.score}/25</span>
            <span class="sleep-stat-label">Score</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-stat-value">${getTrendIcon(sleep.trend)}</span>
            <span class="sleep-stat-label">Trend</span>
          </div>
        </div>
      </div>

      <!-- AI Weekly Report -->
      <div class="card">
        <h3 class="card-title">Report IA Settimanale</h3>
        <div id="weekly-ai-report">
          <p class="text-muted">Genera un report dettagliato con l'analisi AI</p>
        </div>
        <button class="btn-primary" id="btn-weekly-report">Genera Report AI</button>
      </div>
    </div>
  `;

  setTimeout(() => drawTrendChart(trends.energy), 50);
  attachReportEvents(container, profile, report);
}

function buildHeatmap(energyHistory) {
  const map = {};
  energyHistory.forEach(e => {
    const d = new Date(e.timestamp);
    const dow = dayOfWeek(d);
    const hour = Math.floor(d.getHours() / 3) * 3;
    const key = `${dow}-${hour}`;
    if (!map[key]) map[key] = [];
    map[key].push(e.score || e);
  });
  const result = {};
  for (const [key, values] of Object.entries(map)) { result[key] = mean(values); }
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
  return { improving: '📈', stable: '➡️', declining: '📉', insufficient: '❓', unknown: '❓' }[trend] || '❓';
}

function drawTrendChart(trendData) {
  const canvas = document.getElementById('trend-canvas');
  if (!canvas || !trendData?.data?.length) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  const pad = { top: 15, right: 10, bottom: 25, left: 35 };
  const plotW = w - pad.left - pad.right, plotH = h - pad.top - pad.bottom;

  const data = trendData.data;
  const n = data.length;

  // Grid
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg3') || '#eee';
  ctx.lineWidth = 0.5;
  [0, 25, 50, 75, 100].forEach(y => {
    const py = pad.top + plotH - (y / 100) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(pad.left + plotW, py); ctx.stroke();
    ctx.fillStyle = '#999'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(y, pad.left - 5, py + 3);
  });

  // Data line
  ctx.strokeStyle = '#6c5ce7'; ctx.lineWidth = 2; ctx.beginPath();
  data.forEach((d, i) => {
    const val = typeof d === 'number' ? d : (d.score || 0);
    const px = pad.left + (i / (n - 1)) * plotW;
    const py = pad.top + plotH - (val / 100) * plotH;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Moving average
  if (trendData.movingAvg?.length) {
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.3)'; ctx.lineWidth = 3; ctx.beginPath();
    trendData.movingAvg.forEach((v, i) => {
      const px = pad.left + (i / (n - 1)) * plotW;
      const py = pad.top + plotH - (v / 100) * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
}

function attachReportEvents(container, profile, report) {
  const reportBtn = container.querySelector('#btn-weekly-report');
  if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
      const reportDiv = container.querySelector('#weekly-ai-report');
      reportBtn.disabled = true;
      reportBtn.textContent = 'Generazione in corso...';
      reportDiv.innerHTML = '<div class="loading-dots">Analizzando la settimana con Groq AI...</div>';

      try {
        const result = await analyzeWeeklyReport(report);
        reportDiv.innerHTML = `<div class="ai-response">${formatAIResponse(result)}</div>`;
      } catch (err) {
        reportDiv.innerHTML = `<div class="error-msg">Errore: ${err.message}</div>`;
      }
      reportBtn.disabled = false;
      reportBtn.textContent = 'Genera Report AI';
    });
  }
}

export default { render };
