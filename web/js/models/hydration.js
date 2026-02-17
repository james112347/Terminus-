// Terminus PWA - Hydration Balance Model
// Tracks water intake and calculates hydration score based on body weight and activity

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { clamp } from '../utils/stats.js';

const HYDRATION_KEY = 'hydration_logs';

// Water intake sources
export const HYDRATION_SOURCES = {
  water_small: { label: 'Bicchiere (200ml)', ml: 200, icon: '💧' },
  water_medium: { label: 'Bottiglia (500ml)', ml: 500, icon: '💧' },
  water_large: { label: 'Bottiglia (1L)', ml: 1000, icon: '💧' },
  herbal_tea: { label: 'Tisana', ml: 250, icon: '🍵' },
  juice: { label: 'Succo', ml: 200, icon: '🧃' },
  soup: { label: 'Zuppa/Brodo', ml: 300, icon: '🍲' },
  fruit: { label: 'Frutta (acqua)', ml: 100, icon: '🍉' },
  milk: { label: 'Latte', ml: 250, icon: '🥛' },
  sports_drink: { label: 'Integratore', ml: 500, icon: '🏋️' },
};

// Log water intake
export function logHydration(type, quantity = 1, time = new Date()) {
  const source = HYDRATION_SOURCES[type];
  if (!source) return null;

  const entry = {
    type,
    label: source.label,
    ml: source.ml * quantity,
    quantity,
    time: time instanceof Date ? time.toISOString() : time,
    timestamp: new Date().toISOString(),
  };

  Storage.append(HYDRATION_KEY, entry);
  return entry;
}

// Get today's hydration logs
export function getTodayHydration() {
  return Storage.getToday(HYDRATION_KEY);
}

// Calculate daily target based on body weight and activity
export function calcDailyTarget(weightKg, activityLevel = 'moderate') {
  const baseMl = weightKg * CONFIG.ENERGY.HYDRATION_ML_PER_KG;

  // Activity multipliers
  const multipliers = {
    sedentary: 0.9,
    light: 1.0,
    moderate: 1.1,
    active: 1.3,
    intense: 1.5,
  };

  const multiplier = multipliers[activityLevel] || 1.0;
  return Math.round(baseMl * multiplier);
}

// Calculate current hydration progress
export function calcHydrationProgress(weightKg, activityLevel = 'moderate') {
  const logs = getTodayHydration();
  const totalMl = logs.reduce((s, e) => s + e.ml, 0);
  const target = calcDailyTarget(weightKg, activityLevel);
  const percentage = target > 0 ? Math.round((totalMl / target) * 100) : 0;

  return {
    consumed: totalMl,
    target,
    percentage: Math.min(percentage, 150), // cap at 150%
    remaining: Math.max(0, target - totalMl),
    logs,
  };
}

// Calculate hydration score (0-100)
export function calcHydrationScore(weightKg, activityLevel = 'moderate') {
  const progress = calcHydrationProgress(weightKg, activityLevel);
  const now = new Date();
  const hourOfDay = now.getHours();

  // Expected progress by hour (assuming 16h awake day)
  const expectedPct = Math.min((hourOfDay - 6) / 16 * 100, 100);
  if (hourOfDay < 6) return 80; // Too early to judge

  let score = 100;

  // Behind schedule penalty
  if (progress.percentage < expectedPct * 0.7) {
    score -= Math.min((expectedPct - progress.percentage) * 0.8, 40);
  }

  // Severely dehydrated
  if (progress.percentage < 30 && hourOfDay > 14) {
    score -= 20;
  }

  // Over-hydrated (slight penalty, hyponatremia risk)
  if (progress.percentage > 130) {
    score -= 5;
  }

  // Bonus for being on track
  if (progress.percentage >= expectedPct * 0.9 && progress.percentage <= 120) {
    score = Math.min(score + 5, 100);
  }

  return Math.round(clamp(score, 0, 100));
}

// Get hydration recommendations
export function getHydrationRecommendations(weightKg, activityLevel = 'moderate') {
  const recs = [];
  const progress = calcHydrationProgress(weightKg, activityLevel);
  const now = new Date();
  const hour = now.getHours();

  if (progress.remaining > 0 && hour > 10) {
    const hoursLeft = Math.max(1, 22 - hour); // until 10pm
    const mlPerHour = Math.round(progress.remaining / hoursLeft);

    if (progress.percentage < 50 && hour > 14) {
      recs.push({
        priority: 'high',
        text: `Sei molto indietro con l'idratazione (${progress.consumed}ml/${progress.target}ml). Bevi ${mlPerHour}ml/h.`,
        icon: '🚨',
      });
    } else if (progress.remaining > 500) {
      recs.push({
        priority: 'medium',
        text: `Mancano ${progress.remaining}ml al target. ~${mlPerHour}ml ogni ora.`,
        icon: '💧',
      });
    }
  }

  if (progress.consumed === 0 && hour > 8) {
    recs.push({
      priority: 'high',
      text: 'Non hai registrato acqua oggi. Inizia a idratarti!',
      icon: '⚠️',
    });
  }

  return recs;
}

export default { logHydration, getTodayHydration, calcDailyTarget, calcHydrationProgress, calcHydrationScore, getHydrationRecommendations, HYDRATION_SOURCES };
