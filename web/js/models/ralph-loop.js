// Terminus PWA - Ralph Loop Engine
// Continuous improvement cycle for user habits:
// 1. REVIEW → Daily review of data and energy
// 2. ANALYZE → Pattern analysis, correlations
// 3. LEARN → Calibrate predictions, update models
// 4. PLAN → Generate action plans and SMART goals
// 5. HABITUATE → Reinforce positive habits, track streaks

import { Storage } from '../utils/storage.js';
import { mean } from '../utils/stats.js';
import { getEnergyTrend, analyzeCorrelations, identifyWeeklyBottleneck, generateSMARTGoals } from './patterns.js';
import { calcSleepDebt } from './sleep.js';
import { dayName, dayOfWeek, formatDate } from '../utils/datetime.js';

const RALPH_STATE_KEY = 'ralph_loop_state';
const RALPH_LOG_KEY = 'ralph_loop_logs';
const HABIT_STREAK_KEY = 'habit_streaks';

const PHASES = ['REVIEW', 'ANALYZE', 'LEARN', 'PLAN', 'HABITUATE'];

export function getState() {
  return Storage.get(RALPH_STATE_KEY, {
    currentPhase: 'REVIEW',
    lastCycle: null,
    cycleCount: 0,
    activeGoals: [],
    streaks: {},
  });
}

function updateState(updates) {
  const state = getState();
  const newState = { ...state, ...updates };
  Storage.set(RALPH_STATE_KEY, newState);
  return newState;
}

// PHASE 1: REVIEW - Daily data review
export function review() {
  const energyHistory = Storage.getLastDays('energy_scores', 7);
  const todayActivities = Storage.getToday('activity_logs');
  const sleepData = calcSleepDebt();

  const todayScores = energyHistory.filter(e => {
    const d = new Date(e.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const reviewResult = {
    phase: 'REVIEW',
    timestamp: new Date().toISOString(),

    // Today's summary
    today: {
      avgEnergy: todayScores.length > 0
        ? Math.round(mean(todayScores.map(s => s.score)))
        : null,
      activitiesCount: todayActivities.length,
      peakEnergy: todayScores.length > 0
        ? Math.max(...todayScores.map(s => s.score))
        : null,
      lowEnergy: todayScores.length > 0
        ? Math.min(...todayScores.map(s => s.score))
        : null,
    },

    // Week overview
    week: {
      avgEnergy: energyHistory.length > 0
        ? Math.round(mean(energyHistory.map(s => s.score)))
        : null,
      dataPoints: energyHistory.length,
      sleepDebt: sleepData.debt,
      sleepAvg: sleepData.avgDuration,
    },
  };

  logPhase('REVIEW', reviewResult);
  updateState({ currentPhase: 'ANALYZE' });
  return reviewResult;
}

// PHASE 2: ANALYZE - Pattern analysis
export function analyze() {
  const correlations = analyzeCorrelations();
  const bottleneck = identifyWeeklyBottleneck();
  const trend = getEnergyTrend(14);

  const analyzeResult = {
    phase: 'ANALYZE',
    timestamp: new Date().toISOString(),
    correlations: correlations.filter(c => Math.abs(c.r) > 0.3), // Only significant ones
    bottleneck,
    trend: {
      direction: trend.trend,
      slope: trend.slope,
      average: trend.average,
    },
  };

  logPhase('ANALYZE', analyzeResult);
  updateState({ currentPhase: 'LEARN' });
  return analyzeResult;
}

// PHASE 3: LEARN - Calibrate models and extract lessons
export function learn(analysisResult) {
  const lessons = [];

  // Learn from correlations
  analysisResult.correlations.forEach(corr => {
    if (Math.abs(corr.r) > 0.5) {
      lessons.push({
        type: 'correlation',
        finding: corr.description,
        strength: corr.strength,
        actionable: true,
      });
    }
  });

  // Learn from bottleneck
  if (analysisResult.bottleneck) {
    lessons.push({
      type: 'bottleneck',
      finding: `${analysisResult.bottleneck.label} è il fattore limitante (${analysisResult.bottleneck.percentage}%)`,
      component: analysisResult.bottleneck.component,
      actionable: true,
    });
  }

  // Learn from trend
  if (analysisResult.trend.direction === 'declining') {
    lessons.push({
      type: 'trend',
      finding: 'Energia in declino. Serve un intervento.',
      actionable: true,
    });
  } else if (analysisResult.trend.direction === 'improving') {
    lessons.push({
      type: 'trend',
      finding: 'Energia in miglioramento! Le abitudini stanno funzionando.',
      actionable: false,
    });
  }

  // Save learned model adjustments
  const modelAdjustments = {};
  if (analysisResult.bottleneck) {
    // Increase weight of bottleneck component
    modelAdjustments[analysisResult.bottleneck.component] = {
      importanceBoost: 0.05,
      reason: `Bottleneck frequente (${analysisResult.bottleneck.percentage}%)`,
    };
  }

  const learnResult = {
    phase: 'LEARN',
    timestamp: new Date().toISOString(),
    lessons,
    modelAdjustments,
    lessonsCount: lessons.length,
  };

  logPhase('LEARN', learnResult);
  updateState({ currentPhase: 'PLAN' });
  return learnResult;
}

// PHASE 4: PLAN - Generate action plans
export function plan(learnResult, profile) {
  const bottleneck = learnResult.lessons.find(l => l.type === 'bottleneck');
  const goals = generateSMARTGoals(
    bottleneck ? { component: bottleneck.component, label: bottleneck.finding } : null,
    profile
  );

  // Create daily micro-plan based on lessons
  const dailyPlan = [];

  learnResult.lessons.filter(l => l.actionable).forEach(lesson => {
    switch (lesson.type) {
      case 'bottleneck':
        if (lesson.component === 'sleep') {
          dailyPlan.push({ time: 'sera', action: 'Wind-down protocol -2h', priority: 1 });
        } else if (lesson.component === 'lifestyle') {
          dailyPlan.push({ time: 'mattina', action: 'Idratazione: 500ml prima delle 9', priority: 1 });
          dailyPlan.push({ time: 'pomeriggio', action: 'Cutoff caffeina alle 14:00', priority: 2 });
        } else if (lesson.component === 'activity') {
          dailyPlan.push({ time: 'ogni 90min', action: 'Pausa 15min (Pomodoro)', priority: 2 });
        }
        break;
      case 'correlation':
        dailyPlan.push({ time: 'tutto il giorno', action: `Focus: ${lesson.finding}`, priority: 3 });
        break;
    }
  });

  const planResult = {
    phase: 'PLAN',
    timestamp: new Date().toISOString(),
    goals,
    dailyPlan: dailyPlan.sort((a, b) => a.priority - b.priority),
  };

  logPhase('PLAN', planResult);
  updateState({ currentPhase: 'HABITUATE', activeGoals: goals });
  return planResult;
}

// PHASE 5: HABITUATE - Track habit formation and streaks
export function habituate() {
  const state = getState();
  const streaks = Storage.get(HABIT_STREAK_KEY, {});
  const today = new Date().toISOString().split('T')[0];

  // Default habits to track
  const habitChecklist = [
    { id: 'log_sleep', label: 'Registrato sonno', check: () => Storage.getToday('sleep_logs').length > 0 },
    { id: 'log_water', label: 'Registrato acqua', check: () => Storage.getToday('hydration_logs').length > 0 },
    { id: 'log_mood', label: 'Registrato umore', check: () => Storage.getToday('activity_logs').some(a => a.mood) },
    { id: 'log_activity', label: 'Registrato attività', check: () => Storage.getToday('activity_logs').length >= 3 },
    { id: 'energy_check', label: 'Controllato energia', check: () => Storage.getToday('energy_scores').length > 0 },
  ];

  const results = habitChecklist.map(habit => {
    const completed = habit.check();

    // Update streak
    if (!streaks[habit.id]) {
      streaks[habit.id] = { current: 0, best: 0, lastDate: null };
    }

    const streak = streaks[habit.id];
    if (completed && streak.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      streak.current = streak.lastDate === yesterday ? streak.current + 1 : 1;
      streak.best = Math.max(streak.best, streak.current);
      streak.lastDate = today;
    } else if (!completed && streak.lastDate !== today) {
      // Streak broken if yesterday was not logged
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (streak.lastDate !== yesterday && streak.lastDate !== today) {
        streak.current = 0;
      }
    }

    return {
      ...habit,
      completed,
      streak: streak.current,
      bestStreak: streak.best,
    };
  });

  Storage.set(HABIT_STREAK_KEY, streaks);

  const habituateResult = {
    phase: 'HABITUATE',
    timestamp: new Date().toISOString(),
    habits: results,
    completedCount: results.filter(r => r.completed).length,
    totalHabits: results.length,
    overallStreak: Math.min(...results.map(r => r.streak)),
  };

  logPhase('HABITUATE', habituateResult);
  updateState({
    currentPhase: 'REVIEW',
    lastCycle: new Date().toISOString(),
    cycleCount: (state.cycleCount || 0) + 1,
    streaks: streaks,
  });

  return habituateResult;
}

// Run full Ralph Loop cycle
export function runCycle(profile) {
  const reviewResult = review();
  const analyzeResult = analyze();
  const learnResult = learn(analyzeResult);
  const planResult = plan(learnResult, profile);
  const habituateResult = habituate();

  return {
    review: reviewResult,
    analyze: analyzeResult,
    learn: learnResult,
    plan: planResult,
    habituate: habituateResult,
    timestamp: new Date().toISOString(),
  };
}

function logPhase(phase, data) {
  Storage.append(RALPH_LOG_KEY, { phase, data, timestamp: new Date().toISOString() });
}

// Get loop history
export function getLoopHistory(limit = 5) {
  const logs = Storage.get(RALPH_LOG_KEY, []);
  return logs.slice(-limit * 5);
}

export default {
  review, analyze, learn, plan, habituate,
  runCycle, getState, getLoopHistory, PHASES,
};
