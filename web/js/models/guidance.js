// Terminus PWA - Activity Guidance System v3.0
// 50+ activity catalog matched to current energy level
// Compares energy with cognitive/physical load requirements

import { CONFIG } from '../config.js';
import { clamp } from '../utils/stats.js';

// Activity catalog: 50+ activities with energy requirements
const ACTIVITY_CATALOG = [
  // HIGH ENERGY (70-100)
  { id: 'deep_work', name: 'Lavoro profondo', icon: '🧠', cogReq: 9, physReq: 2, minEnergy: 70, duration: '60-120min', category: 'produttività' },
  { id: 'study_complex', name: 'Studio materia complessa', icon: '📚', cogReq: 9, physReq: 1, minEnergy: 70, duration: '45-90min', category: 'studio' },
  { id: 'creative_writing', name: 'Scrittura creativa', icon: '✍️', cogReq: 8, physReq: 1, minEnergy: 65, duration: '30-60min', category: 'creativo' },
  { id: 'problem_solving', name: 'Problem solving', icon: '🧩', cogReq: 9, physReq: 1, minEnergy: 70, duration: '30-60min', category: 'produttività' },
  { id: 'presentation', name: 'Preparare presentazione', icon: '🎤', cogReq: 7, physReq: 1, minEnergy: 65, duration: '30-60min', category: 'lavoro' },
  { id: 'hiit', name: 'HIIT / Allenamento intenso', icon: '🏋️', cogReq: 2, physReq: 9, minEnergy: 65, duration: '20-45min', category: 'esercizio' },
  { id: 'running', name: 'Corsa', icon: '🏃', cogReq: 1, physReq: 8, minEnergy: 60, duration: '20-60min', category: 'esercizio' },
  { id: 'brainstorm', name: 'Brainstorming', icon: '💡', cogReq: 7, physReq: 1, minEnergy: 60, duration: '15-30min', category: 'creativo' },
  { id: 'coding', name: 'Programmazione', icon: '💻', cogReq: 8, physReq: 1, minEnergy: 65, duration: '30-90min', category: 'produttività' },
  { id: 'learning_new', name: 'Imparare qualcosa di nuovo', icon: '🎓', cogReq: 7, physReq: 1, minEnergy: 60, duration: '30-60min', category: 'studio' },

  // MEDIUM ENERGY (40-70)
  { id: 'emails', name: 'Gestire email', icon: '📧', cogReq: 4, physReq: 1, minEnergy: 40, duration: '15-30min', category: 'lavoro' },
  { id: 'meetings', name: 'Riunioni', icon: '👥', cogReq: 5, physReq: 1, minEnergy: 45, duration: '30-60min', category: 'lavoro' },
  { id: 'planning', name: 'Pianificazione settimana', icon: '📋', cogReq: 5, physReq: 1, minEnergy: 45, duration: '15-30min', category: 'produttività' },
  { id: 'review_notes', name: 'Rivedere appunti', icon: '📝', cogReq: 4, physReq: 1, minEnergy: 40, duration: '15-30min', category: 'studio' },
  { id: 'walking', name: 'Passeggiata', icon: '🚶', cogReq: 1, physReq: 4, minEnergy: 30, duration: '15-30min', category: 'esercizio' },
  { id: 'yoga', name: 'Yoga / Stretching', icon: '🧘', cogReq: 2, physReq: 4, minEnergy: 30, duration: '15-30min', category: 'benessere' },
  { id: 'cooking', name: 'Cucinare', icon: '🍳', cogReq: 3, physReq: 3, minEnergy: 35, duration: '30-60min', category: 'quotidiano' },
  { id: 'shopping', name: 'Fare la spesa', icon: '🛒', cogReq: 2, physReq: 3, minEnergy: 35, duration: '30-60min', category: 'quotidiano' },
  { id: 'admin', name: 'Attività amministrative', icon: '📊', cogReq: 4, physReq: 1, minEnergy: 40, duration: '15-30min', category: 'lavoro' },
  { id: 'phone_calls', name: 'Telefonate', icon: '📱', cogReq: 3, physReq: 1, minEnergy: 35, duration: '15-30min', category: 'sociale' },
  { id: 'cycling', name: 'Bicicletta leggera', icon: '🚴', cogReq: 1, physReq: 5, minEnergy: 40, duration: '20-45min', category: 'esercizio' },
  { id: 'garden', name: 'Giardinaggio', icon: '🌱', cogReq: 1, physReq: 4, minEnergy: 35, duration: '20-60min', category: 'benessere' },
  { id: 'cleaning', name: 'Pulizie casa', icon: '🧹', cogReq: 1, physReq: 4, minEnergy: 35, duration: '15-45min', category: 'quotidiano' },
  { id: 'journaling', name: 'Diario/Journaling', icon: '📓', cogReq: 3, physReq: 1, minEnergy: 30, duration: '10-20min', category: 'benessere' },
  { id: 'podcast', name: 'Ascoltare podcast', icon: '🎧', cogReq: 3, physReq: 1, minEnergy: 25, duration: '15-45min', category: 'studio' },
  { id: 'social_media', name: 'Social media (limitato)', icon: '📱', cogReq: 2, physReq: 1, minEnergy: 20, duration: '10-15min', category: 'svago' },
  { id: 'organizing', name: 'Organizzare spazi', icon: '📦', cogReq: 2, physReq: 3, minEnergy: 30, duration: '15-30min', category: 'quotidiano' },
  { id: 'light_reading', name: 'Lettura leggera', icon: '📖', cogReq: 3, physReq: 1, minEnergy: 25, duration: '15-45min', category: 'svago' },
  { id: 'music', name: 'Ascoltare musica', icon: '🎵', cogReq: 1, physReq: 1, minEnergy: 10, duration: '15-30min', category: 'benessere' },
  { id: 'socializing', name: 'Socializzare (leggero)', icon: '💬', cogReq: 3, physReq: 1, minEnergy: 30, duration: '30-60min', category: 'sociale' },

  // LOW ENERGY (10-40)
  { id: 'breathing', name: 'Esercizi di respirazione', icon: '🫁', cogReq: 1, physReq: 1, minEnergy: 5, duration: '5-10min', category: 'benessere' },
  { id: 'meditation', name: 'Meditazione', icon: '🧘', cogReq: 2, physReq: 1, minEnergy: 10, duration: '5-20min', category: 'benessere' },
  { id: 'nap', name: 'Power nap (20min)', icon: '💤', cogReq: 0, physReq: 0, minEnergy: 0, duration: '15-25min', category: 'recupero' },
  { id: 'gentle_walk', name: 'Camminata leggera', icon: '🌿', cogReq: 1, physReq: 2, minEnergy: 15, duration: '10-20min', category: 'recupero' },
  { id: 'hydrate', name: 'Idratarsi + spuntino', icon: '💧', cogReq: 0, physReq: 1, minEnergy: 0, duration: '5min', category: 'recupero' },
  { id: 'nature', name: 'Stare nella natura', icon: '🌳', cogReq: 1, physReq: 2, minEnergy: 15, duration: '10-30min', category: 'benessere' },
  { id: 'tv', name: 'TV / Serie TV', icon: '📺', cogReq: 1, physReq: 1, minEnergy: 10, duration: '30-60min', category: 'svago' },
  { id: 'bath', name: 'Bagno/Doccia rilassante', icon: '🛁', cogReq: 0, physReq: 1, minEnergy: 10, duration: '15-30min', category: 'benessere' },
  { id: 'stretching', name: 'Stretching leggero', icon: '🤸', cogReq: 1, physReq: 2, minEnergy: 10, duration: '5-15min', category: 'recupero' },
  { id: 'coloring', name: 'Colorare / Disegno libero', icon: '🎨', cogReq: 2, physReq: 1, minEnergy: 15, duration: '15-30min', category: 'creativo' },

  // CRITICAL ENERGY (<10)
  { id: 'rest', name: 'Riposo completo', icon: '🛏️', cogReq: 0, physReq: 0, minEnergy: 0, duration: 'Quanto serve', category: 'recupero' },
  { id: 'sleep_early', name: 'Vai a dormire presto', icon: '😴', cogReq: 0, physReq: 0, minEnergy: 0, duration: 'Notte intera', category: 'recupero' },
];

// === MAIN: Get recommended activities for current energy ===
export function getRecommendedActivities(energyScore, profile) {
  const scored = ACTIVITY_CATALOG
    .filter(a => a.minEnergy <= energyScore)
    .map(a => {
      // Compatibility score: how well does this match current energy?
      const energyMatch = 1 - Math.abs(energyScore - (a.minEnergy + 15)) / 100;

      // Cognitive/physical load match (shouldn't exceed available energy proportion)
      const cogAvailable = energyScore / 10; // 0-10
      const physAvailable = energyScore / 10;
      const cogMatch = a.cogReq <= cogAvailable ? 1 : 0.5;
      const physMatch = a.physReq <= physAvailable ? 1 : 0.5;

      // Profile preferences boost
      let prefBoost = 0;
      if (profile?.goals?.includes('focus') && a.category === 'produttività') prefBoost = 0.1;
      if (profile?.goals?.includes('fitness') && a.category === 'esercizio') prefBoost = 0.1;
      if (profile?.goals?.includes('stress') && a.category === 'benessere') prefBoost = 0.1;

      const compatibility = clamp(energyMatch * 0.4 + cogMatch * 0.3 + physMatch * 0.2 + prefBoost + 0.1, 0, 1);

      return { ...a, compatibility: Math.round(compatibility * 100) };
    })
    .sort((a, b) => b.compatibility - a.compatibility);

  return scored.slice(0, 8); // Top 8 recommendations
}

// Get the single best "What to do now" recommendation
export function getOptimalAction(energyScore, profile) {
  const recommendations = getRecommendedActivities(energyScore, profile);
  if (recommendations.length === 0) {
    return { name: 'Riposo', icon: '🛏️', reason: 'Energia troppo bassa, riposa.' };
  }
  const best = recommendations[0];
  return {
    ...best,
    reason: generateReason(best, energyScore),
  };
}

function generateReason(activity, energy) {
  if (energy >= 70) return `Energia alta (${energy}): perfetto per ${activity.name.toLowerCase()}`;
  if (energy >= 40) return `Energia moderata (${energy}): ${activity.name.toLowerCase()} è adeguato`;
  if (energy >= 20) return `Energia bassa (${energy}): ${activity.name.toLowerCase()} per recuperare`;
  return `Energia critica (${energy}): ${activity.name.toLowerCase()} è l'unica opzione consigliata`;
}

// Get activities by category
export function getActivitiesByCategory(category) {
  return ACTIVITY_CATALOG.filter(a => a.category === category);
}

// Get all categories
export function getCategories() {
  return [...new Set(ACTIVITY_CATALOG.map(a => a.category))];
}

export { ACTIVITY_CATALOG };
export default { getRecommendedActivities, getOptimalAction, ACTIVITY_CATALOG, getActivitiesByCategory, getCategories };
