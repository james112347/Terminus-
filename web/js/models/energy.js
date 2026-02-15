// Terminus PWA - Energy Score Engine
// Combines all sub-models into a unified Energy/Readiness Score

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { clamp, cubicSpline } from '../utils/stats.js';
import { calcCircadianScore, calcCARScore, getEnergyPrediction } from './circadian.js';
import { calcSleepDebt, calcSleepEfficiency } from './sleep.js';
import { calcCaffeineScore, calcResidualCaffeine } from './caffeine.js';
import { calcHydrationScore } from './hydration.js';

const ENERGY_LOG_KEY = 'energy_scores';
const ACTIVITY_LOG_KEY = 'activity_logs';

// Activity load tracking
// Each activity type consumes or regenerates "load points"
export function logActivity(type, durationMinutes, details = {}) {
  const actType = CONFIG.ACTIVITY_TYPES[type];
  if (!actType) return null;

  const loadChange = (actType.energyCost * durationMinutes) / 60; // per hour rate

  const entry = {
    type,
    label: actType.label,
    icon: actType.icon,
    duration: durationMinutes,
    loadChange: Math.round(loadChange * 10) / 10,
    mood: details.mood || null,
    focus: details.focus || null,
    notes: details.notes || '',
    timestamp: new Date().toISOString(),
  };

  Storage.append(ACTIVITY_LOG_KEY, entry);
  return entry;
}

// Get today's activity load (total drain/recovery)
export function getTodayLoad() {
  const activities = Storage.getToday(ACTIVITY_LOG_KEY);
  let totalLoad = 0;
  let focusLoad = 0;
  let recoveryLoad = 0;

  activities.forEach(a => {
    if (a.loadChange < 0) {
      totalLoad += a.loadChange;
      if (a.type === 'HIGH_FOCUS' || a.type === 'WORK') {
        focusLoad += Math.abs(a.loadChange);
      }
    } else {
      recoveryLoad += a.loadChange;
    }
  });

  return {
    total: Math.round(totalLoad * 10) / 10,
    focusDrain: Math.round(focusLoad * 10) / 10,
    recovery: Math.round(recoveryLoad * 10) / 10,
    net: Math.round((totalLoad + recoveryLoad) * 10) / 10,
    activities,
  };
}

// MAIN: Calculate comprehensive Energy Score
export function calcEnergyScore(profile) {
  if (!profile) return { score: 50, components: {}, label: 'Non configurato' };

  const chronotype = profile.chronotype || 'ORSO';
  const weightKg = profile.weight || 70;
  const bedtime = profile.bedtime || '23:00';
  const wakeTime = profile.wakeTime || '07:00';
  const activityLevel = profile.activityLevel || 'moderate';

  // 1. Circadian component
  const circadianScore = calcCircadianScore(chronotype);
  const carScore = profile.actualWakeTime ? calcCARScore(chronotype, new Date(profile.actualWakeTime)) : 75;
  const circadianFinal = Math.round(circadianScore * 0.7 + carScore * 0.3);

  // 2. Sleep component
  const sleepData = calcSleepDebt();
  const sleepScore = sleepData.score;

  // 3. Caffeine component (lifestyle factor)
  const caffeineScore = calcCaffeineScore(bedtime);

  // 4. Hydration component (lifestyle factor)
  const hydrationScore = calcHydrationScore(weightKg, activityLevel);

  // 5. Activity load component
  const loadData = getTodayLoad();
  const loadPenalty = Math.min(Math.abs(loadData.total) * 2, 30);
  const activityScore = clamp(80 - loadPenalty + loadData.recovery * 2, 20, 100);

  // Combine with weights
  const weights = CONFIG.ENERGY;
  const lifestyleScore = Math.round((caffeineScore + hydrationScore) / 2);

  const rawScore =
    sleepScore * weights.SLEEP_WEIGHT +
    circadianFinal * weights.CIRCADIAN_WEIGHT +
    activityScore * weights.ACTIVITY_WEIGHT +
    lifestyleScore * weights.LIFESTYLE_WEIGHT;

  const finalScore = Math.round(clamp(rawScore, 0, 100));

  // Determine label and color
  const { label, color, suggestion } = getScoreLabel(finalScore);

  const result = {
    score: finalScore,
    label,
    color,
    suggestion,
    components: {
      circadian: { score: circadianFinal, weight: weights.CIRCADIAN_WEIGHT, label: 'Ritmo Circadiano' },
      sleep: { score: sleepScore, weight: weights.SLEEP_WEIGHT, label: 'Sonno', data: sleepData },
      activity: { score: Math.round(activityScore), weight: weights.ACTIVITY_WEIGHT, label: 'Carico Attività', data: loadData },
      lifestyle: { score: lifestyleScore, weight: weights.LIFESTYLE_WEIGHT, label: 'Stile di Vita',
        caffeine: caffeineScore,
        hydration: hydrationScore,
      },
    },
    timestamp: new Date().toISOString(),
  };

  // Save score to history
  Storage.append(ENERGY_LOG_KEY, { score: finalScore, components: result.components, timestamp: result.timestamp });

  return result;
}

function getScoreLabel(score) {
  if (score >= 80) return { label: 'Eccellente', color: '#26c281', suggestion: 'Ideale per lavoro profondo e task complessi' };
  if (score >= 60) return { label: 'Buono', color: '#4a90d9', suggestion: 'Buono per task standard, evita sovraccarico' };
  if (score >= 40) return { label: 'Moderato', color: '#f4b740', suggestion: 'Prenditi una pausa, task leggeri consigliati' };
  if (score >= 20) return { label: 'Basso', color: '#f0883e', suggestion: 'Riposa, idratati, evita caffeina tardiva' };
  return { label: 'Critico', color: '#e74c6f', suggestion: 'Stop immediato. Riposo urgente necessario' };
}

// Generate 12h prediction curve combining circadian + current state
export function generatePredictionCurve(profile) {
  const chronotype = profile?.chronotype || 'ORSO';
  const circadianPoints = getEnergyPrediction(chronotype);

  // Get current energy score to anchor the prediction
  const currentEnergy = calcEnergyScore(profile);

  // Adjust circadian curve by current state offset
  const offset = currentEnergy.score - circadianPoints[0].y;

  // Apply offset with decay (gradually returns to circadian baseline)
  const adjustedPoints = circadianPoints.map((p, i) => ({
    x: p.x,
    y: clamp(p.y + offset * Math.exp(-i * 0.15), 0, 100),
    time: p.time,
  }));

  // Create smooth spline
  const spline = cubicSpline(adjustedPoints);

  // Generate high-resolution curve
  const curve = [];
  for (let h = 0; h <= 12; h += 0.25) {
    curve.push({
      hour: h,
      energy: Math.round(clamp(spline(h), 0, 100)),
    });
  }

  return curve;
}

// Get historical energy scores
export function getEnergyHistory(days = 7) {
  return Storage.getLastDays(ENERGY_LOG_KEY, days);
}

// Identify the single biggest bottleneck this week
export function identifyBottleneck(profile) {
  const energy = calcEnergyScore(profile);
  const components = energy.components;

  let worstComponent = null;
  let worstScore = 100;

  for (const [key, comp] of Object.entries(components)) {
    if (comp.score < worstScore) {
      worstScore = comp.score;
      worstComponent = { key, ...comp };
    }
  }

  if (!worstComponent) return null;

  const messages = {
    circadian: 'Il tuo ritmo circadiano non è sincronizzato. Prova a svegliarti alla stessa ora ogni giorno.',
    sleep: `Il sonno è il tuo punto debole (${worstScore}/100). Debito: ${components.sleep.data?.debt || 0}h.`,
    activity: 'Stai sovraccaricando il tuo sistema. Inserisci più pause.',
    lifestyle: 'Caffeina o idratazione stanno impattando la tua energia.',
  };

  return {
    component: worstComponent.key,
    label: worstComponent.label,
    score: worstScore,
    message: messages[worstComponent.key] || 'Componente da migliorare.',
  };
}

export default {
  logActivity, getTodayLoad, calcEnergyScore, generatePredictionCurve,
  getEnergyHistory, identifyBottleneck,
};
