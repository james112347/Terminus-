// Terminus PWA - Circadian Model v3.0
// Borbély Two-Process Model: Process C (circadian) + Process S (homeostatic sleep pressure)
// Includes BRAC ultradian cycles, post-prandial dip, CAR, chronotype phase shifts

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { clamp } from '../utils/stats.js';
import { minutesSinceMidnight } from '../utils/datetime.js';

const E = CONFIG.ENERGY;

// === PROCESS C: Circadian Drive (24h biological clock) ===
function processC(minuteOfDay, chronotype) {
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const phaseShift = ct.processC_phase * 60;
  const shifted = (minuteOfDay - phaseShift + 1440) % 1440;
  const theta = (shifted / 1440) * 2 * Math.PI;
  const primary = 0.5 + 0.5 * Math.cos(theta - (600 / 1440) * 2 * Math.PI);
  const afternoonDipCenter = 870 + phaseShift;
  const distToDip = Math.abs(((minuteOfDay - afternoonDipCenter + 720) % 1440) - 720);
  const afternoonDip = distToDip < 90 ? 0.15 * (1 - distToDip / 90) : 0;
  return clamp(primary - afternoonDip, 0, 1);
}

// === PROCESS S: Homeostatic Sleep Pressure ===
function processS(hoursAwake, sleepDebtHours = 0) {
  const tau = 16;
  const pressure = 1 - Math.exp(-hoursAwake / tau);
  const debtOffset = Math.min(sleepDebtHours * 0.03, 0.3);
  return clamp(pressure + debtOffset, 0, 1);
}

// === BRAC: Basic Rest-Activity Cycle (90-100min ultradian cycles) ===
function bracModulation(hoursAwake) {
  const minutesAwake = hoursAwake * 60;
  const phase = (minutesAwake % E.BRAC_CYCLE_MINUTES) / E.BRAC_CYCLE_MINUTES;
  return 0.05 * Math.sin(phase * 2 * Math.PI);
}

// === POST-PRANDIAL DIP: Energy drop after meals ===
function postPrandialDip(currentTime, mealTimes) {
  if (!mealTimes || mealTimes.length === 0) return 0;
  const now = currentTime instanceof Date ? currentTime.getTime() : Date.now();
  let totalDip = 0;
  mealTimes.forEach(mealTime => {
    const minutesSinceMeal = (now - new Date(mealTime).getTime()) / 60000;
    if (minutesSinceMeal > 0 && minutesSinceMeal < E.POST_PRANDIAL_DIP_DURATION) {
      const peakAt = 37.5;
      const sigma = E.POST_PRANDIAL_DIP_DURATION / 4;
      const gaussian = Math.exp(-0.5 * ((minutesSinceMeal - peakAt) / sigma) ** 2);
      totalDip += E.POST_PRANDIAL_DIP_INTENSITY * gaussian;
    }
  });
  return Math.min(totalDip, 0.25);
}

// === CAR: Cortisol Awakening Response ===
function cortisolAwakeningResponse(minutesSinceWake) {
  if (minutesSinceWake < 0 || minutesSinceWake > E.CAR_DURATION_MINUTES) return 0;
  const peak = E.CAR_PEAK_MINUTES;
  if (minutesSinceWake <= peak) return 0.2 * (minutesSinceWake / peak);
  return 0.2 * (1 - (minutesSinceWake - peak) / (E.CAR_DURATION_MINUTES - peak));
}

// === MAIN: Calculate Circadian Score (0-25) ===
export function calcCircadianScore(profile, currentTime = new Date()) {
  const chronotype = profile?.chronotype || 'ORSO';
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const wakeTime = profile?.actualWakeTime ? new Date(profile.actualWakeTime) : parseWakeTime(ct.wakeTime);
  const hoursAwake = Math.max(0, (currentTime - wakeTime) / 3600000);
  const minute = minutesSinceMidnight(currentTime);

  // Sleep window check
  const sleepMinute = parseTimeToMinutes(ct.sleepTime);
  const wakeMinute = parseTimeToMinutes(ct.wakeTime);
  const inSleepWindow = sleepMinute > wakeMinute
    ? (minute >= sleepMinute || minute < wakeMinute)
    : (minute >= sleepMinute && minute < wakeMinute);
  if (inSleepWindow) return { score: 2, phase: { name: 'Sonno', icon: '🌙', label: 'Sonno', suggestion: 'Dovresti dormire' }, details: {} };

  const cDrive = processC(minute, chronotype);
  const sPressure = processS(hoursAwake, profile?.sleepDebt || 0);
  let alertness = cDrive - sPressure * 0.6;
  alertness += bracModulation(hoursAwake);
  const minutesSinceWake = hoursAwake * 60;
  alertness += cortisolAwakeningResponse(minutesSinceWake);

  const mealTimes = Storage.getToday('activity_logs').filter(a => a.type === 'MEAL').map(a => a.timestamp);
  alertness -= postPrandialDip(currentTime, mealTimes);

  const actualWakeMinute = wakeTime.getHours() * 60 + wakeTime.getMinutes();
  const optimalWakeMinute = parseTimeToMinutes(ct.wakeTime);
  const wakeDeviation = Math.abs(actualWakeMinute - optimalWakeMinute);
  const alignmentPenalty = Math.min(wakeDeviation / 120, 0.15);
  alertness -= alignmentPenalty;

  const score = Math.round(clamp(alertness * 25, 0, 25));
  const hour = minute / 60;

  // Phase detection
  let phase = { name: 'Attivo', icon: '📊', label: 'Fase Attiva', suggestion: 'Task standard' };
  if (hoursAwake <= 1) phase = { name: 'CAR', icon: '🌅', label: 'Risveglio (CAR)', suggestion: 'Luce naturale + idratazione' };
  else if (hoursAwake >= 14) phase = { name: 'Wind-down', icon: '🌙', label: 'Wind-down', suggestion: 'Inizia a rilassarti' };
  else {
    for (const peak of ct.peakWindows) {
      if (hour >= peak.start && hour < peak.end) { phase = { name: 'Picco', icon: '⚡', label: 'Picco Energetico', suggestion: 'Ideale per lavoro profondo' }; break; }
    }
    for (const dip of ct.dipWindows) {
      if (hour >= dip.start && hour < dip.end) { phase = { name: 'Calo', icon: '📉', label: 'Calo Pomeridiano', suggestion: 'Task leggeri o pausa' }; break; }
    }
  }

  return {
    score, phase,
    details: {
      processC: Math.round(cDrive * 100) / 100,
      processS: Math.round(sPressure * 100) / 100,
      alertness: Math.round(alertness * 100) / 100,
      hoursAwake: Math.round(hoursAwake * 10) / 10,
      brac: Math.round(bracModulation(hoursAwake) * 100) / 100,
      car: Math.round(cortisolAwakeningResponse(minutesSinceWake) * 100) / 100,
      postPrandial: Math.round(postPrandialDip(currentTime, mealTimes) * 100) / 100,
      alignmentPenalty: Math.round(alignmentPenalty * 100) / 100,
    },
  };
}

// Generate 12h prediction curve
export function getEnergyPrediction(profile, currentTime = new Date()) {
  const points = [];
  const chronotype = profile?.chronotype || 'ORSO';
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const wakeTime = profile?.actualWakeTime ? new Date(profile.actualWakeTime) : parseWakeTime(ct.wakeTime);
  for (let i = 0; i <= 48; i++) {
    const futureTime = new Date(currentTime.getTime() + i * 15 * 60000);
    const hoursAwake = Math.max(0, (futureTime - wakeTime) / 3600000);
    const minute = minutesSinceMidnight(futureTime);
    let alertness = processC(minute, chronotype) - processS(hoursAwake, profile?.sleepDebt || 0) * 0.6;
    alertness += bracModulation(hoursAwake);
    points.push({ x: i * 0.25, y: Math.round(clamp(alertness * 100, 0, 100)), time: futureTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) });
  }
  return points;
}

function parseTimeToMinutes(timeStr) { const [h, m] = timeStr.split(':').map(Number); return h * 60 + (m || 0); }
function parseWakeTime(timeStr) { const [h, m] = timeStr.split(':').map(Number); const d = new Date(); d.setHours(h, m || 0, 0, 0); if (d > new Date()) d.setDate(d.getDate() - 1); return d; }

export default { calcCircadianScore, getEnergyPrediction };
