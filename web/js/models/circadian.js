// Terminus PWA - Circadian Rhythm Model
// Calculates circadian alignment score based on chronotype and current time

import { CONFIG } from '../config.js';
import { minutesSinceMidnight, parseTimeToday, hoursBetween } from '../utils/datetime.js';
import { clamp } from '../utils/stats.js';

// Standard cortisol curve (normalized 0-1) for each chronotype
// Based on chronobiology research: cortisol peaks ~30min after waking (CAR)
// then gradually declines with a small afternoon bump

function getCortisolCurve(chronotype) {
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const wakeMinutes = parseTimeMinutes(ct.wakeTime);
  const carPeak = wakeMinutes + 30; // Cortisol Awakening Response peaks 30min after wake

  // Generate 24-hour cortisol curve
  // Pattern: low during sleep, sharp rise at wake (CAR), gradual decline, small 14:00 bump
  return function(minuteOfDay) {
    const m = minuteOfDay % 1440;
    const sleepMinutes = parseTimeMinutes(ct.sleepTime);
    const isAsleep = sleepMinutes > wakeMinutes
      ? (m >= sleepMinutes || m < wakeMinutes)
      : (m >= sleepMinutes && m < wakeMinutes);

    if (isAsleep) return 0.1; // Cortisol nadir during sleep

    // Minutes since waking
    let awakeMinutes = m - wakeMinutes;
    if (awakeMinutes < 0) awakeMinutes += 1440;

    // CAR phase (0-60min after wake): sharp rise
    if (awakeMinutes <= 30) {
      return 0.1 + (0.9 * awakeMinutes / 30);
    }
    if (awakeMinutes <= 60) {
      return 1.0 - (0.15 * (awakeMinutes - 30) / 30); // slight decline from peak
    }

    // Morning plateau (1-4h after wake)
    if (awakeMinutes <= 240) {
      return 0.85 - (0.15 * (awakeMinutes - 60) / 180);
    }

    // Afternoon dip (4-8h after wake) with small cortisol bump around 6h
    if (awakeMinutes <= 480) {
      const phase = (awakeMinutes - 240) / 240;
      const dip = 0.7 - 0.2 * Math.sin(phase * Math.PI); // dip then slight recovery
      return dip;
    }

    // Evening decline (8h+ after wake)
    const hoursLate = (awakeMinutes - 480) / 60;
    return Math.max(0.15, 0.5 - hoursLate * 0.06);
  };
}

function parseTimeMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Calculate Circadian Alignment Score (0-100)
// High score = current time aligns well with chronotype's natural rhythm
export function calcCircadianScore(chronotype, currentTime = new Date()) {
  const curve = getCortisolCurve(chronotype);
  const currentMinute = minutesSinceMidnight(currentTime);
  const cortisolNow = curve(currentMinute);

  // Score is based on cortisol level (higher cortisol = more alert = higher score)
  return Math.round(clamp(cortisolNow * 100, 0, 100));
}

// Calculate CAR (Cortisol Awakening Response) quality
// Based on actual wake time vs optimal wake time for chronotype
export function calcCARScore(chronotype, actualWakeTime) {
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const optimalWake = parseTimeToday(ct.wakeTime);
  const deviation = Math.abs(hoursBetween(actualWakeTime, optimalWake));

  // Penalty for deviation from optimal wake time
  // Each hour of deviation reduces CAR quality by ~15%
  const penalty = Math.min(deviation * 15, 60);
  return Math.round(clamp(100 - penalty, 20, 100));
}

// Get energy prediction curve for next 12 hours
export function getEnergyPrediction(chronotype, currentTime = new Date()) {
  const curve = getCortisolCurve(chronotype);
  const currentMinute = minutesSinceMidnight(currentTime);
  const points = [];

  for (let i = 0; i <= 720; i += 30) { // Every 30 min for 12 hours
    const minute = (currentMinute + i) % 1440;
    const hour = i / 60;
    points.push({
      x: hour,
      y: Math.round(curve(minute) * 100),
      time: `${Math.floor((currentTime.getHours() + hour) % 24)}:${String(Math.round((i % 60))).padStart(2, '0')}`,
    });
  }

  return points;
}

// Get current phase description
export function getCurrentPhase(chronotype, currentTime = new Date()) {
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const wakeMinutes = parseTimeMinutes(ct.wakeTime);
  const sleepMinutes = parseTimeMinutes(ct.sleepTime);
  const currentMinute = minutesSinceMidnight(currentTime);

  let awakeMinutes = currentMinute - wakeMinutes;
  if (awakeMinutes < 0) awakeMinutes += 1440;

  // Determine if in sleep window
  const inSleepWindow = sleepMinutes > wakeMinutes
    ? (currentMinute >= sleepMinutes || currentMinute < wakeMinutes)
    : (currentMinute >= sleepMinutes && currentMinute < wakeMinutes);

  if (inSleepWindow) return { phase: 'sleep', label: 'Sonno', icon: '🌙', suggestion: 'Dovresti dormire' };
  if (awakeMinutes <= 60) return { phase: 'car', label: 'Risveglio (CAR)', icon: '🌅', suggestion: 'Luce naturale + idratazione' };
  if (awakeMinutes <= 240) return { phase: 'peak', label: 'Picco Mattutino', icon: '⚡', suggestion: 'Ideale per lavoro profondo' };
  if (awakeMinutes <= 360) return { phase: 'sustain', label: 'Fase Sostenuta', icon: '📊', suggestion: 'Buono per task complessi' };
  if (awakeMinutes <= 480) return { phase: 'dip', label: 'Calo Pomeridiano', icon: '📉', suggestion: 'Pausa o task leggeri' };
  if (awakeMinutes <= 600) return { phase: 'recovery', label: 'Ripresa Serale', icon: '🔄', suggestion: 'Task creativi o sociali' };
  return { phase: 'winddown', label: 'Wind-down', icon: '🌙', suggestion: 'Inizia a rilassarti' };
}

export default { calcCircadianScore, calcCARScore, getEnergyPrediction, getCurrentPhase };
