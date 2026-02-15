// Terminus PWA - Supabase Service
// Database, auth, and real-time sync via Supabase

import { CONFIG } from '../config.js';

let supabaseClient = null;
let supabaseLib = null;

// Lazy-load Supabase client library from CDN
async function loadSupabase() {
  if (supabaseLib) return supabaseLib;

  // Dynamic import from CDN
  const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabaseLib = module;
  return module;
}

// Initialize Supabase client
export async function initSupabase(url, anonKey) {
  if (!url || !anonKey) {
    const saved = JSON.parse(localStorage.getItem('terminus_config') || '{}');
    url = url || saved.supabaseUrl;
    anonKey = anonKey || saved.supabaseAnonKey;
  }

  if (!url || !anonKey) return null;

  const { createClient } = await loadSupabase();
  supabaseClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: localStorage,
    },
  });

  return supabaseClient;
}

// Get current client (or initialize)
export function getClient() {
  return supabaseClient;
}

// Auth methods
export const auth = {
  async signUp(email, password) {
    const client = getClient();
    if (!client) throw new Error('Supabase non configurato');
    return await client.auth.signUp({ email, password });
  },

  async signIn(email, password) {
    const client = getClient();
    if (!client) throw new Error('Supabase non configurato');
    return await client.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    const client = getClient();
    if (!client) return;
    return await client.auth.signOut();
  },

  async getUser() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user || null;
  },

  async getSession() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  },

  onAuthStateChange(callback) {
    const client = getClient();
    if (!client) return null;
    return client.auth.onAuthStateChange(callback);
  },
};

// Database operations
export const db = {
  // Profile
  async getProfile(userId) {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.from('profiles').select('*').eq('user_id', userId).single();
    return data;
  },

  async upsertProfile(userId, profile) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('profiles')
      .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Energy Scores
  async logEnergyScore(userId, scoreData) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('energy_scores').insert({
      user_id: userId,
      score: scoreData.score,
      components: scoreData.components,
      timestamp: scoreData.timestamp || new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getEnergyHistory(userId, days = 7) {
    const client = getClient();
    if (!client) return [];
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await client.from('energy_scores')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true });
    return data || [];
  },

  // Activities
  async logActivity(userId, activity) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('activities').insert({
      user_id: userId,
      ...activity,
      timestamp: activity.timestamp || new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getTodayActivities(userId) {
    const client = getClient();
    if (!client) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await client.from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', today.toISOString())
      .order('timestamp', { ascending: true });
    return data || [];
  },

  // Sleep logs
  async logSleep(userId, sleepData) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('sleep_logs').insert({
      user_id: userId,
      ...sleepData,
    }).select().single();
    if (error) throw error;
    return data;
  },

  // Caffeine logs
  async logCaffeine(userId, caffeineData) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('caffeine_logs').insert({
      user_id: userId,
      ...caffeineData,
    }).select().single();
    if (error) throw error;
    return data;
  },

  // Hydration logs
  async logHydration(userId, hydrationData) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('hydration_logs').insert({
      user_id: userId,
      ...hydrationData,
    }).select().single();
    if (error) throw error;
    return data;
  },

  // Biometric data (from Sahha)
  async logBiometric(userId, biometricData) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('biometric_data').insert({
      user_id: userId,
      ...biometricData,
      timestamp: biometricData.timestamp || new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  },

  // AI Insights
  async saveInsight(userId, insight) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('ai_insights').insert({
      user_id: userId,
      type: insight.type,
      content: insight.content,
      context: insight.context,
      timestamp: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  },

  // Weekly Reports
  async saveWeeklyReport(userId, report) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('weekly_reports').insert({
      user_id: userId,
      ...report,
      created_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getWeeklyReports(userId, limit = 4) {
    const client = getClient();
    if (!client) return [];
    const { data } = await client.from('weekly_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  },

  // Goals
  async getActiveGoals(userId) {
    const client = getClient();
    if (!client) return [];
    const { data } = await client.from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    return data || [];
  },

  async upsertGoal(userId, goal) {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('goals')
      .upsert({ user_id: userId, ...goal, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Real-time subscriptions
export const realtime = {
  subscribeToEnergyScores(userId, callback) {
    const client = getClient();
    if (!client) return null;
    return client.channel('energy-scores')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'energy_scores',
        filter: `user_id=eq.${userId}`,
      }, payload => callback(payload.new))
      .subscribe();
  },

  unsubscribe(channel) {
    const client = getClient();
    if (client && channel) {
      client.removeChannel(channel);
    }
  },
};

// Check if Supabase is configured and connected
export async function isConfigured() {
  const client = getClient();
  if (!client) return false;
  try {
    const session = await auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

export default { initSupabase, getClient, auth, db, realtime, isConfigured };
