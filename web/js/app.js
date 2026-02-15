// Terminus PWA - Main Application Entry
// Hash-based router, app initialization, profile management

import { loadConfig } from './config.js';
import { getProfile } from './components/profile.js';
import { initSupabase } from './services/supabase.js';
import { requestPermission, setupWinddown, setupHydrationReminder } from './services/notifications.js';

// Current app state
let currentView = 'dashboard';
let profile = null;

// Routes map
const routes = {
  dashboard: () => import('./components/dashboard.js'),
  timeline: () => import('./components/timeline.js'),
  profile: () => import('./components/profile.js'),
  coaching: () => import('./components/coaching.js'),
  reports: () => import('./components/reports.js'),
  settings: () => import('./components/settings.js'),
};

// Initialize the app
async function init() {
  // Load saved config
  loadConfig();

  // Load profile
  profile = getProfile();

  // Dark mode
  if (localStorage.getItem('terminus_dark') === '1') {
    document.body.classList.add('dark');
  }

  // Try to init Supabase if configured
  const config = JSON.parse(localStorage.getItem('terminus_config') || '{}');
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      await initSupabase(config.supabaseUrl, config.supabaseAnonKey);
    } catch (e) {
      console.warn('Supabase init failed:', e);
    }
  }

  // Setup notifications if enabled
  if (Notification.permission === 'granted') {
    if (config.autoWinddown && profile?.bedtime) {
      setupWinddown(profile.bedtime);
    }
    if (config.hydrationReminder) {
      setupHydrationReminder(60);
    }
  }

  // Listen for profile updates
  window.addEventListener('profile-updated', (e) => {
    profile = e.detail;
    navigate(currentView);
  });

  // Setup router
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Tab bar active state
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const view = tab.dataset.view;
      window.location.hash = `#${view}`;
    });
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('SW registration failed:', e);
    }
  }
}

// Router
function handleRoute() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  const view = routes[hash] ? hash : 'dashboard';

  // If no profile, redirect to profile setup (except settings)
  if (!profile && view !== 'settings' && view !== 'profile') {
    window.location.hash = '#profile';
    return;
  }

  navigate(view);
}

async function navigate(view) {
  currentView = view;

  // Update tab bar active state
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });

  // Update header title
  const titles = {
    dashboard: 'Dashboard',
    timeline: 'Timeline',
    profile: 'Profilo',
    coaching: 'Coaching',
    reports: 'Report',
    settings: 'Impostazioni',
  };
  const headerTitle = document.querySelector('.header h1');
  if (headerTitle) headerTitle.textContent = titles[view] || 'Terminus';

  // Load and render view
  const container = document.getElementById('app-content');
  if (!container) return;

  container.innerHTML = '<div class="loading-view"><div class="loading-dots">Caricamento...</div></div>';

  try {
    const module = await routes[view]();
    module.render(container, profile);
  } catch (err) {
    container.innerHTML = `<div class="error-view"><p>Errore nel caricamento: ${err.message}</p></div>`;
    console.error('View render error:', err);
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

export { navigate, profile };
