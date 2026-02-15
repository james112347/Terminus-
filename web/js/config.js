// Terminus PWA - Configuration
// All API keys are stored in Supabase or localStorage, never hardcoded

export const CONFIG = {
  APP_NAME: 'Terminus',
  APP_VERSION: '2.0.0',
  LANG: 'it',

  // Supabase
  SUPABASE_URL: '', // Set via Settings
  SUPABASE_ANON_KEY: '', // Set via Settings

  // Groq AI
  GROQ_API_URL: 'https://api.groq.com/openai/v1',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_MODEL_FAST: 'llama-3.1-8b-instant',

  // Sahha
  SAHHA_API_URL: 'https://api.sahha.ai',

  // Energy Score Constants
  ENERGY: {
    MAX_SCORE: 100,
    MIN_SCORE: 0,
    SLEEP_WEIGHT: 0.35,
    CIRCADIAN_WEIGHT: 0.25,
    ACTIVITY_WEIGHT: 0.20,
    LIFESTYLE_WEIGHT: 0.20,
    SLEEP_OPTIMAL_HOURS: 8,
    SLEEP_DEBT_WINDOW_DAYS: 7,
    CAFFEINE_HALF_LIFE_HOURS: 5,
    HYDRATION_ML_PER_KG: 35,
  },

  // Chronotypes
  CHRONOTYPES: {
    LUPO: { name: 'Lupo', peakStart: 0, peakEnd: 4, wakeTime: '10:00', sleepTime: '02:00', cortisol_peak: '11:00' },
    LEONE: { name: 'Leone', peakStart: 6, peakEnd: 12, wakeTime: '05:30', sleepTime: '22:00', cortisol_peak: '07:00' },
    ORSO: { name: 'Orso', peakStart: 10, peakEnd: 14, wakeTime: '07:00', sleepTime: '23:00', cortisol_peak: '08:00' },
    DELFINO: { name: 'Delfino', peakStart: 15, peakEnd: 21, wakeTime: '06:30', sleepTime: '23:30', cortisol_peak: '09:00' },
  },

  // Activity Categories
  ACTIVITY_TYPES: {
    HIGH_FOCUS: { label: 'Focus Intenso', icon: '🧠', energyCost: -8 },
    WORK: { label: 'Lavoro', icon: '💼', energyCost: -5 },
    EXERCISE: { label: 'Esercizio', icon: '🏃', energyCost: -6 },
    RECOVERY: { label: 'Recupero', icon: '🧘', energyCost: +4 },
    SOCIAL: { label: 'Sociale', icon: '👥', energyCost: -3 },
    MEAL: { label: 'Pasto', icon: '🍽️', energyCost: +2 },
    CAFFEINE: { label: 'Caffeina', icon: '☕', energyCost: 0 },
    HYDRATION: { label: 'Idratazione', icon: '💧', energyCost: +1 },
    SLEEP: { label: 'Sonno', icon: '😴', energyCost: +10 },
    LEISURE: { label: 'Tempo Libero', icon: '🎮', energyCost: +1 },
  },

  // Mood scale (Likert)
  MOOD_SCALE: [
    { value: 1, label: 'Pessimo', emoji: '😫' },
    { value: 2, label: 'Male', emoji: '😞' },
    { value: 3, label: 'Medio', emoji: '😐' },
    { value: 4, label: 'Bene', emoji: '😊' },
    { value: 5, label: 'Ottimo', emoji: '😄' },
  ],

  // Focus scale
  FOCUS_SCALE: [
    { value: 1, label: 'Zero focus', emoji: '🌫️' },
    { value: 2, label: 'Distratto', emoji: '😵‍💫' },
    { value: 3, label: 'Nella media', emoji: '🎯' },
    { value: 4, label: 'Concentrato', emoji: '🔬' },
    { value: 5, label: 'Flow state', emoji: '⚡' },
  ],

  // Notification channels
  NOTIFICATIONS: {
    SUGGESTION: { sound: 'gentle', priority: 'low' },
    ALERT: { sound: 'alert', priority: 'high' },
    WINDDOWN: { intervals: [120, 60, 30] }, // minutes before sleep
  },
};

// Load saved config from localStorage
export function loadConfig() {
  const saved = localStorage.getItem('terminus_config');
  if (saved) {
    const parsed = JSON.parse(saved);
    CONFIG.SUPABASE_URL = parsed.supabaseUrl || '';
    CONFIG.SUPABASE_ANON_KEY = parsed.supabaseAnonKey || '';
    CONFIG.GROQ_API_KEY = parsed.groqApiKey || '';
    CONFIG.SAHHA_API_KEY = parsed.sahhaApiKey || '';
  }
}

export function saveConfig(updates) {
  const current = JSON.parse(localStorage.getItem('terminus_config') || '{}');
  const merged = { ...current, ...updates };
  localStorage.setItem('terminus_config', JSON.stringify(merged));
  if (updates.supabaseUrl) CONFIG.SUPABASE_URL = updates.supabaseUrl;
  if (updates.supabaseAnonKey) CONFIG.SUPABASE_ANON_KEY = updates.supabaseAnonKey;
  if (updates.groqApiKey) CONFIG.GROQ_API_KEY = updates.groqApiKey;
  if (updates.sahhaApiKey) CONFIG.SAHHA_API_KEY = updates.sahhaApiKey;
}
