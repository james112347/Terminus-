// Terminus PWA - ML Pipeline v3.0
// 5 modules: Pattern Detection, Trend Analysis, Correlation Discovery,
// Predictive Intelligence, Weekly Reports (A-F grading)

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import {
  pearsonCorrelation, mean, stdDev, movingAverage,
  linearRegression, detectPatterns, clamp
} from '../utils/stats.js';
import { dayOfWeek, dayName } from '../utils/datetime.js';
import { getSnapshotSeries } from './checkin.js';

const ML = CONFIG.ML;

// ============================================================
// MODULE 1: Pattern Detection
// Weekly cycles, productivity windows, crash patterns, sleep impact, stress cycles
// ============================================================
export function detectAllPatterns() {
  const snapshots = getSnapshotSeries(30);
  const energyHistory = Storage.getLastDays('energy_scores', 30);

  return {
    weeklyCycles: detectWeeklyCycles(snapshots),
    productivityWindows: detectProductivityWindows(energyHistory),
    crashPatterns: detectCrashPatterns(energyHistory),
    sleepImpact: detectSleepImpact(snapshots),
    stressCycles: detectStressCycles(snapshots),
  };
}

function detectWeeklyCycles(snapshots) {
  if (snapshots.length < ML.MIN_DAYS_PATTERNS) return null;

  // Group energy by day of week
  const byDay = {};
  snapshots.forEach(s => {
    const dow = new Date(s.date).getDay();
    if (!byDay[dow]) byDay[dow] = [];
    if (s.energy != null) byDay[dow].push(s.energy);
  });

  const result = Object.entries(byDay)
    .filter(([, vals]) => vals.length >= 2)
    .map(([dow, vals]) => ({
      day: dayName(parseInt(dow)),
      dayIndex: parseInt(dow),
      avgEnergy: Math.round(mean(vals)),
      stdDev: Math.round(stdDev(vals)),
      samples: vals.length,
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex);

  // Find best and worst days
  const best = result.reduce((a, b) => a.avgEnergy > b.avgEnergy ? a : b, result[0]);
  const worst = result.reduce((a, b) => a.avgEnergy < b.avgEnergy ? a : b, result[0]);

  return {
    days: result,
    bestDay: best?.day || null,
    worstDay: worst?.day || null,
    weekendEffect: calculateWeekendEffect(result),
  };
}

function calculateWeekendEffect(dayData) {
  const weekdays = dayData.filter(d => d.dayIndex >= 1 && d.dayIndex <= 5);
  const weekends = dayData.filter(d => d.dayIndex === 0 || d.dayIndex === 6);
  if (weekdays.length === 0 || weekends.length === 0) return null;
  const weekdayAvg = mean(weekdays.map(d => d.avgEnergy));
  const weekendAvg = mean(weekends.map(d => d.avgEnergy));
  const diff = Math.round(weekendAvg - weekdayAvg);
  return {
    difference: diff,
    label: diff > 5 ? 'Più energia nel weekend' : diff < -5 ? 'Più energia nei feriali' : 'Nessuna differenza significativa',
  };
}

function detectProductivityWindows(energyHistory) {
  if (energyHistory.length < 10) return null;

  // Group scores by hour
  const byHour = {};
  energyHistory.forEach(e => {
    const h = new Date(e.timestamp).getHours();
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(e.score || e);
  });

  const hourlyAvg = Object.entries(byHour)
    .filter(([, vals]) => vals.length >= 2)
    .map(([h, vals]) => ({
      hour: parseInt(h),
      avgEnergy: Math.round(mean(vals)),
      samples: vals.length,
    }))
    .sort((a, b) => a.hour - b.hour);

  // Find top 3 peak hours
  const peaks = [...hourlyAvg].sort((a, b) => b.avgEnergy - a.avgEnergy).slice(0, 3);

  return {
    hourly: hourlyAvg,
    peakHours: peaks.map(p => ({ hour: `${p.hour}:00`, energy: p.avgEnergy })),
    bestWindow: peaks.length > 0 ? `${peaks[0].hour}:00 - ${peaks[0].hour + 1}:00` : null,
  };
}

function detectCrashPatterns(energyHistory) {
  const crashes = [];
  const threshold = 40;

  // Group by day-of-week + hour
  const dataPoints = energyHistory.map(e => ({
    dayOfWeek: dayOfWeek(new Date(e.timestamp)),
    hour: new Date(e.timestamp).getHours(),
    value: e.score || e,
  }));

  const lowPoints = dataPoints.filter(d => d.value < threshold);
  const patterns = detectPatterns(lowPoints, 2);

  patterns.forEach(p => {
    // Z-score significance
    const allValues = dataPoints.map(d => d.value);
    const globalMean = mean(allValues);
    const globalStd = stdDev(allValues);
    const zScore = globalStd > 0 ? (globalMean - p.avg) / globalStd : 0;

    if (zScore > ML.ZSCORE_SIGNIFICANT) {
      crashes.push({
        day: dayName(p.dayOfWeek),
        hour: `${p.hour}:00`,
        avgEnergy: Math.round(p.avg),
        zScore: Math.round(zScore * 100) / 100,
        occurrences: p.count,
        significant: true,
        description: `Calo ricorrente: ${dayName(p.dayOfWeek)} alle ${p.hour}:00 (media ${Math.round(p.avg)}/100)`,
      });
    }
  });

  // Overall crash rate
  const crashRate = lowPoints.length / Math.max(1, dataPoints.length);

  return {
    patterns: crashes,
    crashRate: Math.round(crashRate * 100),
    isProblematic: crashRate > ML.CRASH_RATE_THRESHOLD,
  };
}

function detectSleepImpact(snapshots) {
  const withSleep = snapshots.filter(s => s.sleepQuality && s.energy);
  if (withSleep.length < 5) return null;

  const sleepQ = withSleep.map(s => s.sleepQuality);
  const energy = withSleep.map(s => s.energy);
  const r = pearsonCorrelation(sleepQ, energy);

  // Tertile analysis: compare energy when sleep is good vs bad
  const sorted = [...withSleep].sort((a, b) => a.sleepQuality - b.sleepQuality);
  const third = Math.floor(sorted.length / 3);
  const lowSleep = sorted.slice(0, third);
  const highSleep = sorted.slice(-third);

  return {
    correlation: Math.round(r * 100) / 100,
    strength: Math.abs(r) > 0.5 ? 'forte' : Math.abs(r) > 0.3 ? 'moderata' : 'debole',
    energyWithGoodSleep: highSleep.length > 0 ? Math.round(mean(highSleep.map(s => s.energy))) : null,
    energyWithPoorSleep: lowSleep.length > 0 ? Math.round(mean(lowSleep.map(s => s.energy))) : null,
    impact: highSleep.length > 0 && lowSleep.length > 0
      ? Math.round(mean(highSleep.map(s => s.energy)) - mean(lowSleep.map(s => s.energy)))
      : null,
  };
}

function detectStressCycles(snapshots) {
  const withStress = snapshots.filter(s => s.stress);
  if (withStress.length < 5) return null;

  // Weekly stress pattern
  const byDay = {};
  withStress.forEach(s => {
    const dow = new Date(s.date).getDay();
    if (!byDay[dow]) byDay[dow] = [];
    byDay[dow].push(s.stress);
  });

  const weeklyStress = Object.entries(byDay)
    .filter(([, vals]) => vals.length >= 2)
    .map(([dow, vals]) => ({
      day: dayName(parseInt(dow)),
      avgStress: Math.round(mean(vals) * 10) / 10,
    }));

  // Stress-energy correlation
  const stressValues = withStress.map(s => s.stress);
  const energyValues = withStress.filter(s => s.energy).map(s => s.energy);
  const r = stressValues.length === energyValues.length && energyValues.length >= 3
    ? pearsonCorrelation(stressValues, energyValues) : 0;

  return {
    weeklyPattern: weeklyStress,
    stressEnergyCorrelation: Math.round(r * 100) / 100,
    peakStressDay: weeklyStress.length > 0
      ? weeklyStress.reduce((a, b) => a.avgStress > b.avgStress ? a : b).day
      : null,
  };
}

// ============================================================
// MODULE 2: Trend Analysis
// 7/14/30 day windows, regression, period comparison
// ============================================================
export function analyzeTrends() {
  return {
    energy: analyzeTrendForMetric('energy_scores', 'score', 'Energia'),
    sleep: analyzeTrendForMetric('sleep_logs', 'duration', 'Sonno (ore)'),
    stress: analyzeTrendForCheckinField('stress', 'Stress'),
    mood: analyzeTrendForCheckinField('mood', 'Umore'),
    focus: analyzeTrendForCheckinField('focus', 'Focus'),
  };
}

function analyzeTrendForMetric(storageKey, valueKey, label) {
  const data30 = Storage.getLastDays(storageKey, 30);
  const values30 = data30.map(d => d[valueKey] || d).filter(v => typeof v === 'number');

  if (values30.length < ML.MIN_DAYS_PREDICTIONS) return { label, trend: 'insufficient', data: [] };

  const windows = {};

  // 7-day window
  const values7 = values30.slice(0, 7);
  if (values7.length >= 3) {
    const reg = linearRegression(values7.map((_, i) => i), values7);
    windows['7d'] = {
      mean: Math.round(mean(values7) * 10) / 10,
      slope: Math.round(reg.slope * 100) / 100,
      trend: classifyTrend(reg.slope, mean(values7)),
    };
  }

  // 14-day window
  const values14 = values30.slice(0, 14);
  if (values14.length >= 5) {
    const reg = linearRegression(values14.map((_, i) => i), values14);
    windows['14d'] = {
      mean: Math.round(mean(values14) * 10) / 10,
      slope: Math.round(reg.slope * 100) / 100,
      trend: classifyTrend(reg.slope, mean(values14)),
    };
  }

  // 30-day window
  if (values30.length >= 7) {
    const reg = linearRegression(values30.map((_, i) => i), values30);
    windows['30d'] = {
      mean: Math.round(mean(values30) * 10) / 10,
      slope: Math.round(reg.slope * 100) / 100,
      trend: classifyTrend(reg.slope, mean(values30)),
    };
  }

  // Period comparison: this week vs last week
  const thisWeek = values30.slice(0, 7);
  const lastWeek = values30.slice(7, 14);
  let periodComparison = null;
  if (thisWeek.length >= 3 && lastWeek.length >= 3) {
    const thisAvg = mean(thisWeek);
    const lastAvg = mean(lastWeek);
    const pctChange = lastAvg > 0 ? Math.round(((thisAvg - lastAvg) / lastAvg) * 100) : 0;
    periodComparison = {
      thisWeek: Math.round(thisAvg * 10) / 10,
      lastWeek: Math.round(lastAvg * 10) / 10,
      change: pctChange,
      label: pctChange > ML.TREND_SIGNIFICANT_PCT ? 'miglioramento'
        : pctChange < -ML.TREND_SIGNIFICANT_PCT ? 'peggioramento' : 'stabile',
    };
  }

  return {
    label,
    windows,
    periodComparison,
    movingAvg: movingAverage(values30, 3).map(v => Math.round(v * 10) / 10),
    data: values30,
  };
}

function analyzeTrendForCheckinField(field, label) {
  const checkins = Storage.getLastDays('checkin_logs', 30);
  const values = checkins.filter(c => c[field]).map(c => c[field]);
  if (values.length < 3) return { label, trend: 'insufficient', data: [] };

  const reg = linearRegression(values.map((_, i) => i), values);
  return {
    label,
    mean: Math.round(mean(values) * 10) / 10,
    slope: Math.round(reg.slope * 100) / 100,
    trend: classifyTrend(reg.slope, mean(values)),
    data: values,
  };
}

function classifyTrend(slope, avgValue) {
  const threshold = (avgValue * ML.TREND_SIGNIFICANT_PCT) / 100;
  if (slope > threshold) return 'improving';
  if (slope < -threshold) return 'declining';
  return 'stable';
}

// ============================================================
// MODULE 3: Correlation Discovery
// 10 factor pairs, Pearson r >= 0.2, tertile analysis
// ============================================================
export function discoverCorrelations() {
  const snapshots = getSnapshotSeries(30);
  if (snapshots.length < 5) return [];

  const factorPairs = [
    { name: 'Sonno → Energia', xKey: 'sleepQuality', yKey: 'energy' },
    { name: 'Stress → Energia', xKey: 'stress', yKey: 'energy', invert: true },
    { name: 'Umore → Energia', xKey: 'mood', yKey: 'energy' },
    { name: 'Focus → Energia', xKey: 'focus', yKey: 'energy' },
    { name: 'Esercizio → Energia', xKey: 'exerciseMinutes', yKey: 'energy' },
    { name: 'Acqua → Energia', xKey: 'waterGlasses', yKey: 'energy' },
    { name: 'Caffè → Sonno', xKey: 'coffeeCount', yKey: 'sleepQuality' },
    { name: 'Schermo → Stress', xKey: 'screenMinutes', yKey: 'stress' },
    { name: 'Lavoro → Stress', xKey: 'workHours', yKey: 'stress' },
    { name: 'Esercizio → Umore', xKey: 'exerciseMinutes', yKey: 'mood' },
  ];

  const results = [];

  factorPairs.forEach(({ name, xKey, yKey, invert }) => {
    const valid = snapshots.filter(s => s[xKey] != null && s[yKey] != null);
    if (valid.length < 5) return;

    const x = valid.map(s => s[xKey]);
    const y = valid.map(s => s[yKey]);
    let r = pearsonCorrelation(x, y);

    const absR = Math.abs(r);
    if (absR < ML.CORRELATION_THRESHOLD) return; // Skip insignificant

    // Tertile analysis
    const sorted = [...valid].sort((a, b) => a[xKey] - b[xKey]);
    const third = Math.floor(sorted.length / 3);
    const lowTertile = sorted.slice(0, third);
    const highTertile = sorted.slice(-third);

    const lowAvgY = lowTertile.length > 0 ? Math.round(mean(lowTertile.map(s => s[yKey])) * 10) / 10 : null;
    const highAvgY = highTertile.length > 0 ? Math.round(mean(highTertile.map(s => s[yKey])) * 10) / 10 : null;

    let strength;
    if (absR > 0.7) strength = 'forte';
    else if (absR > 0.4) strength = 'moderata';
    else strength = 'debole';

    const direction = r > 0 ? 'positiva' : 'negativa';

    results.push({
      name,
      r: Math.round(r * 100) / 100,
      strength,
      direction,
      significant: absR >= 0.3,
      dataPoints: valid.length,
      tertileAnalysis: {
        lowX_avgY: lowAvgY,
        highX_avgY: highAvgY,
        impact: highAvgY != null && lowAvgY != null ? Math.round((highAvgY - lowAvgY) * 10) / 10 : null,
      },
      interpretation: generateCorrelationInterpretation(name, r, lowAvgY, highAvgY, invert),
    });
  });

  return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

function generateCorrelationInterpretation(name, r, lowAvgY, highAvgY, invert) {
  const absR = Math.abs(r);
  if (absR < 0.3) return `Correlazione debole tra ${name.toLowerCase()}.`;
  const impact = highAvgY != null && lowAvgY != null ? Math.abs(highAvgY - lowAvgY) : 0;
  if (r > 0 && !invert) return `Quando ${name.split(' → ')[0].toLowerCase()} è alto, ${name.split(' → ')[1].toLowerCase()} migliora di ~${impact} punti.`;
  if (r < 0 || invert) return `Quando ${name.split(' → ')[0].toLowerCase()} aumenta, ${name.split(' → ')[1].toLowerCase()} peggiora di ~${impact} punti.`;
  return `Relazione significativa trovata.`;
}

// ============================================================
// MODULE 4: Predictive Intelligence
// 3-day moving average, crash alarms, dehydration, caffeine excess, goal projection
// ============================================================
export function generatePredictions() {
  const energyHistory = Storage.getLastDays('energy_scores', 14);
  const snapshots = getSnapshotSeries(14);

  if (energyHistory.length < ML.MIN_DAYS_PREDICTIONS) {
    return { available: false, reason: 'Dati insufficienti (servono almeno 3 giorni)' };
  }

  const scores = energyHistory.map(e => e.score || e);

  // 3-day moving average prediction
  const ma3 = movingAverage(scores, 3);
  const predicted = ma3.length > 0 ? Math.round(ma3[ma3.length - 1]) : null;
  const trend = scores.length >= 3
    ? linearRegression(scores.slice(0, 3).map((_, i) => i), scores.slice(0, 3))
    : { slope: 0 };

  // Crash alarm: predict if tomorrow will be low
  const crashAlarm = predicted !== null && predicted < 40;
  let crashReason = null;
  if (crashAlarm) {
    if (trend.slope < -2) crashReason = 'Trend in discesa rapida da 3 giorni';
    else if (scores[0] < 40 && scores.length > 1 && scores[1] < 40) crashReason = '2+ giorni consecutivi con energia bassa';
    else crashReason = 'Media mobile prevede energia bassa domani';
  }

  // Specific alarms
  const alarms = [];

  // Dehydration alarm
  const latestSnapshot = snapshots[0];
  if (latestSnapshot) {
    if (latestSnapshot.waterGlasses != null && latestSnapshot.waterGlasses < 4 && new Date().getHours() > 14) {
      alarms.push({
        type: 'dehydration',
        severity: 'alta',
        message: `Solo ${latestSnapshot.waterGlasses} bicchieri d'acqua oggi. Disidratazione impatta cognizione del 10-20% (Ganio 2011).`,
        icon: '💧',
      });
    }
  }

  // Caffeine excess alarm
  if (latestSnapshot?.coffeeCount > 5) {
    alarms.push({
      type: 'caffeine_excess',
      severity: 'media',
      message: `${latestSnapshot.coffeeCount} caffè oggi: superi il limite di 400mg FDA. Rischio disturbi del sonno.`,
      icon: '☕',
    });
  }

  // Burnout trajectory
  const lowDays = scores.filter(s => s < 40).length;
  if (lowDays >= 3) {
    alarms.push({
      type: 'burnout_trajectory',
      severity: 'alta',
      message: `${lowDays} giorni con energia <40 nelle ultime 2 settimane. Rischio burnout in aumento.`,
      icon: '🔥',
    });
  }

  // Sleep debt accumulation
  const sleepLogs = Storage.getLastDays('sleep_logs', 7);
  const avgSleep = sleepLogs.length > 0 ? mean(sleepLogs.map(l => l.duration || 0)) : null;
  if (avgSleep !== null && avgSleep < 6.5) {
    alarms.push({
      type: 'sleep_debt',
      severity: 'alta',
      message: `Media sonno ${avgSleep.toFixed(1)}h (target: 8h). Debito accumulato: ~${Math.round((8 - avgSleep) * 7)}h/settimana.`,
      icon: '😴',
    });
  }

  return {
    available: true,
    predicted,
    trend: trend.slope > 0.5 ? 'improving' : trend.slope < -0.5 ? 'declining' : 'stable',
    crashAlarm,
    crashReason,
    alarms,
    confidence: Math.min(energyHistory.length * 10, 90),
  };
}

// ============================================================
// MODULE 5: Weekly Reports with A-F Grading
// 5 weighted dimensions: Energy, Sleep, Lifestyle, Consistency, Progress
// ============================================================
export function generateWeeklyReport() {
  const energyHistory = Storage.getLastDays('energy_scores', 7);
  const snapshots = getSnapshotSeries(7);
  const sleepLogs = Storage.getLastDays('sleep_logs', 7);
  const GRADES = CONFIG.GRADES;

  if (energyHistory.length < 3) {
    return { available: false, reason: 'Dati insufficienti per il report settimanale' };
  }

  const scores = energyHistory.map(e => e.score || e);

  // 1. Energy Dimension (weight: 30%)
  const avgEnergy = Math.round(mean(scores));
  const energyGrade = getGrade(avgEnergy);

  // 2. Sleep Dimension (weight: 25%)
  const sleepDurations = sleepLogs.map(l => l.duration || 0);
  const avgSleep = sleepDurations.length > 0 ? mean(sleepDurations) : 0;
  const sleepOnTarget = sleepDurations.filter(d => d >= 7 && d <= 9).length;
  const sleepScore = Math.round(clamp((sleepOnTarget / 7) * 100, 0, 100));
  const sleepGrade = getGrade(sleepScore);

  // 3. Lifestyle Dimension (weight: 20%)
  const lifestyleScores = energyHistory.filter(e => e.lifestyle != null).map(e => e.lifestyle);
  const avgLifestyle = lifestyleScores.length > 0 ? Math.round(mean(lifestyleScores) * 4) : 50;
  const lifestyleGrade = getGrade(avgLifestyle);

  // 4. Consistency Dimension (weight: 15%)
  const energyStdDev = stdDev(scores);
  const consistencyScore = Math.round(clamp(100 - energyStdDev * 3, 0, 100));
  const consistencyGrade = getGrade(consistencyScore);

  // 5. Progress Dimension (weight: 10%)
  const prevWeek = Storage.getLastDays('energy_scores', 14).slice(7);
  const prevScores = prevWeek.map(e => e.score || e);
  let progressScore = 50;
  if (prevScores.length >= 3) {
    const improvement = mean(scores) - mean(prevScores);
    progressScore = Math.round(clamp(50 + improvement * 2, 0, 100));
  }
  const progressGrade = getGrade(progressScore);

  // Composite score (weighted average)
  const composite = Math.round(
    avgEnergy * 0.30 +
    sleepScore * 0.25 +
    avgLifestyle * 0.20 +
    consistencyScore * 0.15 +
    progressScore * 0.10
  );
  const overallGrade = getGrade(composite);

  // Stats
  const highDays = scores.filter(s => s >= 70).length;
  const lowDays = scores.filter(s => s < 40).length;
  const bestDay = scores.length > 0 ? Math.max(...scores) : 0;
  const worstDay = scores.length > 0 ? Math.min(...scores) : 0;

  // Top bottleneck this week
  const componentAverages = {
    circadian: mean(energyHistory.filter(e => e.circadian != null).map(e => e.circadian) || [0]),
    sleep: mean(energyHistory.filter(e => e.sleep != null).map(e => e.sleep) || [0]),
    lifestyle: mean(energyHistory.filter(e => e.lifestyle != null).map(e => e.lifestyle) || [0]),
    allostatic: mean(energyHistory.filter(e => e.allostatic != null).map(e => e.allostatic) || [0]),
  };
  const worstComponent = Object.entries(componentAverages)
    .sort((a, b) => a[1] - b[1])[0];

  const componentLabels = {
    circadian: 'Ritmo Circadiano',
    sleep: 'Sonno',
    lifestyle: 'Stile di Vita',
    allostatic: 'Carico Allostatico',
  };

  // Correlations summary
  const correlations = discoverCorrelations();
  const significantCorrelations = correlations.filter(c => c.significant);

  return {
    available: true,
    period: {
      start: snapshots.length > 0 ? snapshots[snapshots.length - 1].date : null,
      end: snapshots.length > 0 ? snapshots[0].date : null,
      days: energyHistory.length,
    },
    overallGrade: { letter: overallGrade.letter, label: overallGrade.label, color: overallGrade.color, score: composite },
    dimensions: {
      energy: { score: avgEnergy, grade: energyGrade, weight: '30%' },
      sleep: { score: sleepScore, grade: sleepGrade, weight: '25%', avgHours: Math.round(avgSleep * 10) / 10, onTarget: sleepOnTarget },
      lifestyle: { score: avgLifestyle, grade: lifestyleGrade, weight: '20%' },
      consistency: { score: consistencyScore, grade: consistencyGrade, weight: '15%', stdDev: Math.round(energyStdDev) },
      progress: { score: progressScore, grade: progressGrade, weight: '10%' },
    },
    stats: {
      avgEnergy,
      highDays,
      lowDays,
      bestDay,
      worstDay,
      avgSleep: Math.round(avgSleep * 10) / 10,
    },
    bottleneck: worstComponent ? {
      component: worstComponent[0],
      label: componentLabels[worstComponent[0]] || worstComponent[0],
      avgScore: Math.round(worstComponent[1] * 10) / 10,
    } : null,
    componentAverages,
    significantCorrelations: significantCorrelations.slice(0, 3),
    trend: scores.length >= 3
      ? linearRegression(scores.map((_, i) => i), scores).slope > 0.3 ? 'improving'
        : linearRegression(scores.map((_, i) => i), scores).slope < -0.3 ? 'declining' : 'stable'
      : 'unknown',
  };
}

function getGrade(score) {
  const G = CONFIG.GRADES;
  for (const [letter, info] of Object.entries(G)) {
    if (score >= info.min) return { letter, label: info.label, color: info.color };
  }
  return { letter: 'F', label: G.F.label, color: G.F.color };
}

// ============================================================
// SMART Goals Generator (enhanced with bottleneck awareness)
// ============================================================
export function generateSMARTGoals(profile) {
  const report = generateWeeklyReport();
  const predictions = generatePredictions();
  const goals = [];

  if (!report.available) {
    goals.push({
      specific: 'Registra almeno 3 check-in al giorno per 7 giorni',
      measurable: '3 log/giorno × 7 giorni = 21 totali',
      achievable: true,
      relevant: 'Raccolta dati per analisi accurata del tuo profilo energetico',
      timeBound: '1 settimana',
      priority: 'alta',
    });
    return goals;
  }

  // Based on worst dimension
  const dimensions = report.dimensions;
  const worst = Object.entries(dimensions)
    .sort((a, b) => a[1].score - b[1].score)[0];

  switch (worst[0]) {
    case 'energy':
      goals.push({
        specific: 'Rispetta le finestre di picco del tuo cronotipo per task importanti',
        measurable: '5/7 giorni con task complessi nelle ore di picco',
        achievable: true,
        relevant: `Energia media ${report.stats.avgEnergy}/100 - allineamento circadiano migliora del 15-20%`,
        timeBound: '1 settimana',
        priority: 'alta',
      });
      break;
    case 'sleep':
      goals.push({
        specific: `Dormi almeno 7.5h per 5 notti su 7`,
        measurable: '5/7 notti con durata ≥ 7.5h',
        achievable: true,
        relevant: `Media attuale: ${dimensions.sleep.avgHours}h - ogni ora extra di sonno = +8 punti energia`,
        timeBound: '1 settimana',
        priority: 'alta',
      });
      break;
    case 'lifestyle':
      if (report.bottleneck?.component === 'lifestyle') {
        goals.push({
          specific: 'Raggiungi il 80% del target idratazione + niente caffè dopo le 14',
          measurable: 'Log idratazione ≥80% + 0 caffè pomeridiani',
          achievable: true,
          relevant: 'Lifestyle score basso impatta tutti gli altri componenti',
          timeBound: '1 settimana',
          priority: 'alta',
        });
      }
      break;
    case 'consistency':
      goals.push({
        specific: 'Mantieni orari regolari per sveglia, pasti e sonno (±30min)',
        measurable: 'Varianza wake-time ≤ 30min per 7 giorni',
        achievable: true,
        relevant: `Variabilità attuale: ±${dimensions.consistency.stdDev} punti. Regolarità = stabilità energetica.`,
        timeBound: '1 settimana',
        priority: 'media',
      });
      break;
  }

  // Alarm-based goals
  if (predictions.available && predictions.alarms.length > 0) {
    const topAlarm = predictions.alarms[0];
    if (topAlarm.type === 'dehydration') {
      goals.push({
        specific: 'Bevi almeno 8 bicchieri d\'acqua al giorno',
        measurable: 'Log ≥ 8 bicchieri/giorno per 5/7 giorni',
        achievable: true,
        relevant: 'Disidratazione rilevata: impatta cognizione del 10-20%',
        timeBound: '1 settimana',
        priority: 'alta',
      });
    }
  }

  // Progress tracking goal
  goals.push({
    specific: 'Registra mood, stress e focus almeno 3 volte al giorno',
    measurable: '3 check-in/giorno × 7 giorni',
    achievable: true,
    relevant: 'Più dati = previsioni più accurate + coaching personalizzato',
    timeBound: '1 settimana',
    priority: 'media',
  });

  return goals.slice(0, 3);
}

// ============================================================
// Full ML Pipeline Execution
// ============================================================
export function runFullPipeline() {
  const patterns = detectAllPatterns();
  const trends = analyzeTrends();
  const correlations = discoverCorrelations();
  const predictions = generatePredictions();
  const weeklyReport = generateWeeklyReport();

  // Cache results
  Storage.set('ml_pipeline_cache', {
    patterns,
    trends,
    correlations,
    predictions,
    weeklyReport,
    updatedAt: new Date().toISOString(),
  });

  return { patterns, trends, correlations, predictions, weeklyReport };
}

export default {
  detectAllPatterns, analyzeTrends, discoverCorrelations,
  generatePredictions, generateWeeklyReport, generateSMARTGoals,
  runFullPipeline,
};
