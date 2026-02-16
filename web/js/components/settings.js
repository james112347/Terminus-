// Terminus PWA - Settings Component
// API keys, Supabase config, Sahha integration, preferences

import { CONFIG, saveConfig, loadConfig } from '../config.js';
import { Storage } from '../utils/storage.js';
import { initSupabase, auth } from '../services/supabase.js';
import { healthCheck } from '../services/groq.js';
import { requestPermission } from '../services/notifications.js';
import { isConfigured as isSahhaConfigured } from '../services/sahha.js';
import { showToast } from '../utils/ui.js';

export function render(container) {
  loadConfig();

  const savedConfig = JSON.parse(localStorage.getItem('terminus_config') || '{}');
  const isDark = document.body.classList.contains('dark');

  container.innerHTML = `
    <div class="settings-page">
      <!-- Theme -->
      <div class="card">
        <h3 class="card-title">🎨 Aspetto</h3>
        <div class="setting-row">
          <span>Modalità scura</span>
          <label class="switch">
            <input type="checkbox" id="dark-toggle" ${isDark ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Groq AI -->
      <div class="card">
        <h3 class="card-title">🤖 Groq AI</h3>
        <div class="form-group">
          <label>API Key</label>
          <input type="password" id="groq-key" value="${savedConfig.groqApiKey || ''}" placeholder="gsk_...">
          <small class="form-help">Ottieni la chiave su <a href="https://console.groq.com" target="_blank">console.groq.com</a></small>
        </div>
        <div class="setting-row">
          <span>Modello</span>
          <select id="groq-model">
            <option value="llama-3.3-70b-versatile" ${CONFIG.GROQ_MODEL === 'llama-3.3-70b-versatile' ? 'selected' : ''}>Llama 3.3 70B (Versatile)</option>
            <option value="llama-3.1-8b-instant" ${CONFIG.GROQ_MODEL === 'llama-3.1-8b-instant' ? 'selected' : ''}>Llama 3.1 8B (Veloce)</option>
          </select>
        </div>
        <div class="btn-group">
          <button class="btn-primary" id="btn-save-groq">Salva</button>
          <button class="btn-secondary" id="btn-test-groq">Testa Connessione</button>
        </div>
        <div id="groq-status" class="status-msg"></div>
      </div>

      <!-- Supabase -->
      <div class="card">
        <h3 class="card-title">🗄️ Supabase Database</h3>
        <div class="form-group">
          <label>URL Progetto</label>
          <input type="url" id="supabase-url" value="${savedConfig.supabaseUrl || ''}" placeholder="https://xxx.supabase.co">
        </div>
        <div class="form-group">
          <label>Anon Key</label>
          <input type="password" id="supabase-key" value="${savedConfig.supabaseAnonKey || ''}" placeholder="eyJ...">
        </div>
        <div class="btn-group">
          <button class="btn-primary" id="btn-save-supabase">Salva</button>
          <button class="btn-secondary" id="btn-test-supabase">Testa Connessione</button>
        </div>
        <div id="supabase-status" class="status-msg"></div>

        <!-- Auth Section (shown when Supabase is configured) -->
        ${savedConfig.supabaseUrl ? `
          <div class="auth-section">
            <h4>Autenticazione</h4>
            <div id="auth-status">Verifica in corso...</div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="auth-email" placeholder="email@example.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="auth-password" placeholder="Password">
            </div>
            <div class="btn-group">
              <button class="btn-primary" id="btn-signin">Accedi</button>
              <button class="btn-secondary" id="btn-signup">Registrati</button>
              <button class="btn-secondary" id="btn-signout" style="display:none">Esci</button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Sahha -->
      <div class="card">
        <h3 class="card-title">📱 Sahha Biometrics</h3>
        <p class="text-muted">Collegati a Sahha per raccogliere dati biometrici automaticamente da wearable e smartphone.</p>
        <div class="form-group">
          <label>App ID</label>
          <input type="text" id="sahha-appid" value="${savedConfig.sahhaAppId || ''}" placeholder="App ID Sahha">
        </div>
        <div class="form-group">
          <label>App Secret</label>
          <input type="password" id="sahha-secret" value="${savedConfig.sahhaAppSecret || ''}" placeholder="App Secret">
        </div>
        <div class="btn-group">
          <button class="btn-primary" id="btn-save-sahha">Salva</button>
        </div>
        <div class="setting-status ${isSahhaConfigured() ? 'connected' : 'disconnected'}">
          ${isSahhaConfigured() ? '✅ Connesso' : '❌ Non configurato'}
        </div>
      </div>

      <!-- Notifications -->
      <div class="card">
        <h3 class="card-title">🔔 Notifiche</h3>
        <div class="setting-row">
          <span>Permesso notifiche</span>
          <button class="btn-secondary" id="btn-notif-perm">Abilita</button>
        </div>
        <div class="setting-row">
          <span>Wind-down automatico</span>
          <label class="switch">
            <input type="checkbox" id="winddown-auto" ${savedConfig.autoWinddown ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <span>Reminder idratazione (ogni ora)</span>
          <label class="switch">
            <input type="checkbox" id="hydration-reminder" ${savedConfig.hydrationReminder ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Data Management -->
      <div class="card">
        <h3 class="card-title">💾 Dati</h3>
        <div class="btn-group">
          <button class="btn-secondary" id="btn-export">Esporta Dati (JSON)</button>
          <button class="btn-secondary" id="btn-import">Importa Dati</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">
        <button class="btn-danger" id="btn-clear-data">Cancella Tutti i Dati</button>
      </div>

      <!-- Methodology Info -->
      <div class="card">
        <h3 class="card-title">📚 Metodologie</h3>
        <div class="method-info">
          <div class="method-item">
            <h4>GSD (Get Stuff Done)</h4>
            <p>Pipeline in 5 fasi: Capture → Clarify → Organize → Reflect → Engage. Ogni ciclo trasforma dati grezzi in azioni concrete.</p>
          </div>
          <div class="method-item">
            <h4>Ralph Loop</h4>
            <p>Ciclo di miglioramento continuo: Review → Analyze → Learn → Plan → Habituate. Ogni iterazione calibra i modelli predittivi.</p>
          </div>
          <div class="method-item">
            <h4>BMAD Framework</h4>
            <p>Build → Measure → Analyze → Decide. Architettura iterativa dove ogni decisione è guidata dai dati raccolti.</p>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="card">
        <h3 class="card-title">ℹ️ Info</h3>
        <div class="about-info">
          <p><strong>Terminus PWA</strong> v${CONFIG.APP_VERSION}</p>
          <p>Wellness Intelligence Platform</p>
          <p>Powered by Groq AI, Supabase, Sahha</p>
        </div>
      </div>
    </div>
  `;

  attachSettingsEvents(container);
}

function attachSettingsEvents(container) {
  // Dark mode toggle
  container.querySelector('#dark-toggle').addEventListener('change', (e) => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('terminus_dark', e.target.checked ? '1' : '0');
  });

  // Groq save
  container.querySelector('#btn-save-groq').addEventListener('click', () => {
    const key = container.querySelector('#groq-key').value.trim();
    const model = container.querySelector('#groq-model').value;
    saveConfig({ groqApiKey: key });
    CONFIG.GROQ_MODEL = model;
    showStatus(container.querySelector('#groq-status'), 'Salvato!', 'success');
  });

  // Groq test
  container.querySelector('#btn-test-groq').addEventListener('click', async () => {
    const statusEl = container.querySelector('#groq-status');
    showStatus(statusEl, 'Test in corso...', 'info');
    const result = await healthCheck();
    showStatus(statusEl, result.ok ? '✅ Connessione OK' : `❌ ${result.error}`, result.ok ? 'success' : 'error');
  });

  // Supabase save
  container.querySelector('#btn-save-supabase').addEventListener('click', () => {
    saveConfig({
      supabaseUrl: container.querySelector('#supabase-url').value.trim(),
      supabaseAnonKey: container.querySelector('#supabase-key').value.trim(),
    });
    showStatus(container.querySelector('#supabase-status'), 'Salvato!', 'success');
  });

  // Supabase test
  container.querySelector('#btn-test-supabase').addEventListener('click', async () => {
    const statusEl = container.querySelector('#supabase-status');
    showStatus(statusEl, 'Test in corso...', 'info');
    try {
      const url = container.querySelector('#supabase-url').value.trim();
      const key = container.querySelector('#supabase-key').value.trim();
      const client = await initSupabase(url, key);
      if (client) {
        showStatus(statusEl, '✅ Connessione OK', 'success');
      } else {
        showStatus(statusEl, '❌ URL o chiave mancanti', 'error');
      }
    } catch (err) {
      showStatus(statusEl, `❌ ${err.message}`, 'error');
    }
  });

  // Auth buttons
  const signinBtn = container.querySelector('#btn-signin');
  const signupBtn = container.querySelector('#btn-signup');
  const signoutBtn = container.querySelector('#btn-signout');

  if (signinBtn) {
    signinBtn.addEventListener('click', async () => {
      const email = container.querySelector('#auth-email').value;
      const password = container.querySelector('#auth-password').value;
      try {
        const result = await auth.signIn(email, password);
        if (result.error) throw result.error;
        container.querySelector('#auth-status').textContent = `✅ Connesso come ${email}`;
        signinBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        signoutBtn.style.display = '';
      } catch (err) {
        container.querySelector('#auth-status').textContent = `❌ ${err.message}`;
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = container.querySelector('#auth-email').value;
      const password = container.querySelector('#auth-password').value;
      try {
        const result = await auth.signUp(email, password);
        if (result.error) throw result.error;
        container.querySelector('#auth-status').textContent = '✅ Registrato! Controlla email per conferma.';
      } catch (err) {
        container.querySelector('#auth-status').textContent = `❌ ${err.message}`;
      }
    });
  }

  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await auth.signOut();
      container.querySelector('#auth-status').textContent = 'Disconnesso';
      signinBtn.style.display = '';
      signupBtn.style.display = '';
      signoutBtn.style.display = 'none';
    });
  }

  // Check auth state on load
  const authStatus = container.querySelector('#auth-status');
  if (authStatus) {
    auth.getUser().then(user => {
      if (user) {
        authStatus.textContent = `✅ Connesso come ${user.email}`;
        if (signinBtn) signinBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (signoutBtn) signoutBtn.style.display = '';
      } else {
        authStatus.textContent = 'Non autenticato';
      }
    });
  }

  // Sahha save
  container.querySelector('#btn-save-sahha').addEventListener('click', () => {
    saveConfig({
      sahhaAppId: container.querySelector('#sahha-appid').value.trim(),
      sahhaAppSecret: container.querySelector('#sahha-secret').value.trim(),
    });
    showStatus(container.querySelector('#sahha-appid').parentNode, 'Salvato!', 'success');
  });

  // Notifications
  container.querySelector('#btn-notif-perm').addEventListener('click', async () => {
    const result = await requestPermission();
    const btn = container.querySelector('#btn-notif-perm');
    btn.textContent = result === 'granted' ? '✅ Abilitato' : `❌ ${result}`;
  });

  container.querySelector('#winddown-auto').addEventListener('change', (e) => {
    saveConfig({ autoWinddown: e.target.checked });
  });

  container.querySelector('#hydration-reminder').addEventListener('change', (e) => {
    saveConfig({ hydrationReminder: e.target.checked });
  });

  // Export data
  container.querySelector('#btn-export').addEventListener('click', () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('terminus_')) {
        data[key] = JSON.parse(localStorage.getItem(key));
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminus-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import data
  container.querySelector('#btn-import').addEventListener('click', () => {
    container.querySelector('#import-file').click();
  });

  container.querySelector('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        showToast('Dati importati con successo!');
      } catch {
        showToast('Errore nel file di importazione');
      }
    };
    reader.readAsText(file);
  });

  // Clear data
  container.querySelector('#btn-clear-data').addEventListener('click', () => {
    if (confirm('Sei sicuro? Tutti i dati verranno cancellati permanentemente.')) {
      Storage.clear();
      showToast('Tutti i dati cancellati');
      render(container);
    }
  });
}

function showStatus(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = `status-msg ${type}`;
}

export default { render };
