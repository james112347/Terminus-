// Terminus PWA - Lifestyle Score v3.0
// Based on: Ganio 2011 (hydration), Nehlig 2018 (caffeine), POMS (exercise)
// Components: hydration, meal quality, caffeine, exercise, smoking, alcohol, screen fatigue

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { clamp } from '../utils/stats.js';
import { calcResidualCaffeine, calcCaffeineAtBedtime, getTodayCaffeine } from './caffeine.js';
import { calcHydrationProgress } from './hydration.js';

const E = CONFIG.ENERGY;

// === MAIN: Lifestyle Score (0-25) ===
export function calcLifestyleScore(profile) {
  const dailyLog = Storage.getToday('daily_energy_logs');
  const latest = dailyLog.length > 0 ? dailyLog[dailyLog.length - 1] : {};
  const activities = Storage.getToday('activity_logs');

  // 1. HYDRATION (0-6) — Ganio 2011
  const weight = profile?.weight || 70;
  const hydration = calcHydrationProgress(weight, profile?.activityLevel);
  let hydrationScore = 6;
  const hydrationPct = hydration.percentage;
  if (hydrationPct < 30) hydrationScore = 0;
  else if (hydrationPct < 50) hydrationScore = 2;
  else if (hydrationPct < 70) hydrationScore = 4;
  else if (hydrationPct < 90) hydrationScore = 5;

  // 2. MEAL QUALITY (0-4)
  let mealScore = 2; // default neutral
  if (latest.mealQuality) {
    mealScore = clamp(latest.mealQuality / 5 * 4, 0, 4);
  }
  // Penalty for missed meals
  const mealCount = latest.mealsCount || activities.filter(a => a.type === 'MEAL').length;
  if (mealCount === 0 && new Date().getHours() > 13) mealScore -= 1;

  // 3. CAFFEINE (0-5) — Nehlig 2018, A2A adenosine receptor
  const caffeineNow = calcResidualCaffeine();
  const bedtime = profile?.bedtime || '23:00';
  const caffeineAtBed = calcCaffeineAtBedtime(bedtime);
  const todayCaffeine = getTodayCaffeine();
  const totalCaffeineMg = todayCaffeine.reduce((s, c) => s + c.mg, 0);

  let caffeineScore = 5;
  // Excessive daily intake (>400mg FDA limit)
  if (totalCaffeineMg > 400) caffeineScore -= 2;
  else if (totalCaffeineMg > 300) caffeineScore -= 1;
  // Caffeine at bedtime (>50mg impacts sleep significantly)
  if (caffeineAtBed > 50) caffeineScore -= 2;
  else if (caffeineAtBed > 25) caffeineScore -= 1;
  // Late caffeine (after cutoff)
  const hour = new Date().getHours();
  const lastCaffeine = todayCaffeine[todayCaffeine.length - 1];
  if (lastCaffeine && hour >= 15) {
    const lastHour = new Date(lastCaffeine.timestamp).getHours();
    if (lastHour >= 15) caffeineScore -= 1;
  }

  // 4. EXERCISE (0-4) — POMS acute mood boost
  const exerciseMinutes = latest.exerciseMinutes ||
    activities.filter(a => a.type === 'EXERCISE_LIGHT' || a.type === 'EXERCISE_INTENSE')
      .reduce((s, a) => s + (a.duration || 0), 0);

  let exerciseScore = 0;
  if (exerciseMinutes >= 60) exerciseScore = 4;
  else if (exerciseMinutes >= 30) exerciseScore = 3;
  else if (exerciseMinutes >= 15) exerciseScore = 2;
  else if (exerciseMinutes > 0) exerciseScore = 1;

  // Sedentary penalty
  const steps = latest.steps || 0;
  if (steps > 0 && steps < 3000 && exerciseMinutes === 0) exerciseScore = 0;

  // 5. SUBSTANCES: smoking + alcohol (0 to -3 penalty)
  let substancePenalty = 0;
  const cigarettes = latest.cigarettes || 0;
  const alcoholDrinks = latest.alcoholDrinks || 0;
  substancePenalty += cigarettes * E.SMOKING_VASOCONSTRICTION_PENALTY * 10; // scaled
  substancePenalty += alcoholDrinks * E.ALCOHOL_ENERGY_PENALTY * 10;
  substancePenalty = Math.min(substancePenalty, 3);

  // 6. SCREEN FATIGUE (0 to -3 penalty)
  let screenPenalty = 0;
  const screenMinutes = latest.screenMinutes || 0;
  if (screenMinutes > E.SCREEN_FATIGUE_THRESHOLD_MINUTES * 3) screenPenalty = 3;
  else if (screenMinutes > E.SCREEN_FATIGUE_THRESHOLD_MINUTES * 2) screenPenalty = 2;
  else if (screenMinutes > E.SCREEN_FATIGUE_THRESHOLD_MINUTES) screenPenalty = 1;
  // Screen breaks help
  if (latest.screenBreaks && latest.screenBreaks >= 3) screenPenalty = Math.max(0, screenPenalty - 1);

  const rawScore = hydrationScore + mealScore + caffeineScore + exerciseScore - substancePenalty - screenPenalty;
  const score = Math.round(clamp(rawScore, 0, 25));

  return {
    score,
    details: {
      hydrationScore: Math.round(hydrationScore * 10) / 10,
      hydrationPct,
      mealScore: Math.round(mealScore * 10) / 10,
      mealCount,
      mealQuality: latest.mealQuality || null,
      caffeineScore: Math.round(caffeineScore * 10) / 10,
      caffeineNowMg: Math.round(caffeineNow),
      caffeineBedMg: Math.round(caffeineAtBed),
      caffeineTotalMg: Math.round(totalCaffeineMg),
      exerciseScore,
      exerciseMinutes,
      steps,
      substancePenalty: Math.round(substancePenalty * 10) / 10,
      cigarettes, alcoholDrinks,
      screenPenalty,
      screenMinutes,
    },
  };
}

export default { calcLifestyleScore };
