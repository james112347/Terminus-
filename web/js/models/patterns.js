// Terminus PWA - Pattern Detection & ML Analysis Layer
// Finds recurring patterns, correlations, and generates predictions

import { Storage } from '../utils/storage.js';
import { pearsonCorrelation, mean, stdDev, movingAverage, linearRegression, detectPatterns, clamp } from '../utils/stats.js';
import { dayOfWeek, dayName } from '../utils/datetime.js';

const PATTERN_CACHE_KEY = 'pattern_cache';

// Analyze energy crashes: recurring low-energy moments
export function detectEnergyCrashes(energyHistory, threshold = 40) {
  // Group energy readings by day-of-week and hour
  const dataPoints = energyHistory.map(e => ({
    dayOfWeek: dayOfWeek(new Date(e.timestamp)),
    hour: new Date(e.timestamp).getHours(),
    value: e.score,
  }));

  const lowPoints = dataPoints.filter(d => d.value < threshold);
  const patterns = detectPatterns(lowPoints, 2);

  return patterns.map(p => ({
    day: dayName(p.dayOfWeek),
    hour: `${p.hour}:00`,
    avgEnergy: Math.round(p.avg),
    occurrences: p.count,
    description: `Calo del ${Math.round(100 - p.avg)}% ogni ${dayName(p.dayOfWeek)} alle ${p.hour}:00`,
  }));
}

// Calculate correlations between variables (Pearson)
export function analyzeCorrelations() {
  const energyData = Storage.getLastDays('energy_scores', 30);
  const sleepData = Storage.getLastDays('sleep_logs', 30);
  const caffeineData = Storage.getLastDays('caffeine_logs', 30);
  const hydrationData = Storage.getLastDays('hydration_logs', 30);
  const activityData = Storage.getLastDays('activity_logs', 30);

  const correlations = [];

  // Group data by date for correlation analysis
  const dateMap = {};

  energyData.forEach(e => {
    const date = new Date(e.timestamp).toISOString().split('T')[0];
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date].energy = e.score;
  });

  sleepData.forEach(s => {
    const date = s.date || new Date(s.timestamp).toISOString().split('T')[0];
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date].sleepDuration = s.duration;
  });

  // Aggregate caffeine by day
  caffeineData.forEach(c => {
    const date = new Date(c.timestamp).toISOString().split('T')[0];
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date].caffeine = (dateMap[date].caffeine || 0) + c.mg;
  });

  // Aggregate hydration by day
  hydrationData.forEach(h => {
    const date = new Date(h.timestamp).toISOString().split('T')[0];
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date].hydration = (dateMap[date].hydration || 0) + h.ml;
  });

  // Aggregate activity duration by day
  activityData.forEach(a => {
    const date = new Date(a.timestamp).toISOString().split('T')[0];
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date].activityMinutes = (dateMap[date].activityMinutes || 0) + (a.duration || 0);
  });

  const dates = Object.keys(dateMap).sort();
  if (dates.length < 5) return []; // Need at least 5 days of data

  // Extract paired arrays for correlation
  const pairs = [
    { name: 'Sonno → Energia', xKey: 'sleepDuration', yKey: 'energy' },
    { name: 'Caffeina → Energia', xKey: 'caffeine', yKey: 'energy' },
    { name: 'Idratazione → Energia', xKey: 'hydration', yKey: 'energy' },
    { name: 'Attività → Energia', xKey: 'activityMinutes', yKey: 'energy' },
    { name: 'Caffeina → Sonno', xKey: 'caffeine', yKey: 'sleepDuration' },
  ];

  pairs.forEach(({ name, xKey, yKey }) => {
    const validDates = dates.filter(d => dateMap[d][xKey] != null && dateMap[d][yKey] != null);
    if (validDates.length < 5) return;

    const x = validDates.map(d => dateMap[d][xKey]);
    const y = validDates.map(d => dateMap[d][yKey]);
    const r = pearsonCorrelation(x, y);

    let strength, direction;
    const absR = Math.abs(r);
    if (absR > 0.7) strength = 'forte';
    else if (absR > 0.4) strength = 'moderata';
    else if (absR > 0.2) strength = 'debole';
    else strength = 'nessuna';

    direction = r > 0 ? 'positiva' : 'negativa';

    correlations.push({
      name,
      r: Math.round(r * 100) / 100,
      strength,
      direction,
      dataPoints: validDates.length,
      description: absR > 0.3
        ? `Correlazione ${strength} ${direction} (r=${r.toFixed(2)})`
        : `Nessuna correlazione significativa (r=${r.toFixed(2)})`,
    });
  });

  // Cache results
  Storage.set(PATTERN_CACHE_KEY, { correlations, updatedAt: new Date().toISOString() });

  return correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

// Identify weekly bottleneck
export function identifyWeeklyBottleneck() {
  const energyData = Storage.getLastDays('energy_scores', 7);
  if (energyData.length < 3) return null;

  // Find component that most frequently had the lowest score
  const componentCounts = {};

  energyData.forEach(e => {
    if (!e.components) return;
    let worstKey = null;
    let worstScore = 100;
    for (const [key, comp] of Object.entries(e.components)) {
      if (comp.score < worstScore) {
        worstScore = comp.score;
        worstKey = key;
      }
    }
    if (worstKey) {
      componentCounts[worstKey] = (componentCounts[worstKey] || 0) + 1;
    }
  });

  const sorted = Object.entries(componentCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  const [component, count] = sorted[0];
  const labels = {
    circadian: 'Ritmo Circadiano disallineato',
    sleep: 'Debito di Sonno',
    activity: 'Sovraccarico di Attività',
    lifestyle: 'Caffeina tardiva o disidratazione',
  };

  return {
    component,
    label: labels[component] || component,
    frequency: count,
    total: energyData.length,
    percentage: Math.round((count / energyData.length) * 100),
  };
}

// Generate SMART goals based on bottleneck analysis
export function generateSMARTGoals(bottleneck, profile) {
  const goals = [];

  if (!bottleneck) {
    goals.push({
      specific: 'Registra almeno 3 attività al giorno',
      measurable: '3 log/giorno per 7 giorni',
      achievable: true,
      relevant: 'Raccolta dati per analisi accurata',
      timeBound: '1 settimana',
    });
    return goals;
  }

  switch (bottleneck.component) {
    case 'sleep':
      goals.push({
        specific: 'Vai a letto entro le 23:00 per 5 notti su 7',
        measurable: '5/7 notti con bedtime ≤ 23:00',
        achievable: true,
        relevant: 'Ridurre debito di sonno del 50%',
        timeBound: '1 settimana',
      });
      goals.push({
        specific: 'Niente schermi 30min prima di dormire',
        measurable: 'Log "wind-down" ogni sera',
        achievable: true,
        relevant: 'Migliorare qualità del sonno',
        timeBound: '1 settimana',
      });
      break;

    case 'lifestyle':
      goals.push({
        specific: 'Niente caffeina dopo le 14:00',
        measurable: '0 caffè dopo le 14:00 per 7 giorni',
        achievable: true,
        relevant: 'Ridurre caffeina residua al bedtime',
        timeBound: '1 settimana',
      });
      goals.push({
        specific: `Bevi almeno ${profile?.weight ? Math.round(profile.weight * 35 / 1000) : 2}L di acqua al giorno`,
        measurable: 'Log idratazione ≥ target per 5/7 giorni',
        achievable: true,
        relevant: 'Migliorare idratazione e energia',
        timeBound: '1 settimana',
      });
      break;

    case 'activity':
      goals.push({
        specific: 'Inserisci una pausa di 15min ogni 90min di lavoro',
        measurable: 'Log pausa dopo ogni sessione focus',
        achievable: true,
        relevant: 'Ridurre sovraccarico cognitivo',
        timeBound: '1 settimana',
      });
      break;

    case 'circadian':
      goals.push({
        specific: 'Svegliati alla stessa ora ogni giorno (±30min)',
        measurable: 'Varianza wake time ≤ 30min per 7 giorni',
        achievable: true,
        relevant: 'Sincronizzare ritmo circadiano',
        timeBound: '1 settimana',
      });
      goals.push({
        specific: '10 min di luce naturale entro 30min dal risveglio',
        measurable: 'Log "luce mattutina" ogni giorno',
        achievable: true,
        relevant: 'Potenziare Cortisol Awakening Response',
        timeBound: '1 settimana',
      });
      break;
  }

  // Always add a tracking goal
  goals.push({
    specific: 'Registra mood e focus 3 volte al giorno',
    measurable: '3 log/giorno × 7 giorni',
    achievable: true,
    relevant: 'Dati per calibrare previsioni IA',
    timeBound: '1 settimana',
  });

  return goals.slice(0, 3); // Max 3 SMART goals
}

// Get energy trend analysis
export function getEnergyTrend(days = 14) {
  const history = Storage.getLastDays('energy_scores', days);
  if (history.length < 3) return { trend: 'insufficient', data: [] };

  const scores = history.map(e => e.score);
  const ma = movingAverage(scores, 3);
  const reg = linearRegression(
    scores.map((_, i) => i),
    scores
  );

  let trend;
  if (reg.slope > 0.5) trend = 'improving';
  else if (reg.slope < -0.5) trend = 'declining';
  else trend = 'stable';

  return {
    trend,
    slope: Math.round(reg.slope * 100) / 100,
    r2: Math.round(reg.r2 * 100) / 100,
    average: Math.round(mean(scores)),
    movingAverage: ma.map(v => Math.round(v)),
    data: history,
  };
}

export default {
  detectEnergyCrashes, analyzeCorrelations, identifyWeeklyBottleneck,
  generateSMARTGoals, getEnergyTrend,
};
