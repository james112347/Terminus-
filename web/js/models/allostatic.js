// Terminus PWA - Allostatic Load Model v3.0
// McEwen Model: cumulative stress on body/mind
// Work hours, stress (perceived + trend), mood, HRV, burnout risk, cognitive focus

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { mean, clamp, linearRegression } from '../utils/stats.js';

const E = CONFIG.ENERGY;

// === MAIN: Allostatic Load Score (0-25) ===
export function calcAllostaticScore(profile) {
  const checkins = Storage.getLastDays('checkin_logs', 7);
  const activities = Storage.getToday('activity_logs');
  const energyHistory = Storage.getLastDays('energy_scores', 7);
  const biometrics = Storage.get('sahha_biometrics', null);

  const today = new Date().toDateString();
  const todayCheckins = checkins.filter(c => new Date(c.timestamp).toDateString() === today);

  // 1. WORK HOURS (0-7)
  const todayWork = activities
    .filter(a => a.type === 'WORK' || a.type === 'HIGH_FOCUS')
    .reduce((s, a) => s + (a.duration || 0), 0) / 60;
  let workScore = 7;
  if (todayWork > E.WORK_HOURS_OVERLOAD) workScore = 0;
  else if (todayWork > E.WORK_HOURS_OPTIMAL) workScore = 7 * (1 - (todayWork - E.WORK_HOURS_OPTIMAL) / (E.WORK_HOURS_OVERLOAD - E.WORK_HOURS_OPTIMAL));

  // 2. STRESS (0-6)
  const latestStress = todayCheckins.length > 0 ? todayCheckins[todayCheckins.length - 1].stress : null;
  let stressScore = 4;
  if (latestStress !== null) stressScore = clamp((10 - latestStress) / 10 * 6, 0, 6);
  const stressValues = checkins.filter(c => c.stress).map(c => c.stress);
  if (stressValues.length >= 3) {
    const reg = linearRegression(stressValues.map((_,i)=>i), stressValues);
    if (reg.slope > 0.3) stressScore -= 1;
    if (stressValues.slice(0, 3).filter(s => s >= E.STRESS_HIGH_THRESHOLD).length >= 3) stressScore -= 1;
  }

  // 3. MOOD & EMOTIONAL (0-5)
  const latestMood = todayCheckins.length > 0 ? todayCheckins[todayCheckins.length - 1].mood : null;
  const latestEmotional = todayCheckins.length > 0 ? todayCheckins[todayCheckins.length - 1].emotionalEnergy : null;
  let moodScore = 3;
  if (latestMood !== null) moodScore = clamp(latestMood / 10 * 3, 0, 3);
  if (latestEmotional !== null) moodScore += clamp(latestEmotional / 10 * 2, 0, 2);
  const moodValues = checkins.filter(c => c.mood).map(c => c.mood);
  if (moodValues.length >= 3) {
    const reg = linearRegression(moodValues.map((_,i)=>i), moodValues);
    if (reg.slope < -0.3) moodScore -= 0.5;
  }

  // 4. HRV (0-4)
  let hrvScore = 3;
  if (biometrics?.heartRateVariability) {
    const hrv = biometrics.heartRateVariability;
    hrvScore = hrv < E.HRV_LOW_THRESHOLD ? 0 : hrv < 30 ? 1 : hrv < 50 ? 2 : hrv < 70 ? 3 : 4;
  }
  if (biometrics?.heartRateResting > E.HR_HIGH_THRESHOLD) hrvScore = Math.max(0, hrvScore - 1);

  // 5. BURNOUT RISK (0-3)
  let burnoutScore = 3;
  const recentEnergy = energyHistory.map(e => e.score || e);
  let consecutiveLow = 0;
  for (const s of recentEnergy) { if (s < 40) consecutiveLow++; else break; }
  if (consecutiveLow >= E.BURNOUT_CONSECUTIVE_LOW_DAYS) burnoutScore = 0;
  else if (consecutiveLow >= 2) burnoutScore = 1;

  // 6. COGNITIVE FOCUS penalty
  const latestFocus = todayCheckins.length > 0 ? todayCheckins[todayCheckins.length - 1].focus : null;
  let focusPenalty = 0;
  if (latestFocus !== null && latestFocus <= 3) focusPenalty = 1;

  const rawScore = workScore + stressScore + moodScore + hrvScore + burnoutScore - focusPenalty;
  const score = Math.round(clamp(rawScore, 0, 25));

  return {
    score,
    details: {
      workHours: Math.round(todayWork * 10) / 10, workScore: Math.round(workScore * 10) / 10,
      stressScore: Math.round(stressScore * 10) / 10, stressLatest: latestStress,
      moodScore: Math.round(moodScore * 10) / 10, moodLatest: latestMood,
      hrvScore, hrv: biometrics?.heartRateVariability || null, restingHR: biometrics?.heartRateResting || null,
      burnoutScore, consecutiveLowDays: consecutiveLow,
      focusPenalty, focusLatest: latestFocus, emotionalLatest: latestEmotional,
    },
  };
}

export default { calcAllostaticScore };
