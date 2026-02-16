// Terminus PWA - GSD (Get Stuff Done) Pipeline Engine
// Five-phase data processing pipeline:
// 1. CAPTURE → Collect raw data (biometrics, activities, mood, focus)
// 2. CLARIFY → Classify, validate, and normalize inputs
// 3. ORGANIZE → Structure data into analytical models
// 4. REFLECT → AI analysis with Groq for insights
// 5. ENGAGE → Proactive coaching, notifications, and actions

import { Storage } from '../utils/storage.js';
import { calcEnergyScore, getTodayLoad } from './energy.js';
import { calcSleepDebt } from './sleep.js';
import { calcResidualCaffeine, calcCaffeineScore } from './caffeine.js';
import { calcHydrationProgress, calcHydrationScore } from './hydration.js';
import { getCurrentPhase } from './circadian.js';
import { analyzeCorrelations, identifyWeeklyBottleneck, generateSMARTGoals } from './patterns.js';

const GSD_STATE_KEY = 'gsd_pipeline_state';
const GSD_LOG_KEY = 'gsd_pipeline_logs';

// Pipeline state
const PHASES = ['CAPTURE', 'CLARIFY', 'ORGANIZE', 'REFLECT', 'ENGAGE'];

export function getState() {
  return Storage.get(GSD_STATE_KEY, {
    currentPhase: 'CAPTURE',
    lastRun: null,
    phaseLogs: {},
    cycleCount: 0,
  });
}

function updateState(updates) {
  const state = getState();
  const newState = { ...state, ...updates };
  Storage.set(GSD_STATE_KEY, newState);
  return newState;
}

// PHASE 1: CAPTURE - Collect all available data
export function capture() {
  const data = {
    timestamp: new Date().toISOString(),
    activities: Storage.getToday('activity_logs'),
    sleepLogs: Storage.getLastDays('sleep_logs', 7),
    caffeineLogs: Storage.getToday('caffeine_logs'),
    hydrationLogs: Storage.getToday('hydration_logs'),
    energyHistory: Storage.getLastDays('energy_scores', 7),
    moodLogs: Storage.getToday('activity_logs').filter(a => a.mood),
    focusLogs: Storage.getToday('activity_logs').filter(a => a.focus),
  };

  logPhase('CAPTURE', { itemsCaptured: Object.values(data).flat().length });
  updateState({ currentPhase: 'CLARIFY' });
  return data;
}

// PHASE 2: CLARIFY - Validate and classify inputs
export function clarify(rawData) {
  const clarified = {
    timestamp: new Date().toISOString(),

    // Classify activities by type
    activityBreakdown: {
      highFocus: rawData.activities.filter(a => a.type === 'HIGH_FOCUS' || a.type === 'WORK'),
      recovery: rawData.activities.filter(a => a.type === 'RECOVERY' || a.type === 'LEISURE'),
      social: rawData.activities.filter(a => a.type === 'SOCIAL'),
      intake: rawData.activities.filter(a => ['CAFFEINE', 'HYDRATION', 'MEAL'].includes(a.type)),
    },

    // Validate sleep data completeness
    sleepQuality: rawData.sleepLogs.length > 0 ? 'available' : 'missing',
    sleepDays: rawData.sleepLogs.length,

    // Mood/Focus averaging
    avgMood: rawData.moodLogs.length > 0
      ? Math.round(rawData.moodLogs.reduce((s, m) => s + m.mood, 0) / rawData.moodLogs.length * 10) / 10
      : null,
    avgFocus: rawData.focusLogs.length > 0
      ? Math.round(rawData.focusLogs.reduce((s, f) => s + f.focus, 0) / rawData.focusLogs.length * 10) / 10
      : null,

    // Data quality score (0-100)
    dataQuality: calcDataQuality(rawData),

    // Raw data pass-through
    raw: rawData,
  };

  logPhase('CLARIFY', { dataQuality: clarified.dataQuality, sleepDays: clarified.sleepDays });
  updateState({ currentPhase: 'ORGANIZE' });
  return clarified;
}

function calcDataQuality(data) {
  let score = 0;
  if (data.activities.length > 0) score += 20;
  if (data.activities.length > 3) score += 10;
  if (data.sleepLogs.length > 0) score += 20;
  if (data.sleepLogs.length >= 5) score += 10;
  if (data.caffeineLogs.length > 0) score += 10;
  if (data.hydrationLogs.length > 0) score += 15;
  if (data.moodLogs.length > 0) score += 10;
  if (data.focusLogs.length > 0) score += 5;
  return Math.min(score, 100);
}

// PHASE 3: ORGANIZE - Structure into analytical models
export function organize(clarifiedData, profile) {
  const organized = {
    timestamp: new Date().toISOString(),

    // Core metrics
    energyScore: calcEnergyScore(profile),
    sleepDebt: calcSleepDebt(),
    caffeine: {
      residual: calcResidualCaffeine(),
      score: calcCaffeineScore(profile?.bedtime || '23:00'),
    },
    hydration: {
      progress: calcHydrationProgress(profile?.weight || 70, profile?.activityLevel),
      score: calcHydrationScore(profile?.weight || 70, profile?.activityLevel),
    },
    todayLoad: getTodayLoad(),
    circadianPhase: getCurrentPhase(profile?.chronotype || 'ORSO'),

    // Analytical outputs
    correlations: analyzeCorrelations(),
    bottleneck: identifyWeeklyBottleneck(),

    // Context
    dataQuality: clarifiedData.dataQuality,
    avgMood: clarifiedData.avgMood,
    avgFocus: clarifiedData.avgFocus,
    activityBreakdown: clarifiedData.activityBreakdown,
  };

  logPhase('ORGANIZE', {
    energyScore: organized.energyScore.score,
    bottleneck: organized.bottleneck?.component,
  });
  updateState({ currentPhase: 'REFLECT' });
  return organized;
}

// PHASE 4: REFLECT - Generate insights (AI-powered or rule-based)
export function reflect(organizedData, profile) {
  const insights = [];

  // Energy-based insights
  const energy = organizedData.energyScore;
  if (energy.score < 30) {
    insights.push({
      type: 'critical',
      category: 'energy',
      text: `Energia critica (${energy.score}/100). ${energy.suggestion}`,
      priority: 1,
    });
  } else if (energy.score < 50) {
    insights.push({
      type: 'warning',
      category: 'energy',
      text: `Energia bassa (${energy.score}/100). Consiglio: ${energy.suggestion}`,
      priority: 2,
    });
  }

  // Sleep insights
  if (organizedData.sleepDebt.debt > 5) {
    insights.push({
      type: 'warning',
      category: 'sleep',
      text: `Debito di sonno alto: ${organizedData.sleepDebt.debt}h. Vai a letto 30min prima.`,
      priority: 2,
    });
  }

  // Caffeine insights
  if (organizedData.caffeine.score < 50) {
    insights.push({
      type: 'warning',
      category: 'caffeine',
      text: `Troppa caffeina residua. Impatto stimato sul sonno.`,
      priority: 3,
    });
  }

  // Hydration insights
  if (organizedData.hydration.score < 40) {
    insights.push({
      type: 'alert',
      category: 'hydration',
      text: `Disidratazione! Hai bevuto solo ${organizedData.hydration.progress.consumed}ml.`,
      priority: 1,
    });
  }

  // Pattern insights
  if (organizedData.bottleneck) {
    insights.push({
      type: 'pattern',
      category: 'bottleneck',
      text: `Bottleneck settimanale: ${organizedData.bottleneck.label} (${organizedData.bottleneck.percentage}% delle volte)`,
      priority: 3,
    });
  }

  // Circadian phase suggestion
  const phase = organizedData.circadianPhase;
  insights.push({
    type: 'suggestion',
    category: 'circadian',
    text: `Fase: ${phase.label} ${phase.icon}. ${phase.suggestion}`,
    priority: 4,
  });

  // Sort by priority
  insights.sort((a, b) => a.priority - b.priority);

  // Generate SMART goals
  const goals = generateSMARTGoals(organizedData.bottleneck, profile);

  const reflectResult = {
    timestamp: new Date().toISOString(),
    insights,
    goals,
    organizedData,
  };

  logPhase('REFLECT', { insightCount: insights.length, goalCount: goals.length });
  updateState({ currentPhase: 'ENGAGE' });
  return reflectResult;
}

// PHASE 5: ENGAGE - Act on insights (coaching, notifications)
export function engage(reflectResult) {
  const actions = [];

  // Convert top insights to actions
  reflectResult.insights.slice(0, 3).forEach(insight => {
    actions.push({
      type: insight.type === 'critical' || insight.type === 'alert' ? 'notification' : 'suggestion',
      text: insight.text,
      category: insight.category,
      priority: insight.priority,
      timestamp: new Date().toISOString(),
    });
  });

  // Add SMART goals as actions
  reflectResult.goals.forEach((goal, i) => {
    actions.push({
      type: 'goal',
      text: goal.specific,
      measurable: goal.measurable,
      timeBound: goal.timeBound,
      priority: 5 + i,
      timestamp: new Date().toISOString(),
    });
  });

  const engageResult = {
    timestamp: new Date().toISOString(),
    actions,
    insights: reflectResult.insights,
    goals: reflectResult.goals,
    energyScore: reflectResult.organizedData.energyScore,
    circadianPhase: reflectResult.organizedData.circadianPhase,
  };

  logPhase('ENGAGE', { actionCount: actions.length });
  updateState({
    currentPhase: 'CAPTURE',
    lastRun: new Date().toISOString(),
    cycleCount: (getState().cycleCount || 0) + 1,
  });

  return engageResult;
}

// Run full pipeline
export function runPipeline(profile) {
  const raw = capture();
  const clarified = clarify(raw);
  const organized = organize(clarified, profile);
  const reflected = reflect(organized, profile);
  const engaged = engage(reflected);
  return engaged;
}

function logPhase(phase, summary) {
  Storage.append(GSD_LOG_KEY, {
    phase,
    summary,
    timestamp: new Date().toISOString(),
  });
}

// Get pipeline run history
export function getPipelineHistory(limit = 10) {
  const logs = Storage.get(GSD_LOG_KEY, []);
  return logs.slice(-limit * 5); // 5 phases per run
}

export default {
  capture, clarify, organize, reflect, engage,
  runPipeline, getState, getPipelineHistory,
  PHASES,
};
