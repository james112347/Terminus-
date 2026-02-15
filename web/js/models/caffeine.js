// Terminus PWA - Caffeine Pharmacokinetics Model
// Tracks caffeine intake and calculates residual levels using exponential decay

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { clamp } from '../utils/stats.js';

const CAFFEINE_KEY = 'caffeine_logs';

// Standard caffeine content (mg) by drink type
export const CAFFEINE_SOURCES = {
  espresso: { label: 'Espresso', mg: 63, icon: '☕' },
  double_espresso: { label: 'Doppio Espresso', mg: 126, icon: '☕☕' },
  cappuccino: { label: 'Cappuccino', mg: 80, icon: '🥛' },
  americano: { label: 'Americano', mg: 95, icon: '☕' },
  filter_coffee: { label: 'Caffè Filtro', mg: 95, icon: '☕' },
  tea: { label: 'Tè', mg: 47, icon: '🍵' },
  green_tea: { label: 'Tè Verde', mg: 28, icon: '🍵' },
  cola: { label: 'Cola', mg: 34, icon: '🥤' },
  energy_drink: { label: 'Energy Drink', mg: 80, icon: '⚡' },
  dark_chocolate: { label: 'Cioccolato Fondente (30g)', mg: 24, icon: '🍫' },
  decaf: { label: 'Decaffeinato', mg: 3, icon: '☕' },
};

// Log caffeine intake
export function logCaffeine(type, quantity = 1, time = new Date()) {
  const source = CAFFEINE_SOURCES[type];
  if (!source) return null;

  const entry = {
    type,
    label: source.label,
    mg: source.mg * quantity,
    quantity,
    time: time instanceof Date ? time.toISOString() : time,
    timestamp: new Date().toISOString(),
  };

  Storage.append(CAFFEINE_KEY, entry);
  return entry;
}

// Get today's caffeine logs
export function getTodayCaffeine() {
  return Storage.getToday(CAFFEINE_KEY);
}

// Calculate residual caffeine at a given time
// Uses exponential decay: C(t) = C0 * (0.5)^(t/halfLife)
export function calcResidualCaffeine(targetTime = new Date()) {
  const logs = Storage.getLastDays(CAFFEINE_KEY, 2); // Last 48h (caffeine can linger)
  const halfLife = CONFIG.ENERGY.CAFFEINE_HALF_LIFE_HOURS;
  const targetMs = new Date(targetTime).getTime();
  let totalMg = 0;

  logs.forEach(entry => {
    const intakeMs = new Date(entry.time || entry.timestamp).getTime();
    const hoursElapsed = (targetMs - intakeMs) / 3600000;

    if (hoursElapsed >= 0 && hoursElapsed < 48) {
      // Exponential decay
      const remaining = entry.mg * Math.pow(0.5, hoursElapsed / halfLife);
      totalMg += remaining;
    }
  });

  return Math.round(totalMg * 10) / 10;
}

// Calculate caffeine at bedtime
export function calcCaffeineAtBedtime(bedtimeStr) {
  const [h, m] = bedtimeStr.split(':').map(Number);
  const bedtime = new Date();
  bedtime.setHours(h, m, 0, 0);
  if (bedtime < new Date()) bedtime.setDate(bedtime.getDate() + 1);
  return calcResidualCaffeine(bedtime);
}

// Get caffeine decay curve for next N hours
export function getCaffeineCurve(hours = 12) {
  const points = [];
  const now = new Date();

  for (let i = 0; i <= hours * 2; i++) {
    const targetTime = new Date(now.getTime() + (i * 30 * 60000)); // every 30min
    const mg = calcResidualCaffeine(targetTime);
    points.push({
      x: i / 2, // hours from now
      y: mg,
      time: targetTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    });
  }

  return points;
}

// Calculate caffeine impact score (0-100, 100=no impact)
// Based on: current level and predicted bedtime level
export function calcCaffeineScore(bedtimeStr = '23:00') {
  const currentMg = calcResidualCaffeine();
  const bedtimeMg = calcCaffeineAtBedtime(bedtimeStr);

  let score = 100;

  // Current caffeine impact (mild, as some is fine)
  if (currentMg > 200) score -= 10;
  if (currentMg > 400) score -= 15; // Excessive

  // Bedtime caffeine is the critical factor
  // Research: >50mg at bedtime significantly impacts sleep quality
  if (bedtimeMg > 25) score -= Math.min((bedtimeMg - 25) * 0.8, 40);

  // Total daily intake penalty
  const todayLogs = getTodayCaffeine();
  const totalToday = todayLogs.reduce((s, e) => s + e.mg, 0);
  if (totalToday > 400) score -= 10; // FDA recommended max ~400mg/day

  return Math.round(clamp(score, 0, 100));
}

// Get caffeine recommendations
export function getCaffeineRecommendations(bedtimeStr = '23:00') {
  const recs = [];
  const currentMg = calcResidualCaffeine();
  const bedtimeMg = calcCaffeineAtBedtime(bedtimeStr);
  const todayLogs = getTodayCaffeine();
  const totalToday = todayLogs.reduce((s, e) => s + e.mg, 0);

  if (bedtimeMg > 50) {
    recs.push({
      priority: 'high',
      text: `Avrai ~${Math.round(bedtimeMg)}mg di caffeina al momento di dormire. Evita altri caffè.`,
      icon: '⚠️',
    });
  }

  if (totalToday > 400) {
    recs.push({
      priority: 'high',
      text: `Hai consumato ${Math.round(totalToday)}mg oggi. Il limite raccomandato è 400mg.`,
      icon: '☕',
    });
  }

  // Calculate last safe time for caffeine (to have <25mg at bedtime)
  const [bh, bm] = bedtimeStr.split(':').map(Number);
  const halfLife = CONFIG.ENERGY.CAFFEINE_HALF_LIFE_HOURS;
  // For an espresso (63mg) to decay to 25mg: 63 * 0.5^(t/5) = 25 → t ≈ 6.7h
  const safeHoursBefore = Math.ceil(halfLife * Math.log2(63 / 25));
  const cutoffHour = (bh - safeHoursBefore + 24) % 24;

  const now = new Date();
  if (now.getHours() >= cutoffHour && now.getHours() < bh) {
    recs.push({
      priority: 'medium',
      text: `Cutoff caffeina raggiunto. Niente caffè dopo le ${cutoffHour}:00.`,
      icon: '🚫',
    });
  }

  return recs;
}

export default { logCaffeine, getTodayCaffeine, calcResidualCaffeine, calcCaffeineAtBedtime, getCaffeineCurve, calcCaffeineScore, getCaffeineRecommendations, CAFFEINE_SOURCES };
