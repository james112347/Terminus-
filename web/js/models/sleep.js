// Terminus PWA - Sleep Model
// Accumulator model for sleep debt calculation over 7-day rolling window

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { mean, clamp } from '../utils/stats.js';

const SLEEP_KEY = 'sleep_logs';

// Sleep log entry structure:
// { date, bedtime, wakeTime, duration, quality, phases: { rem, deep, light, awake }, notes }

export function logSleep(entry) {
  const log = {
    date: entry.date || new Date().toISOString().split('T')[0],
    bedtime: entry.bedtime,
    wakeTime: entry.wakeTime,
    duration: entry.duration || calcDuration(entry.bedtime, entry.wakeTime),
    quality: entry.quality || null, // 1-5 subjective
    phases: entry.phases || null, // from Sahha/wearable
    latency: entry.latency || null, // minutes to fall asleep
    interruptions: entry.interruptions || 0,
    notes: entry.notes || '',
    timestamp: new Date().toISOString(),
  };
  Storage.append(SLEEP_KEY, log);
  return log;
}

function calcDuration(bedtime, wakeTime) {
  const bed = new Date(`2000-01-01T${bedtime}`);
  let wake = new Date(`2000-01-01T${wakeTime}`);
  if (wake <= bed) wake.setDate(wake.getDate() + 1);
  return (wake - bed) / 3600000; // hours
}

// Get sleep logs for last N days
export function getSleepLogs(days = 7) {
  return Storage.getLastDays(SLEEP_KEY, days);
}

// Calculate sleep debt over rolling window
// Sleep debt = sum of (optimal - actual) over N days
export function calcSleepDebt(days = 7) {
  const logs = getSleepLogs(days);
  const optimal = CONFIG.ENERGY.SLEEP_OPTIMAL_HOURS;

  if (logs.length === 0) return { debt: 0, avgDuration: optimal, score: 75 };

  let totalDebt = 0;
  const durations = [];

  // Fill in missing days with estimated sleep (6h default)
  const daysData = new Array(days).fill(6);
  logs.forEach(log => {
    const daysAgo = Math.floor((Date.now() - new Date(log.date).getTime()) / 86400000);
    if (daysAgo >= 0 && daysAgo < days) {
      daysData[daysAgo] = log.duration;
    }
  });

  daysData.forEach(duration => {
    durations.push(duration);
    totalDebt += Math.max(0, optimal - duration);
  });

  const avgDuration = mean(durations);

  // Score calculation:
  // 0 debt = 100, each hour of debt reduces by ~7 points
  // Also penalize if average is too far from optimal
  const debtPenalty = Math.min(totalDebt * 7, 60);
  const avgPenalty = Math.abs(avgDuration - optimal) * 5;
  const score = clamp(100 - debtPenalty - avgPenalty, 0, 100);

  return {
    debt: Math.round(totalDebt * 10) / 10,
    avgDuration: Math.round(avgDuration * 10) / 10,
    score: Math.round(score),
    logs: logs.slice(-7),
    trend: calcSleepTrend(durations),
  };
}

// Calculate trend: improving, stable, declining
function calcSleepTrend(durations) {
  if (durations.length < 3) return 'stable';
  const recent = mean(durations.slice(0, 3));
  const earlier = mean(durations.slice(-3));
  const diff = recent - earlier;
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'declining';
  return 'stable';
}

// Calculate sleep phase quality score (if wearable data available)
export function calcPhaseScore(phases) {
  if (!phases) return null;

  // Ideal distribution (% of total):
  // REM: 20-25%, Deep: 15-20%, Light: 50-55%, Awake: <5%
  const total = (phases.rem || 0) + (phases.deep || 0) + (phases.light || 0) + (phases.awake || 0);
  if (total === 0) return null;

  const remPct = (phases.rem / total) * 100;
  const deepPct = (phases.deep / total) * 100;
  const awakePct = (phases.awake / total) * 100;

  let score = 100;

  // REM penalty
  if (remPct < 15) score -= (15 - remPct) * 2;
  else if (remPct > 30) score -= (remPct - 30) * 1.5;

  // Deep sleep penalty
  if (deepPct < 10) score -= (10 - deepPct) * 3;
  else if (deepPct > 25) score -= (deepPct - 25) * 1;

  // Awake penalty
  if (awakePct > 5) score -= (awakePct - 5) * 3;

  return Math.round(clamp(score, 0, 100));
}

// Sleep efficiency: time asleep / time in bed
export function calcSleepEfficiency(log) {
  if (!log || !log.duration) return null;
  const awakeTime = log.latency ? log.latency / 60 : 0;
  const interruptionTime = (log.interruptions || 0) * 0.15; // estimate 9min per interruption
  const actualSleep = log.duration - awakeTime - interruptionTime;
  return Math.round(clamp((actualSleep / log.duration) * 100, 0, 100));
}

// Get sleep recommendations based on current data
export function getSleepRecommendations(sleepData) {
  const recommendations = [];

  if (sleepData.debt > 3) {
    recommendations.push({
      priority: 'high',
      text: `Hai un debito di sonno di ${sleepData.debt}h. Vai a letto 30min prima stasera.`,
      icon: '🛏️',
    });
  }

  if (sleepData.avgDuration < 6.5) {
    recommendations.push({
      priority: 'high',
      text: `Media di ${sleepData.avgDuration}h/notte. L'obiettivo è ${CONFIG.ENERGY.SLEEP_OPTIMAL_HOURS}h.`,
      icon: '⚠️',
    });
  }

  if (sleepData.trend === 'declining') {
    recommendations.push({
      priority: 'medium',
      text: 'Il tuo sonno sta peggiorando. Rivedi la routine serale.',
      icon: '📉',
    });
  }

  return recommendations;
}

export default { logSleep, getSleepLogs, calcSleepDebt, calcPhaseScore, calcSleepEfficiency, getSleepRecommendations };
