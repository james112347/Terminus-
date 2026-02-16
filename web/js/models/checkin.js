// Terminus PWA - Quick Check-in System v3.0
// Collects: sleep quality, mood, stress, focus, physical/mental/emotional energy
// Also: water glasses, coffee count, meals, activity, screen time

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { mean } from '../utils/stats.js';

const CHECKIN_KEY = 'checkin_logs';
const DAILY_LOG_KEY = 'daily_energy_logs';

// === Quick Check-in (subjective ratings 1-10) ===
export function logCheckin(data) {
  const entry = {
    sleepQuality: data.sleepQuality || null,
    mood: data.mood || null,
    stress: data.stress || null,
    focus: data.focus || null,
    physicalEnergy: data.physicalEnergy || null,
    mentalEnergy: data.mentalEnergy || null,
    emotionalEnergy: data.emotionalEnergy || null,
    notes: data.notes || '',
    timestamp: new Date().toISOString(),
  };
  Storage.append(CHECKIN_KEY, entry);
  return entry;
}

// === Daily Energy Log (physical/mental/emotional 1-10 + work hours) ===
export function logDailyEnergy(data) {
  const entry = {
    date: data.date || new Date().toISOString().split('T')[0],
    physicalLevel: data.physicalLevel || null,
    mentalLevel: data.mentalLevel || null,
    emotionalLevel: data.emotionalLevel || null,
    workHours: data.workHours || null,
    waterGlasses: data.waterGlasses || null,
    coffeeCount: data.coffeeCount || null,
    mealsCount: data.mealsCount || null,
    mealQuality: data.mealQuality || null, // 1-5
    exerciseMinutes: data.exerciseMinutes || null,
    screenMinutes: data.screenMinutes || null,
    screenBreaks: data.screenBreaks || null,
    steps: data.steps || null,
    alcoholDrinks: data.alcoholDrinks || 0,
    cigarettes: data.cigarettes || 0,
    timestamp: new Date().toISOString(),
  };
  Storage.append(DAILY_LOG_KEY, entry);
  return entry;
}

// Get today's check-ins
export function getTodayCheckins() {
  return Storage.getToday(CHECKIN_KEY);
}

// Get latest check-in values
export function getLatestCheckin() {
  const checkins = getTodayCheckins();
  if (checkins.length === 0) return null;
  return checkins[checkins.length - 1];
}

// Get today's daily energy log
export function getTodayDailyLog() {
  const logs = Storage.getToday(DAILY_LOG_KEY);
  return logs.length > 0 ? logs[logs.length - 1] : null;
}

// Get aggregated daily snapshot for a date
export function getDailySnapshot(date) {
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  const checkins = Storage.getLastDays(CHECKIN_KEY, 30).filter(c =>
    new Date(c.timestamp).toISOString().split('T')[0] === dateStr
  );
  const dailyLogs = Storage.getLastDays(DAILY_LOG_KEY, 30).filter(l =>
    (l.date || new Date(l.timestamp).toISOString().split('T')[0]) === dateStr
  );
  const energyScores = Storage.getLastDays('energy_scores', 30).filter(e =>
    new Date(e.timestamp).toISOString().split('T')[0] === dateStr
  );
  const activities = Storage.getLastDays('activity_logs', 30).filter(a =>
    new Date(a.timestamp).toISOString().split('T')[0] === dateStr
  );

  const avgCheckin = (field) => {
    const vals = checkins.filter(c => c[field]).map(c => c[field]);
    return vals.length > 0 ? Math.round(mean(vals) * 10) / 10 : null;
  };

  const latestDaily = dailyLogs.length > 0 ? dailyLogs[dailyLogs.length - 1] : {};

  return {
    date: dateStr,
    energy: energyScores.length > 0 ? Math.round(mean(energyScores.map(e => e.score || e))) : null,
    sleepQuality: avgCheckin('sleepQuality'),
    mood: avgCheckin('mood'),
    stress: avgCheckin('stress'),
    focus: avgCheckin('focus'),
    physicalEnergy: avgCheckin('physicalEnergy'),
    mentalEnergy: avgCheckin('mentalEnergy'),
    emotionalEnergy: avgCheckin('emotionalEnergy'),
    waterGlasses: latestDaily.waterGlasses || null,
    coffeeCount: latestDaily.coffeeCount || null,
    mealsCount: latestDaily.mealsCount || null,
    mealQuality: latestDaily.mealQuality || null,
    exerciseMinutes: latestDaily.exerciseMinutes || null,
    screenMinutes: latestDaily.screenMinutes || null,
    steps: latestDaily.steps || null,
    workHours: latestDaily.workHours || null,
    alcoholDrinks: latestDaily.alcoholDrinks || 0,
    cigarettes: latestDaily.cigarettes || 0,
    activitiesCount: activities.length,
    checkinCount: checkins.length,
  };
}

// Get N days of snapshots for ML analysis
export function getSnapshotSeries(days = 30) {
  const snapshots = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86400000);
    const snapshot = getDailySnapshot(date);
    if (snapshot.energy !== null || snapshot.checkinCount > 0) {
      snapshots.push(snapshot);
    }
  }
  return snapshots;
}

// Calculate data quality score (0-100)
export function calcDataQuality() {
  const today = getTodayCheckins();
  const dailyLog = getTodayDailyLog();
  const activities = Storage.getToday('activity_logs');
  const sleep = Storage.getToday('sleep_logs');
  const caffeine = Storage.getToday('caffeine_logs');
  const hydration = Storage.getToday('hydration_logs');

  let score = 0;
  if (today.length > 0) score += 20;
  if (today.length >= 3) score += 10;
  if (dailyLog) score += 15;
  if (activities.length > 0) score += 15;
  if (activities.length >= 3) score += 5;
  if (sleep.length > 0) score += 15;
  if (caffeine.length > 0) score += 5;
  if (hydration.length > 0) score += 10;
  if (dailyLog?.screenMinutes != null) score += 5;

  return Math.min(score, 100);
}

export default { logCheckin, logDailyEnergy, getTodayCheckins, getLatestCheckin, getTodayDailyLog, getDailySnapshot, getSnapshotSeries, calcDataQuality };
