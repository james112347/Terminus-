// Terminus PWA - Sleep Model v3.0
// Van Dongen Model: cumulative sleep debt with recency weighting
// Nap partial recovery, alcohol impact, Sahha readiness

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { mean, clamp } from '../utils/stats.js';

const SLEEP_KEY = 'sleep_logs';
const E = CONFIG.ENERGY;

export function logSleep(entry) {
  const log = {
    date: entry.date || new Date().toISOString().split('T')[0],
    bedtime: entry.bedtime, wakeTime: entry.wakeTime,
    duration: entry.duration || calcDuration(entry.bedtime, entry.wakeTime),
    quality: entry.quality || null, phases: entry.phases || null,
    latency: entry.latency || null, interruptions: entry.interruptions || 0,
    alcoholDrinks: entry.alcoholDrinks || 0, notes: entry.notes || '',
    isNap: entry.isNap || false, napDuration: entry.napDuration || null,
    sahhaReadiness: entry.sahhaReadiness || null,
    timestamp: new Date().toISOString(),
  };
  Storage.append(SLEEP_KEY, log);
  return log;
}

function calcDuration(bedtime, wakeTime) {
  const bed = new Date(`2000-01-01T${bedtime}`);
  let wake = new Date(`2000-01-01T${wakeTime}`);
  if (wake <= bed) wake.setDate(wake.getDate() + 1);
  return (wake - bed) / 3600000;
}

export function getSleepLogs(days = 7) { return Storage.getLastDays(SLEEP_KEY, days); }

// === MAIN: Sleep Score (0-25) — Van Dongen Model ===
export function calcSleepScore(profile) {
  const logs = getSleepLogs(E.SLEEP_DEBT_WINDOW_DAYS);
  const optimal = profile?.idealSleep || E.SLEEP_OPTIMAL_HOURS;
  if (logs.length === 0) return { score: 15, debt: 0, avgDuration: optimal, trend: 'unknown', details: {} };

  const nightLogs = logs.filter(l => !l.isNap);
  const weights = E.SLEEP_RECENCY_WEIGHTS;
  let weightedDebt = 0, weightedDuration = 0, totalWeight = 0;

  const daysBucket = new Array(E.SLEEP_DEBT_WINDOW_DAYS).fill(null);
  nightLogs.forEach(log => {
    const daysAgo = Math.floor((Date.now() - new Date(log.date || log.timestamp).getTime()) / 86400000);
    if (daysAgo >= 0 && daysAgo < E.SLEEP_DEBT_WINDOW_DAYS) daysBucket[daysAgo] = log;
  });

  daysBucket.forEach((log, i) => {
    const w = weights[i] || 0.1;
    const dur = log ? log.duration : 6;
    weightedDebt += Math.max(0, optimal - dur) * w;
    weightedDuration += dur * w;
    totalWeight += w;
  });

  const avgDuration = totalWeight > 0 ? weightedDuration / totalWeight : 6;
  const totalDebt = Math.round(weightedDebt * 10) / 10;

  // Quality (1-10 → factor)
  const qualityLogs = nightLogs.filter(l => l.quality);
  let qualityFactor = 0.7;
  if (qualityLogs.length > 0) qualityFactor = mean(qualityLogs.map(l => l.quality)) / 10;

  // Alcohol impact
  const lastNight = daysBucket[0];
  let alcoholPenalty = 0;
  if (lastNight?.alcoholDrinks > 0) {
    alcoholPenalty = lastNight.alcoholDrinks * E.ALCOHOL_SLEEP_PENALTY;
    qualityFactor *= (1 - alcoholPenalty);
  }

  // Nap recovery
  const napLogs = logs.filter(l => l.isNap);
  let napRecovery = 0;
  napLogs.forEach(nap => {
    const napHours = (nap.napDuration || nap.duration * 60) / 60;
    napRecovery += napHours * E.NAP_RECOVERY_FACTOR;
  });

  // Sahha readiness
  let sahhaBonus = 0;
  if (lastNight?.sahhaReadiness) sahhaBonus = ((lastNight.sahhaReadiness / 100) - 0.5) * 3;

  // Phase score
  let phaseScore = null;
  if (lastNight?.phases) {
    const p = lastNight.phases, total = (p.rem||0)+(p.deep||0)+(p.light||0)+(p.awake||0);
    if (total > 0) {
      let s = 100;
      const remPct = (p.rem||0)/total*100, deepPct = (p.deep||0)/total*100, awakePct = (p.awake||0)/total*100;
      if (remPct < 15) s -= (15-remPct)*2; if (deepPct < 10) s -= (10-deepPct)*3; if (awakePct > 5) s -= (awakePct-5)*3;
      phaseScore = Math.round(clamp(s, 0, 100));
    }
  }

  // Compute (0-25)
  const durationScore = clamp((avgDuration / optimal) * 12, 0, 12);
  const debtPenalty = clamp(totalDebt * 0.8, 0, 6);
  const qualityBonus = qualityFactor * 5;
  const napBonus = clamp(napRecovery * 1.5, 0, 2);
  const rawScore = durationScore - debtPenalty + qualityBonus + napBonus + sahhaBonus;
  const score = Math.round(clamp(rawScore, 0, 25));

  const durations = nightLogs.map(l => l.duration);
  let trend = 'stable';
  if (durations.length >= 3) {
    const r = mean(durations.slice(0,3)), e = mean(durations.slice(-3));
    if (r-e > 0.5) trend = 'improving'; else if (e-r > 0.5) trend = 'declining';
  }

  return {
    score, debt: totalDebt, avgDuration: Math.round(avgDuration*10)/10,
    qualityScore: Math.round(qualityFactor*100), phaseScore, napRecovery: Math.round(napRecovery*10)/10,
    trend, alcoholPenalty: Math.round(alcoholPenalty*100), logs: nightLogs.slice(0,7),
    details: { durationScore: Math.round(durationScore*10)/10, debtPenalty: Math.round(debtPenalty*10)/10, qualityBonus: Math.round(qualityBonus*10)/10, napBonus: Math.round(napBonus*10)/10, sahhaBonus: Math.round(sahhaBonus*10)/10 },
  };
}

// Bridge function for GSD/Ralph pipelines
export function calcSleepDebt(profile) {
  const result = calcSleepScore(profile || {});
  return { debt: result.debt, avgDuration: result.avgDuration, trend: result.trend };
}

export function calcSleepEfficiency(log) {
  if (!log?.duration) return null;
  const awakeTime = log.latency ? log.latency/60 : 0;
  const intTime = (log.interruptions||0)*0.15;
  return Math.round(clamp(((log.duration-awakeTime-intTime)/log.duration)*100, 0, 100));
}

export default { logSleep, getSleepLogs, calcSleepScore, calcSleepDebt, calcSleepEfficiency };
