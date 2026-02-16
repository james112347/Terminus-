// Terminus PWA - Configuration v3.0
// Scientific models: Borbély Two-Process, Van Dongen, McEwen Allostatic Load, Ganio/Nehlig

export const CONFIG = {
  APP_NAME: 'Terminus',
  APP_VERSION: '3.0.0',
  LANG: 'it',

  // API endpoints
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  GROQ_API_URL: 'https://api.groq.com/openai/v1',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_MODEL_FAST: 'llama-3.1-8b-instant',
  SAHHA_API_URL: 'https://api.sahha.ai',

  // === ENERGY SCORE: 4 components × 25 = 100 ===
  ENERGY: {
    MAX_SCORE: 100,
    COMPONENT_MAX: 25,
    // Interaction penalty when multiple components are critical
    INTERACTION_PENALTY_MAX: 15,
    INTERACTION_THRESHOLD: 10, // components below this trigger penalty

    // Sleep (Van Dongen)
    SLEEP_OPTIMAL_HOURS: 8,
    SLEEP_DEBT_WINDOW_DAYS: 7,
    SLEEP_RECENCY_WEIGHTS: [1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2], // day 0→6
    NAP_RECOVERY_FACTOR: 0.3, // nap recovers 30% of equivalent night sleep
    ALCOHOL_SLEEP_PENALTY: 0.15, // 15% quality reduction per drink

    // Circadian (Borbély Two-Process)
    BRAC_CYCLE_MINUTES: 95, // Basic Rest-Activity Cycle
    POST_PRANDIAL_DIP_DURATION: 90, // minutes
    POST_PRANDIAL_DIP_INTENSITY: 0.15, // 15% energy dip after meals
    CAR_PEAK_MINUTES: 30, // Cortisol Awakening Response peaks 30min after wake
    CAR_DURATION_MINUTES: 60,

    // Lifestyle (Ganio 2011, Nehlig 2018)
    CAFFEINE_HALF_LIFE_HOURS: 5,
    CAFFEINE_A2A_BLOCK_PEAK_HOURS: 1, // peak adenosine A2A receptor blockade
    HYDRATION_ML_PER_KG: 35,
    DEHYDRATION_COGNITIVE_THRESHOLD: 0.02, // 2% body weight loss
    EXERCISE_BOOST_DURATION_HOURS: 4, // POMS acute mood boost
    EXERCISE_BOOST_INTENSITY: 0.12, // 12% energy boost
    SMOKING_VASOCONSTRICTION_PENALTY: 0.05, // per cigarette
    ALCOHOL_ENERGY_PENALTY: 0.08, // per drink
    SCREEN_FATIGUE_THRESHOLD_MINUTES: 120, // 2h continuous screen → fatigue

    // Allostatic Load (McEwen)
    WORK_HOURS_OPTIMAL: 8,
    WORK_HOURS_OVERLOAD: 10,
    STRESS_HIGH_THRESHOLD: 7, // 1-10 scale
    BURNOUT_CONSECUTIVE_LOW_DAYS: 3, // days with energy < 40
    HRV_LOW_THRESHOLD: 20, // SDNN ms
    HR_HIGH_THRESHOLD: 90, // resting bpm
  },

  // Chronotypes with detailed phase profiles
  CHRONOTYPES: {
    LEONE: {
      name: 'Leone', icon: '🦁',
      desc: 'Mattiniero, picco alle prime ore',
      wakeTime: '05:30', sleepTime: '22:00',
      cortisolPeak: '06:30',
      peakWindows: [{ start: 6, end: 10, intensity: 1.0 }, { start: 15, end: 17, intensity: 0.6 }],
      dipWindows: [{ start: 13, end: 14.5, intensity: 0.7 }],
      processC_phase: -1.5, // hours shift from standard
    },
    ORSO: {
      name: 'Orso', icon: '🐻',
      desc: 'Segue il ritmo solare, stabile',
      wakeTime: '07:00', sleepTime: '23:00',
      cortisolPeak: '08:00',
      peakWindows: [{ start: 10, end: 14, intensity: 1.0 }, { start: 16, end: 18, intensity: 0.7 }],
      dipWindows: [{ start: 14, end: 15.5, intensity: 0.6 }],
      processC_phase: 0,
    },
    LUPO: {
      name: 'Lupo', icon: '🐺',
      desc: 'Notturno, picco creativo di notte',
      wakeTime: '09:00', sleepTime: '01:00',
      cortisolPeak: '10:00',
      peakWindows: [{ start: 12, end: 14, intensity: 0.7 }, { start: 17, end: 23, intensity: 1.0 }],
      dipWindows: [{ start: 9, end: 11, intensity: 0.5 }],
      processC_phase: 2,
    },
    DELFINO: {
      name: 'Delfino', icon: '🐬',
      desc: 'Sonno leggero, picco pomeridiano',
      wakeTime: '06:30', sleepTime: '23:30',
      cortisolPeak: '09:00',
      peakWindows: [{ start: 10, end: 12, intensity: 0.8 }, { start: 15, end: 21, intensity: 1.0 }],
      dipWindows: [{ start: 13, end: 14.5, intensity: 0.8 }],
      processC_phase: 0.5,
    },
  },

  // Quick check-in categories
  CHECKIN: {
    sleepQuality: { label: 'Qualità sonno', scale: 10, icon: '😴' },
    mood: { label: 'Umore', scale: 10, icon: '😊' },
    stress: { label: 'Stress', scale: 10, icon: '😰', inverted: true },
    focus: { label: 'Focus', scale: 10, icon: '🎯' },
    physicalEnergy: { label: 'Energia fisica', scale: 10, icon: '💪' },
    mentalEnergy: { label: 'Energia mentale', scale: 10, icon: '🧠' },
    emotionalEnergy: { label: 'Energia emotiva', scale: 10, icon: '❤️' },
  },

  // Activity categories for tracking
  ACTIVITY_TYPES: {
    HIGH_FOCUS: { label: 'Focus Intenso', icon: '🧠', cogLoad: 9, physLoad: 2 },
    WORK: { label: 'Lavoro', icon: '💼', cogLoad: 6, physLoad: 2 },
    EXERCISE_LIGHT: { label: 'Esercizio Leggero', icon: '🚶', cogLoad: 1, physLoad: 4 },
    EXERCISE_INTENSE: { label: 'Esercizio Intenso', icon: '🏋️', cogLoad: 2, physLoad: 9 },
    RECOVERY: { label: 'Recupero', icon: '🧘', cogLoad: 1, physLoad: 1 },
    SOCIAL: { label: 'Sociale', icon: '👥', cogLoad: 3, physLoad: 1 },
    MEAL: { label: 'Pasto', icon: '🍽️', cogLoad: 0, physLoad: 0 },
    CAFFEINE: { label: 'Caffeina', icon: '☕', cogLoad: 0, physLoad: 0 },
    HYDRATION: { label: 'Idratazione', icon: '💧', cogLoad: 0, physLoad: 0 },
    SLEEP: { label: 'Sonno', icon: '😴', cogLoad: 0, physLoad: 0 },
    NAP: { label: 'Pisolino', icon: '💤', cogLoad: 0, physLoad: 0 },
    LEISURE: { label: 'Tempo Libero', icon: '🎮', cogLoad: 2, physLoad: 1 },
    SCREEN: { label: 'Schermo', icon: '📱', cogLoad: 3, physLoad: 0 },
    ALCOHOL: { label: 'Alcol', icon: '🍷', cogLoad: 0, physLoad: 0 },
    SMOKING: { label: 'Fumo', icon: '🚬', cogLoad: 0, physLoad: 0 },
  },

  // Meal quality scale
  MEAL_QUALITY: [
    { value: 1, label: 'Junk food', icon: '🍔' },
    { value: 2, label: 'Fast food', icon: '🌮' },
    { value: 3, label: 'Nella media', icon: '🍝' },
    { value: 4, label: 'Bilanciato', icon: '🥗' },
    { value: 5, label: 'Ottimale', icon: '🥑' },
  ],

  // Mood scale (1-10)
  MOOD_SCALE: [
    { value: 1, label: 'Pessimo', emoji: '😫' },
    { value: 2, label: 'Molto male', emoji: '😢' },
    { value: 3, label: 'Male', emoji: '😞' },
    { value: 4, label: 'Sotto la media', emoji: '😕' },
    { value: 5, label: 'Nella media', emoji: '😐' },
    { value: 6, label: 'Discreto', emoji: '🙂' },
    { value: 7, label: 'Bene', emoji: '😊' },
    { value: 8, label: 'Molto bene', emoji: '😄' },
    { value: 9, label: 'Ottimo', emoji: '🤩' },
    { value: 10, label: 'Eccezionale', emoji: '🔥' },
  ],

  // Focus scale (1-10)
  FOCUS_SCALE: [
    { value: 1, label: 'Zero', emoji: '🌫️' }, { value: 2, label: 'Molto distratto', emoji: '😵‍💫' },
    { value: 3, label: 'Distratto', emoji: '💭' }, { value: 4, label: 'Sotto media', emoji: '😶' },
    { value: 5, label: 'Nella media', emoji: '🎯' }, { value: 6, label: 'Discreto', emoji: '📌' },
    { value: 7, label: 'Buono', emoji: '🔬' }, { value: 8, label: 'Alto', emoji: '⚡' },
    { value: 9, label: 'Molto alto', emoji: '🚀' }, { value: 10, label: 'Flow state', emoji: '🔥' },
  ],

  // Stress scale (1-10)
  STRESS_SCALE: [
    { value: 1, label: 'Zen', emoji: '🧘' }, { value: 2, label: 'Molto calmo', emoji: '😌' },
    { value: 3, label: 'Calmo', emoji: '🙂' }, { value: 4, label: 'Tranquillo', emoji: '😊' },
    { value: 5, label: 'Nella media', emoji: '😐' }, { value: 6, label: 'Un po\' teso', emoji: '😕' },
    { value: 7, label: 'Stressato', emoji: '😰' }, { value: 8, label: 'Molto stressato', emoji: '😫' },
    { value: 9, label: 'Sovraccarico', emoji: '🤯' }, { value: 10, label: 'Burnout', emoji: '💀' },
  ],

  // 15 Bottleneck types
  BOTTLENECKS: {
    SLEEP_QUALITY: { label: 'Qualità del sonno scarsa', icon: '😴', category: 'sleep' },
    SLEEP_DEBT: { label: 'Debito di sonno accumulato', icon: '💤', category: 'sleep' },
    CIRCADIAN_MISALIGN: { label: 'Disallineamento circadiano', icon: '🌅', category: 'circadian' },
    DEHYDRATION: { label: 'Disidratazione', icon: '💧', category: 'lifestyle' },
    POOR_NUTRITION: { label: 'Nutrizione inadeguata', icon: '🍔', category: 'lifestyle' },
    LATE_CAFFEINE: { label: 'Caffeina tardiva', icon: '☕', category: 'lifestyle' },
    EXCESSIVE_CAFFEINE: { label: 'Caffeina eccessiva', icon: '☕☕', category: 'lifestyle' },
    WORK_OVERLOAD: { label: 'Sovraccarico lavorativo', icon: '💼', category: 'allostatic' },
    HIGH_STRESS: { label: 'Stress elevato', icon: '😰', category: 'allostatic' },
    BURNOUT_RISK: { label: 'Rischio burnout', icon: '🔥', category: 'allostatic' },
    SEDENTARY: { label: 'Sedentarietà', icon: '🪑', category: 'lifestyle' },
    SCREEN_FATIGUE: { label: 'Affaticamento da schermo', icon: '📱', category: 'lifestyle' },
    LOW_HRV: { label: 'HRV basso (recupero scarso)', icon: '❤️', category: 'allostatic' },
    HIGH_HR: { label: 'Frequenza cardiaca elevata', icon: '💓', category: 'allostatic' },
    EMOTIONAL_FATIGUE: { label: 'Affaticamento emotivo', icon: '😞', category: 'allostatic' },
  },

  // Notification channels
  NOTIFICATIONS: {
    SUGGESTION: { sound: 'gentle', priority: 'low' },
    ALERT: { sound: 'alert', priority: 'high' },
    HABIT: { sound: 'gentle', priority: 'medium' },
    WINDDOWN: { intervals: [120, 60, 30] },
  },

  // ML Pipeline settings
  ML: {
    MIN_DAYS_PREDICTIONS: 3,
    MIN_DAYS_PATTERNS: 7,
    CORRELATION_THRESHOLD: 0.2,
    ZSCORE_SIGNIFICANT: 0.8,
    CRASH_RATE_THRESHOLD: 0.5,
    TREND_SIGNIFICANT_PCT: 3, // 3% change = significant
    HABIT_LEARNING_WINDOW: 14, // days
    REGULARITY_THRESHOLD_MINUTES: 60, // ±60min = regular
  },

  // Weekly report grading
  GRADES: {
    A: { min: 80, label: 'Eccellente', color: '#26c281' },
    B: { min: 65, label: 'Buono', color: '#4a90d9' },
    C: { min: 50, label: 'Sufficiente', color: '#f4b740' },
    D: { min: 35, label: 'Insufficiente', color: '#f0883e' },
    F: { min: 0, label: 'Critico', color: '#e74c6f' },
  },
};

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
  Object.entries(updates).forEach(([k, v]) => {
    if (k === 'supabaseUrl') CONFIG.SUPABASE_URL = v;
    if (k === 'supabaseAnonKey') CONFIG.SUPABASE_ANON_KEY = v;
    if (k === 'groqApiKey') CONFIG.GROQ_API_KEY = v;
    if (k === 'sahhaApiKey') CONFIG.SAHHA_API_KEY = v;
  });
}
