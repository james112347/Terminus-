// Terminus PWA - Sahha Biometric Data Integration
// Connects to Sahha REST API for health data collection and analysis
// Note: For PWA, we use the REST API path (not the mobile SDK)

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';

const SAHHA_CACHE_KEY = 'sahha_data';
const SAHHA_TOKEN_KEY = 'sahha_token';

// Authenticate with Sahha
export async function authenticate(appId, appSecret, externalId) {
  const response = await fetch(`${CONFIG.SAHHA_API_URL}/oauth/profile/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, appSecret, externalId }),
  });

  if (!response.ok) throw new Error(`Sahha auth failed: ${response.status}`);

  const data = await response.json();
  Storage.set(SAHHA_TOKEN_KEY, {
    profileToken: data.profileToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + (data.expiresIn || 86400) * 1000,
  });

  return data;
}

// Get cached token or refresh
async function getToken() {
  const cached = Storage.get(SAHHA_TOKEN_KEY);
  if (!cached) return null;

  // Check if expired (with 5min buffer)
  if (cached.expiresAt && cached.expiresAt < Date.now() + 300000) {
    try {
      const response = await fetch(`${CONFIG.SAHHA_API_URL}/oauth/profile/refreshToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cached.refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        const newToken = {
          profileToken: data.profileToken,
          refreshToken: data.refreshToken,
          expiresAt: Date.now() + (data.expiresIn || 86400) * 1000,
        };
        Storage.set(SAHHA_TOKEN_KEY, newToken);
        return newToken.profileToken;
      }
    } catch {
      // Fall through to use cached token
    }
  }

  return cached.profileToken;
}

// Fetch biomarkers from Sahha
export async function getBiomarkers(categories = ['activity', 'sleep', 'body', 'vitals']) {
  const token = await getToken();
  if (!token) return null;

  const results = {};

  for (const category of categories) {
    try {
      const response = await fetch(
        `${CONFIG.SAHHA_API_URL}/api/v1/profile/biomarker/${category}`,
        {
          headers: {
            'Authorization': `Profile ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        results[category] = await response.json();
      }
    } catch (err) {
      console.warn(`Sahha ${category} fetch failed:`, err);
    }
  }

  // Cache results
  Storage.set(SAHHA_CACHE_KEY, { data: results, updatedAt: new Date().toISOString() });

  return results;
}

// Get health scores from Sahha
export async function getHealthScores() {
  const token = await getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${CONFIG.SAHHA_API_URL}/api/v1/profile/score`, {
      headers: {
        'Authorization': `Profile ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Post health data to Sahha (manual entry from our app)
export async function postHealthData(dataType, entries) {
  const token = await getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${CONFIG.SAHHA_API_URL}/api/v1/profile/health/log`, {
      method: 'POST',
      headers: {
        'Authorization': `Profile ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType,
        entries: entries.map(e => ({
          value: e.value,
          unit: e.unit,
          source: 'terminus_pwa',
          startDateTime: e.startTime || new Date().toISOString(),
          endDateTime: e.endTime || new Date().toISOString(),
        })),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Extract key metrics from Sahha data for our energy calculation
export function extractMetrics(sahhaData) {
  if (!sahhaData) {
    // Try cached data
    const cached = Storage.get(SAHHA_CACHE_KEY);
    if (!cached) return null;
    sahhaData = cached.data;
  }

  const metrics = {
    steps: null,
    heartRateResting: null,
    heartRateVariability: null,
    sleepDuration: null,
    sleepEfficiency: null,
    sleepPhases: null,
    activeCalories: null,
    weight: null,
  };

  // Extract activity metrics
  if (sahhaData.activity) {
    const activity = sahhaData.activity;
    metrics.steps = findBiomarker(activity, 'steps');
    metrics.activeCalories = findBiomarker(activity, 'active_energy_burned');
  }

  // Extract sleep metrics
  if (sahhaData.sleep) {
    const sleep = sahhaData.sleep;
    metrics.sleepDuration = findBiomarker(sleep, 'sleep_duration');
    metrics.sleepEfficiency = findBiomarker(sleep, 'sleep_efficiency');
    metrics.sleepPhases = {
      rem: findBiomarker(sleep, 'sleep_rem_duration'),
      deep: findBiomarker(sleep, 'sleep_deep_duration'),
      light: findBiomarker(sleep, 'sleep_light_duration'),
      awake: findBiomarker(sleep, 'sleep_awake_duration'),
    };
  }

  // Extract vitals
  if (sahhaData.vitals) {
    const vitals = sahhaData.vitals;
    metrics.heartRateResting = findBiomarker(vitals, 'heart_rate_resting');
    metrics.heartRateVariability = findBiomarker(vitals, 'heart_rate_variability_sdnn');
  }

  // Extract body
  if (sahhaData.body) {
    metrics.weight = findBiomarker(sahhaData.body, 'weight');
  }

  return metrics;
}

function findBiomarker(data, name) {
  if (Array.isArray(data)) {
    const found = data.find(d => d.type === name || d.name === name);
    return found?.value || null;
  }
  return data[name] || null;
}

// Check if Sahha is configured
export function isConfigured() {
  const token = Storage.get(SAHHA_TOKEN_KEY);
  return !!token;
}

// Get cached data (for offline use)
export function getCachedData() {
  return Storage.get(SAHHA_CACHE_KEY);
}

export default {
  authenticate, getBiomarkers, getHealthScores, postHealthData,
  extractMetrics, isConfigured, getCachedData,
};
