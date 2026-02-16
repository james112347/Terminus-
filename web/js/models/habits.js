// Terminus PWA - Habit Learning Engine v3.0
// Analyzes 14 days of check-ins to learn user habits
// Detects: typical times, regularity, energy correlation, generates smart notifications

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { mean, stdDev, pearsonCorrelation } from '../utils/stats.js';
import { getSnapshotSeries } from './checkin.js';

const ML = CONFIG.ML;

// Habit categories to track
const HABIT_TYPES = [
  { id: 'morning_coffee', label: 'Caffè mattutino', activityType: 'CAFFEINE', timeWindow: [5, 11] },
  { id: 'breakfast', label: 'Colazione', activityType: 'MEAL', timeWindow: [6, 10], index: 0 },
  { id: 'lunch', label: 'Pranzo', activityType: 'MEAL', timeWindow: [11, 15], index: 1 },
  { id: 'dinner', label: 'Cena', activityType: 'MEAL', timeWindow: [18, 22], index: 2 },
  { id: 'hydration', label: 'Idratazione', logKey: 'hydration_logs' },
  { id: 'exercise', label: 'Esercizio', activityType: 'EXERCISE_LIGHT' },
  { id: 'sleep', label: 'Sonno', logKey: 'sleep_logs' },
  { id: 'checkin', label: 'Check-in', logKey: 'checkin_logs' },
];

// === MAIN: Analyze habits from last 14 days ===
export function analyzeHabits() {
  const activities = Storage.getLastDays('activity_logs', ML.HABIT_LEARNING_WINDOW);
  const snapshots = getSnapshotSeries(ML.HABIT_LEARNING_WINDOW);

  const results = HABIT_TYPES.map(habit => {
    let occurrences = [];

    if (habit.activityType) {
      // Filter activities by type and time window
      let filtered = activities.filter(a => a.type === habit.activityType);
      if (habit.timeWindow) {
        filtered = filtered.filter(a => {
          const h = new Date(a.timestamp).getHours();
          return h >= habit.timeWindow[0] && h < habit.timeWindow[1];
        });
      }
      occurrences = filtered.map(a => ({
        hour: new Date(a.timestamp).getHours(),
        minute: new Date(a.timestamp).getMinutes(),
        date: new Date(a.timestamp).toISOString().split('T')[0],
      }));
    } else if (habit.logKey) {
      const logs = Storage.getLastDays(habit.logKey, ML.HABIT_LEARNING_WINDOW);
      occurrences = logs.map(l => ({
        hour: new Date(l.timestamp).getHours(),
        minute: new Date(l.timestamp).getMinutes(),
        date: new Date(l.timestamp).toISOString().split('T')[0],
      }));
    }

    // Unique days
    const uniqueDays = [...new Set(occurrences.map(o => o.date))];
    const frequency = uniqueDays.length / ML.HABIT_LEARNING_WINDOW;

    // Typical time
    const times = occurrences.map(o => o.hour * 60 + o.minute);
    const avgTime = times.length > 0 ? mean(times) : null;
    const timeStdDev = times.length > 0 ? stdDev(times) : null;

    // Regularity classification
    let regularity = 'irregolare';
    if (timeStdDev !== null) {
      if (timeStdDev <= ML.REGULARITY_THRESHOLD_MINUTES / 2) regularity = 'molto regolare';
      else if (timeStdDev <= ML.REGULARITY_THRESHOLD_MINUTES) regularity = 'regolare';
    }

    // Energy correlation
    let energyCorrelation = null;
    if (snapshots.length >= 5 && uniqueDays.length >= 3) {
      const dayEnergy = snapshots.map(s => ({
        date: s.date,
        energy: s.energy,
        hadHabit: uniqueDays.includes(s.date) ? 1 : 0,
      })).filter(d => d.energy !== null);

      if (dayEnergy.length >= 5) {
        const x = dayEnergy.map(d => d.hadHabit);
        const y = dayEnergy.map(d => d.energy);
        energyCorrelation = Math.round(pearsonCorrelation(x, y) * 100) / 100;
      }
    }

    // Trend (improving/declining/stable)
    let trend = 'stable';
    if (uniqueDays.length >= 3) {
      const firstHalf = uniqueDays.filter(d => {
        const daysAgo = (Date.now() - new Date(d).getTime()) / 86400000;
        return daysAgo >= ML.HABIT_LEARNING_WINDOW / 2;
      }).length;
      const secondHalf = uniqueDays.length - firstHalf;
      if (secondHalf > firstHalf + 1) trend = 'improving';
      else if (firstHalf > secondHalf + 1) trend = 'declining';
    }

    return {
      id: habit.id,
      label: habit.label,
      frequency: Math.round(frequency * 100),
      occurrences: uniqueDays.length,
      typicalTime: avgTime !== null ? `${Math.floor(avgTime / 60)}:${String(Math.round(avgTime % 60)).padStart(2, '0')}` : null,
      regularity,
      timeVariability: timeStdDev !== null ? Math.round(timeStdDev) : null,
      energyCorrelation,
      energyImpact: energyCorrelation !== null
        ? (energyCorrelation > 0.2 ? 'positivo' : energyCorrelation < -0.2 ? 'negativo' : 'neutro')
        : null,
      trend,
    };
  });

  return results;
}

// === Generate smart notification schedule ===
export function generateNotificationSchedule() {
  const habits = analyzeHabits();
  const notifications = [];

  habits.forEach(habit => {
    if (!habit.typicalTime || habit.frequency < 30) return; // Skip infrequent habits

    const [h, m] = habit.typicalTime.split(':').map(Number);

    // Reminder 10min before typical time
    const reminderHour = m >= 10 ? h : (h - 1 + 24) % 24;
    const reminderMin = (m - 10 + 60) % 60;

    notifications.push({
      habitId: habit.id,
      label: habit.label,
      time: `${String(reminderHour).padStart(2, '0')}:${String(reminderMin).padStart(2, '0')}`,
      message: getHabitReminder(habit),
      regularity: habit.regularity,
    });
  });

  // Add check-in reminders at fixed intervals if not already habitual
  const checkinHabit = habits.find(h => h.id === 'checkin');
  if (!checkinHabit || checkinHabit.frequency < 50) {
    ['09:00', '13:00', '18:00'].forEach(time => {
      notifications.push({
        habitId: 'checkin_reminder',
        label: 'Check-in rapido',
        time,
        message: 'Come stai? Registra il tuo stato in 30 secondi.',
        regularity: 'programmato',
      });
    });
  }

  return notifications.sort((a, b) => a.time.localeCompare(b.time));
}

function getHabitReminder(habit) {
  const messages = {
    morning_coffee: `Caffè delle ${habit.typicalTime}? Registralo!`,
    breakfast: 'Buongiorno! Hai fatto colazione?',
    lunch: 'Ora di pranzo! Registra il pasto.',
    dinner: 'Cena! Come hai mangiato?',
    hydration: 'Ricordati di bere! Registra la tua acqua.',
    exercise: 'Tempo di muoverti! Registra l\'attività.',
    sleep: 'Come hai dormito stanotte?',
    checkin: 'Check-in rapido: come ti senti?',
  };
  return messages[habit.id] || `Registra: ${habit.label}`;
}

// Get habit streaks
export function getHabitStreaks() {
  const streaks = Storage.get('habit_streaks', {});
  const habits = analyzeHabits();
  const today = new Date().toISOString().split('T')[0];

  return habits.map(habit => {
    const streak = streaks[habit.id] || { current: 0, best: 0, lastDate: null };
    return {
      ...habit,
      currentStreak: streak.current,
      bestStreak: streak.best,
      completedToday: streak.lastDate === today,
    };
  });
}

export default { analyzeHabits, generateNotificationSchedule, getHabitStreaks };
