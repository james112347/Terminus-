// Terminus PWA - Energy Score Engine v3.0
// 4 scientific components × 25 = 100, with multiplicative interaction penalty
// Components: Circadian (Borbély), Sleep (Van Dongen), Lifestyle (Ganio/Nehlig), Allostatic (McEwen)

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { clamp, cubicSpline } from '../utils/stats.js';
import { calcCircadianScore, getEnergyPrediction } from './circadian.js';
import { calcSleepScore } from './sleep.js';
import { calcLifestyleScore } from './lifestyle.js';
import { calcAllostaticScore } from './allostatic.js';
import { calcResidualCaffeine, getCaffeineCurve } from './caffeine.js';

const ENERGY_LOG_KEY = 'energy_scores';
const ACTIVITY_LOG_KEY = 'activity_logs';
const E = CONFIG.ENERGY;

// === Activity Logging ===
export function logActivity(type, durationMinutes, details = {}) {
  const actType = CONFIG.ACTIVITY_TYPES[type];
  if (!actType) return null;

  const entry = {
    type,
    label: actType.label,
    icon: actType.icon,
    duration: durationMinutes,
    cogLoad: actType.cogLoad,
    physLoad: actType.physLoad,
    mood: details.mood || null,
    focus: details.focus || null,
    notes: details.notes || '',
    timestamp: new Date().toISOString(),
  };

  Storage.append(ACTIVITY_LOG_KEY, entry);
  return entry;
}

// Get today's activity summary
export function getTodayActivities() {
  return Storage.getToday(ACTIVITY_LOG_KEY);
}

// === MAIN: Energy Score (0-100) ===
// 4 components × 25 = 100, minus interaction penalty (up to -15)
export function calcEnergyScore(profile) {
  if (!profile) return { score: 50, label: 'Non configurato', color: '#f4b740', components: {}, bottlenecks: [] };

  // 1. Circadian Score (0-25) — Borbély Two-Process Model
  const circadian = calcCircadianScore(profile);

  // 2. Sleep Score (0-25) — Van Dongen Model
  const sleep = calcSleepScore(profile);

  // 3. Lifestyle Score (0-25) — Ganio 2011 + Nehlig 2018 + POMS
  const lifestyle = calcLifestyleScore(profile);

  // 4. Allostatic Load Score (0-25) — McEwen Model
  const allostatic = calcAllostaticScore(profile);

  // Sum components (max 100)
  const componentSum = circadian.score + sleep.score + lifestyle.score + allostatic.score;

  // === INTERACTION PENALTY ===
  // When multiple components are critically low, the combined effect is worse
  // than the sum would suggest (multiplicative fatigue amplification)
  const scores = [circadian.score, sleep.score, lifestyle.score, allostatic.score];
  const criticalComponents = scores.filter(s => s < E.INTERACTION_THRESHOLD);
  let interactionPenalty = 0;

  if (criticalComponents.length >= 2) {
    // Penalty scales with number of critical components and their severity
    const avgCriticalScore = criticalComponents.reduce((s, v) => s + v, 0) / criticalComponents.length;
    const severityFactor = 1 - (avgCriticalScore / E.INTERACTION_THRESHOLD); // 0-1
    const countFactor = (criticalComponents.length - 1) / 3; // 1-3 additional → 0.33-1.0
    interactionPenalty = Math.round(E.INTERACTION_PENALTY_MAX * severityFactor * countFactor);
  }

  const finalScore = Math.round(clamp(componentSum - interactionPenalty, 0, 100));

  // Label and color
  const { label, color, suggestion } = getScoreLabel(finalScore);

  // Detect bottlenecks
  const bottlenecks = detectBottlenecks(circadian, sleep, lifestyle, allostatic, profile);

  const result = {
    score: finalScore,
    label,
    color,
    suggestion,
    components: {
      circadian: {
        score: circadian.score,
        max: E.COMPONENT_MAX,
        label: 'Ritmo Circadiano',
        phase: circadian.phase,
        details: circadian.details,
      },
      sleep: {
        score: sleep.score,
        max: E.COMPONENT_MAX,
        label: 'Sonno',
        debt: sleep.debt,
        avgDuration: sleep.avgDuration,
        qualityScore: sleep.qualityScore,
        trend: sleep.trend,
        details: sleep.details,
      },
      lifestyle: {
        score: lifestyle.score,
        max: E.COMPONENT_MAX,
        label: 'Stile di Vita',
        details: lifestyle.details,
      },
      allostatic: {
        score: allostatic.score,
        max: E.COMPONENT_MAX,
        label: 'Carico Allostatico',
        details: allostatic.details,
      },
    },
    interactionPenalty,
    criticalCount: criticalComponents.length,
    bottlenecks,
    timestamp: new Date().toISOString(),
  };

  // Save to history
  Storage.append(ENERGY_LOG_KEY, {
    score: finalScore,
    circadian: circadian.score,
    sleep: sleep.score,
    lifestyle: lifestyle.score,
    allostatic: allostatic.score,
    interactionPenalty,
    timestamp: result.timestamp,
  });

  return result;
}

// === Score Label & Color ===
function getScoreLabel(score) {
  if (score >= 80) return { label: 'Eccellente', color: '#26c281', suggestion: 'Ideale per lavoro profondo e task complessi' };
  if (score >= 65) return { label: 'Buono', color: '#4a90d9', suggestion: 'Buono per task standard e produttività' };
  if (score >= 50) return { label: 'Moderato', color: '#f4b740', suggestion: 'Task leggeri, prenditi pause regolari' };
  if (score >= 35) return { label: 'Basso', color: '#f0883e', suggestion: 'Riposa, idratati, evita sovraccarico' };
  if (score >= 20) return { label: 'Molto Basso', color: '#e74c6f', suggestion: 'Recupero prioritario. Solo attività essenziali' };
  return { label: 'Critico', color: '#c0392b', suggestion: 'Stop immediato. Riposo urgente necessario' };
}

// === Bottleneck Detection (15 types) ===
function detectBottlenecks(circadian, sleep, lifestyle, allostatic, profile) {
  const bottlenecks = [];
  const BN = CONFIG.BOTTLENECKS;

  // Sleep bottlenecks
  if (sleep.qualityScore !== undefined && sleep.qualityScore < 50) {
    bottlenecks.push({
      ...BN.SLEEP_QUALITY,
      severity: sleep.qualityScore < 30 ? 'alta' : 'media',
      value: sleep.qualityScore,
      advice: 'Migliora la routine pre-sonno: niente schermi 30min prima, temperatura 18-20°C, buio completo.',
    });
  }
  if (sleep.debt > 5) {
    bottlenecks.push({
      ...BN.SLEEP_DEBT,
      severity: sleep.debt > 10 ? 'alta' : 'media',
      value: `${sleep.debt}h`,
      advice: `Hai un debito di ${sleep.debt}h. Vai a dormire 30-60min prima per i prossimi giorni.`,
    });
  }

  // Circadian bottlenecks
  if (circadian.details?.alignmentPenalty > 0.08) {
    bottlenecks.push({
      ...BN.CIRCADIAN_MISALIGN,
      severity: circadian.details.alignmentPenalty > 0.12 ? 'alta' : 'media',
      value: `${Math.round(circadian.details.alignmentPenalty * 100)}%`,
      advice: 'Svegliati alla stessa ora ogni giorno (±30min). Esponiti alla luce naturale appena sveglio.',
    });
  }

  // Lifestyle bottlenecks
  const ld = lifestyle.details || {};
  if (ld.hydrationPct < 40 && new Date().getHours() > 12) {
    bottlenecks.push({
      ...BN.DEHYDRATION,
      severity: ld.hydrationPct < 25 ? 'alta' : 'media',
      value: `${ld.hydrationPct}%`,
      advice: `Sei al ${ld.hydrationPct}% dell'idratazione target. Bevi almeno 500ml nelle prossime 2 ore.`,
    });
  }
  if (ld.mealScore !== undefined && ld.mealScore < 1.5) {
    bottlenecks.push({
      ...BN.POOR_NUTRITION,
      severity: 'media',
      value: `${ld.mealScore}/4`,
      advice: 'Qualità dei pasti scarsa. Bilancia proteine, carboidrati complessi e verdure.',
    });
  }
  if (ld.caffeineBedMg > 50) {
    bottlenecks.push({
      ...BN.LATE_CAFFEINE,
      severity: ld.caffeineBedMg > 100 ? 'alta' : 'media',
      value: `${ld.caffeineBedMg}mg al bed`,
      advice: `Avrai ~${ld.caffeineBedMg}mg di caffeina al momento di dormire. Non bere più caffè oggi.`,
    });
  }
  if (ld.caffeineTotalMg > 400) {
    bottlenecks.push({
      ...BN.EXCESSIVE_CAFFEINE,
      severity: ld.caffeineTotalMg > 500 ? 'alta' : 'media',
      value: `${ld.caffeineTotalMg}mg`,
      advice: `Hai consumato ${ld.caffeineTotalMg}mg di caffeina (max raccomandato: 400mg FDA).`,
    });
  }
  if (ld.exerciseScore === 0 && ld.steps < 3000 && new Date().getHours() > 14) {
    bottlenecks.push({
      ...BN.SEDENTARY,
      severity: 'media',
      value: `${ld.steps || 0} passi`,
      advice: 'Giornata sedentaria. Anche 15min di camminata migliorano energia e umore (POMS boost).',
    });
  }
  if (ld.screenPenalty >= 2) {
    bottlenecks.push({
      ...BN.SCREEN_FATIGUE,
      severity: ld.screenPenalty >= 3 ? 'alta' : 'media',
      value: `${ld.screenMinutes}min`,
      advice: 'Troppo tempo allo schermo. Regola 20-20-20: ogni 20min guarda a 20 piedi per 20 secondi.',
    });
  }

  // Allostatic bottlenecks
  const ad = allostatic.details || {};
  if (ad.workHours > E.WORK_HOURS_OPTIMAL) {
    bottlenecks.push({
      ...BN.WORK_OVERLOAD,
      severity: ad.workHours > E.WORK_HOURS_OVERLOAD ? 'alta' : 'media',
      value: `${ad.workHours}h`,
      advice: `Hai lavorato ${ad.workHours}h oggi. Inserisci pause e chiudi entro 1 ora se possibile.`,
    });
  }
  if (ad.stressLatest && ad.stressLatest >= E.STRESS_HIGH_THRESHOLD) {
    bottlenecks.push({
      ...BN.HIGH_STRESS,
      severity: ad.stressLatest >= 9 ? 'alta' : 'media',
      value: `${ad.stressLatest}/10`,
      advice: 'Stress elevato. Prova 5 minuti di respirazione 4-7-8 (inspira 4s, trattieni 7s, espira 8s).',
    });
  }
  if (ad.burnoutScore === 0) {
    bottlenecks.push({
      ...BN.BURNOUT_RISK,
      severity: 'alta',
      value: `${ad.consecutiveLowDays} giorni bassi`,
      advice: 'Rischio burnout: energia bassa per troppi giorni consecutivi. Riduci il carico e prioritizza il recupero.',
    });
  }
  if (ad.hrvScore <= 1 && ad.hrv !== null) {
    bottlenecks.push({
      ...BN.LOW_HRV,
      severity: 'alta',
      value: `${ad.hrv}ms`,
      advice: 'HRV basso indica recupero autonomico scarso. Evita stress intenso, pratica respirazione lenta.',
    });
  }
  if (ad.restingHR && ad.restingHR > E.HR_HIGH_THRESHOLD) {
    bottlenecks.push({
      ...BN.HIGH_HR,
      severity: ad.restingHR > 100 ? 'alta' : 'media',
      value: `${ad.restingHR}bpm`,
      advice: 'Frequenza cardiaca a riposo elevata. Possibili cause: stress, disidratazione, mancanza di sonno.',
    });
  }
  if (ad.emotionalLatest && ad.emotionalLatest <= 3) {
    bottlenecks.push({
      ...BN.EMOTIONAL_FATIGUE,
      severity: ad.emotionalLatest <= 2 ? 'alta' : 'media',
      value: `${ad.emotionalLatest}/10`,
      advice: 'Affaticamento emotivo rilevato. Socializza con persone positive o dedica tempo ad attività piacevoli.',
    });
  }

  // Sort by severity
  const severityOrder = { alta: 0, media: 1, bassa: 2 };
  return bottlenecks.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));
}

// === Routine Outlook — Prospettiva Giornata ===
export function getRoutineOutlook(profile) {
  const now = new Date();
  const hour = now.getHours();
  const chronotype = profile?.chronotype || 'ORSO';
  const ct = CONFIG.CHRONOTYPES[chronotype] || CONFIG.CHRONOTYPES.ORSO;
  const bedtimeStr = profile?.bedtime || ct.sleepTime;
  const [bedH] = bedtimeStr.split(':').map(Number);

  const events = [];

  // Meals timeline
  const mealTimes = [
    { time: '07:30', label: 'Colazione', icon: '🥐', type: 'meal' },
    { time: '12:30', label: 'Pranzo', icon: '🍝', type: 'meal' },
    { time: '19:30', label: 'Cena', icon: '🍽️', type: 'meal' },
  ];
  mealTimes.forEach(m => {
    const [mH] = m.time.split(':').map(Number);
    if (mH > hour) events.push({ ...m, status: 'upcoming' });
    else events.push({ ...m, status: 'past' });
  });

  // Caffeine cutoff
  const halfLife = E.CAFFEINE_HALF_LIFE_HOURS;
  const cutoffH = Math.max(0, bedH - Math.ceil(halfLife * Math.log2(63 / 25)));
  events.push({
    time: `${String(cutoffH).padStart(2, '0')}:00`,
    label: 'Cutoff caffeina',
    icon: '🚫☕',
    type: 'cutoff',
    status: hour >= cutoffH ? 'past' : 'upcoming',
  });

  // Peak/dip windows
  ct.peakWindows.forEach(peak => {
    const startH = Math.floor(peak.start);
    if (startH > hour) {
      events.push({
        time: `${String(startH).padStart(2, '0')}:00`,
        label: 'Picco energetico previsto',
        icon: '⚡',
        type: 'peak',
        status: 'upcoming',
        intensity: peak.intensity,
      });
    }
  });
  ct.dipWindows.forEach(dip => {
    const startH = Math.floor(dip.start);
    if (startH > hour) {
      events.push({
        time: `${String(startH).padStart(2, '0')}:00`,
        label: 'Calo energetico previsto',
        icon: '📉',
        type: 'dip',
        status: 'upcoming',
        intensity: dip.intensity,
      });
    }
  });

  // Wind-down and bedtime
  const winddownH = (bedH - 2 + 24) % 24;
  events.push({
    time: `${String(winddownH).padStart(2, '0')}:00`,
    label: 'Inizio wind-down',
    icon: '🌅',
    type: 'winddown',
    status: hour >= winddownH ? 'active' : 'upcoming',
  });
  events.push({
    time: bedtimeStr,
    label: 'Bedtime target',
    icon: '🛏️',
    type: 'bedtime',
    status: 'upcoming',
  });

  // Exercise suggestion
  const exerciseH = ct.peakWindows.length > 1
    ? Math.floor(ct.peakWindows[1].start)
    : 17;
  if (exerciseH > hour) {
    events.push({
      time: `${String(exerciseH).padStart(2, '0')}:00`,
      label: 'Finestra esercizio suggerita',
      icon: '🏃',
      type: 'exercise',
      status: 'upcoming',
    });
  }

  // Lifestyle projection
  const weight = profile?.weight || 70;
  const residualCaffeineBed = calcResidualCaffeine(new Date(now.getFullYear(), now.getMonth(), now.getDate(), bedH, 0));
  const hydrationLogs = Storage.getToday('hydration_logs');
  const hydrationMl = hydrationLogs.reduce((s, h) => s + (h.ml || 0), 0);
  const hydrationTarget = Math.round(weight * E.HYDRATION_ML_PER_KG * 1.1);
  const dailyLogs = Storage.getToday('daily_energy_logs');
  const latestDaily = dailyLogs.length > 0 ? dailyLogs[dailyLogs.length - 1] : {};

  const lifestyleProjection = {
    hydrationPct: Math.round((hydrationMl / hydrationTarget) * 100),
    hydrationRemaining: Math.max(0, hydrationTarget - hydrationMl),
    residualCaffeineBed: Math.round(residualCaffeineBed),
    screenMinutes: latestDaily.screenMinutes || 0,
    workHoursRemaining: latestDaily.workHours ? Math.max(0, E.WORK_HOURS_OPTIMAL - latestDaily.workHours) : null,
  };

  // Sort events by time
  events.sort((a, b) => a.time.localeCompare(b.time));

  return {
    events: events.filter(e => e.status !== 'past'),
    allEvents: events,
    lifestyleProjection,
    currentPhase: getCurrentPhase(hour, ct),
  };
}

function getCurrentPhase(hour, ct) {
  for (const peak of ct.peakWindows) {
    if (hour >= peak.start && hour < peak.end) return { name: 'Picco', icon: '⚡', suggestion: 'Lavoro profondo / task complessi' };
  }
  for (const dip of ct.dipWindows) {
    if (hour >= dip.start && hour < dip.end) return { name: 'Calo', icon: '📉', suggestion: 'Task leggeri / pausa attiva' };
  }
  if (hour < 6 || hour >= 22) return { name: 'Sonno', icon: '🌙', suggestion: 'Dovresti riposare' };
  if (hour <= 8) return { name: 'Risveglio', icon: '🌅', suggestion: 'Luce naturale + idratazione' };
  return { name: 'Attivo', icon: '📊', suggestion: 'Task standard' };
}

// === 12h Prediction Curve ===
export function generatePredictionCurve(profile) {
  const circadianPoints = getEnergyPrediction(profile);
  const currentEnergy = calcEnergyScore(profile);

  // Anchor prediction to current real score
  const circadianNow = circadianPoints[0]?.y || 50;
  const offset = currentEnergy.score - circadianNow;

  // Apply offset with exponential decay (returns to circadian baseline)
  const adjustedPoints = circadianPoints.map((p, i) => ({
    x: p.x,
    y: clamp(p.y + offset * Math.exp(-i * 0.12), 0, 100),
    time: p.time,
  }));

  // Overlay caffeine decay impact
  const caffeineCurve = getCaffeineCurve(12);
  const adjustedWithCaffeine = adjustedPoints.map((p, i) => {
    const caffeinePoint = caffeineCurve[Math.floor(i / 2)] || { y: 0 };
    // Caffeine > 50mg adds alertness boost, > 200mg adds jitter penalty
    const caffeineEffect = caffeinePoint.y > 200 ? -3 : caffeinePoint.y > 50 ? 3 : 0;
    return { ...p, y: clamp(p.y + caffeineEffect, 0, 100), caffeineMg: Math.round(caffeinePoint.y) };
  });

  // Smooth with spline
  if (adjustedWithCaffeine.length >= 2) {
    const spline = cubicSpline(adjustedWithCaffeine);
    const smoothCurve = [];
    for (let h = 0; h <= 12; h += 0.25) {
      const timeMs = Date.now() + h * 3600000;
      smoothCurve.push({
        hour: h,
        energy: Math.round(clamp(spline(h), 0, 100)),
        time: new Date(timeMs).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      });
    }
    return smoothCurve;
  }

  return adjustedWithCaffeine;
}

// === Historical Data ===
export function getEnergyHistory(days = 7) {
  return Storage.getLastDays(ENERGY_LOG_KEY, days);
}

// === Get weekly component averages ===
export function getWeeklyComponentAverages() {
  const history = getEnergyHistory(7);
  if (history.length === 0) return null;

  const avg = (key) => {
    const vals = history.filter(h => h[key] != null).map(h => h[key]);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };

  return {
    overall: avg('score'),
    circadian: avg('circadian'),
    sleep: avg('sleep'),
    lifestyle: avg('lifestyle'),
    allostatic: avg('allostatic'),
    days: history.length,
  };
}

export default {
  logActivity, getTodayActivities, calcEnergyScore,
  generatePredictionCurve, getEnergyHistory, getRoutineOutlook,
  getWeeklyComponentAverages,
};
