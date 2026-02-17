// Terminus PWA - Profile Component
// Comprehensive user profile with physical data, habits, lifestyle, chronotype

import { Storage } from '../utils/storage.js';
import { CONFIG } from '../config.js';

const PROFILE_KEY = 'user_profile';

export function getProfile() {
  return Storage.get(PROFILE_KEY, null);
}

export function saveProfile(profile) {
  Storage.set(PROFILE_KEY, { ...profile, updatedAt: new Date().toISOString() });
}

export function render(container, profile) {
  const p = profile || getProfile();
  const isSetup = !!p;

  if (!isSetup) {
    renderSetup(container);
  } else {
    renderProfile(container, p);
  }
}

function renderSetup(container) {
  container.innerHTML = `
    <div class="profile-setup">
      <div class="setup-header">
        <div class="setup-icon">👤</div>
        <h2>Configurazione Profilo</h2>
        <p>Inserisci i tuoi dati per personalizzare l'esperienza Terminus</p>
      </div>

      <form id="profile-form" class="setup-form">
        <!-- Section 1: Physical Data -->
        <div class="setup-section">
          <h3>🏋️ Dati Fisici</h3>
          <div class="form-group">
            <label>Nome</label>
            <input type="text" name="name" placeholder="Il tuo nome" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Età</label>
              <input type="number" name="age" min="10" max="100" placeholder="25">
            </div>
            <div class="form-group">
              <label>Sesso</label>
              <select name="sex">
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="O">Altro</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Peso (kg)</label>
              <input type="number" name="weight" min="30" max="200" step="0.5" placeholder="70">
            </div>
            <div class="form-group">
              <label>Altezza (cm)</label>
              <input type="number" name="height" min="100" max="250" placeholder="175">
            </div>
          </div>
        </div>

        <!-- Section 2: Chronotype -->
        <div class="setup-section">
          <h3>🦁 Cronotipo</h3>
          <p class="section-desc">Quando ti senti più energico naturalmente?</p>
          <div class="chronotype-picker">
            ${Object.entries(CONFIG.CHRONOTYPES).map(([key, ct]) => `
              <label class="chronotype-option">
                <input type="radio" name="chronotype" value="${key}">
                <div class="chronotype-card">
                  <span class="chronotype-icon">${getChronotypeIcon(key)}</span>
                  <span class="chronotype-name">${ct.name}</span>
                  <span class="chronotype-desc">${getChronotypeDesc(key)}</span>
                  <span class="chronotype-times">Sveglia: ${ct.wakeTime} • Sonno: ${ct.sleepTime}</span>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Section 3: Sleep Habits -->
        <div class="setup-section">
          <h3>😴 Abitudini di Sonno</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Ora di andare a letto</label>
              <input type="time" name="bedtime" value="23:00">
            </div>
            <div class="form-group">
              <label>Ora sveglia</label>
              <input type="time" name="wakeTime" value="07:00">
            </div>
          </div>
          <div class="form-group">
            <label>Ore di sonno ideali</label>
            <input type="range" name="idealSleep" min="5" max="10" step="0.5" value="8">
            <span class="range-value">8h</span>
          </div>
        </div>

        <!-- Section 4: Lifestyle -->
        <div class="setup-section">
          <h3>🏃 Stile di Vita</h3>
          <div class="form-group">
            <label>Livello di attività</label>
            <select name="activityLevel">
              <option value="sedentary">Sedentario</option>
              <option value="light">Leggero</option>
              <option value="moderate" selected>Moderato</option>
              <option value="active">Attivo</option>
              <option value="intense">Intenso</option>
            </select>
          </div>
          <div class="form-group">
            <label>Caffè al giorno (media)</label>
            <input type="number" name="avgCoffees" min="0" max="10" value="2">
          </div>
          <div class="form-group">
            <label>Lavoro</label>
            <select name="workType">
              <option value="office">Ufficio/Scrivania</option>
              <option value="remote">Smart Working</option>
              <option value="physical">Lavoro Fisico</option>
              <option value="creative">Creativo</option>
              <option value="student">Studente</option>
              <option value="none">Non lavoro</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Inizio lavoro</label>
              <input type="time" name="workStart" value="09:00">
            </div>
            <div class="form-group">
              <label>Fine lavoro</label>
              <input type="time" name="workEnd" value="18:00">
            </div>
          </div>
        </div>

        <!-- Section 5: Habits & Vices -->
        <div class="setup-section">
          <h3>🔄 Abitudini e Vizi</h3>
          <div class="form-group">
            <label>Fumo</label>
            <select name="smoking">
              <option value="no">Non fumo</option>
              <option value="occasional">Occasionalmente</option>
              <option value="moderate">Moderato (5-10/giorno)</option>
              <option value="heavy">Pesante (>10/giorno)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Alcol</label>
            <select name="alcohol">
              <option value="no">Non bevo</option>
              <option value="occasional">Occasionalmente</option>
              <option value="moderate">Moderato (2-3/settimana)</option>
              <option value="frequent">Frequente</option>
            </select>
          </div>
          <div class="form-group">
            <label>Esercizio fisico</label>
            <select name="exercise">
              <option value="none">Mai</option>
              <option value="rare">Raramente</option>
              <option value="1-2">1-2 volte/settimana</option>
              <option value="3-4">3-4 volte/settimana</option>
              <option value="daily">Ogni giorno</option>
            </select>
          </div>
          <div class="form-group">
            <label>Screen time medio (ore/giorno)</label>
            <input type="number" name="screenTime" min="0" max="24" step="0.5" value="6">
          </div>
        </div>

        <!-- Section 6: Health -->
        <div class="setup-section">
          <h3>💊 Salute</h3>
          <div class="form-group">
            <label>Condizioni (seleziona se applicabile)</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="conditions" value="stress"> Stress cronico</label>
              <label><input type="checkbox" name="conditions" value="insomnia"> Insonnia</label>
              <label><input type="checkbox" name="conditions" value="anxiety"> Ansia</label>
              <label><input type="checkbox" name="conditions" value="migraine"> Emicranie</label>
              <label><input type="checkbox" name="conditions" value="fatigue"> Stanchezza cronica</label>
            </div>
          </div>
          <div class="form-group">
            <label>Farmaci/Integratori (opzionale)</label>
            <input type="text" name="medications" placeholder="Es. melatonina, vitamina D...">
          </div>
        </div>

        <!-- Section 7: Goals -->
        <div class="setup-section">
          <h3>🎯 Obiettivi</h3>
          <div class="form-group">
            <label>Cosa vuoi migliorare? (seleziona)</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="goals" value="energy"> Energia</label>
              <label><input type="checkbox" name="goals" value="sleep"> Qualità del sonno</label>
              <label><input type="checkbox" name="goals" value="focus"> Concentrazione</label>
              <label><input type="checkbox" name="goals" value="productivity"> Produttività</label>
              <label><input type="checkbox" name="goals" value="stress"> Gestione stress</label>
              <label><input type="checkbox" name="goals" value="fitness"> Forma fisica</label>
            </div>
          </div>
        </div>

        <button type="submit" class="btn-primary btn-large">Salva Profilo</button>
      </form>
    </div>
  `;

  // Range value display
  container.querySelector('[name="idealSleep"]').addEventListener('input', (e) => {
    e.target.nextElementSibling.textContent = `${e.target.value}h`;
  });

  // Form submission
  container.querySelector('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const conditions = [];
    container.querySelectorAll('[name="conditions"]:checked').forEach(cb => conditions.push(cb.value));

    const goals = [];
    container.querySelectorAll('[name="goals"]:checked').forEach(cb => goals.push(cb.value));

    const profile = {
      name: fd.get('name'),
      age: parseInt(fd.get('age')) || null,
      sex: fd.get('sex'),
      weight: parseFloat(fd.get('weight')) || 70,
      height: parseInt(fd.get('height')) || null,
      chronotype: fd.get('chronotype') || 'ORSO',
      bedtime: fd.get('bedtime'),
      wakeTime: fd.get('wakeTime'),
      idealSleep: parseFloat(fd.get('idealSleep')),
      activityLevel: fd.get('activityLevel'),
      avgCoffees: parseInt(fd.get('avgCoffees')),
      workType: fd.get('workType'),
      workStart: fd.get('workStart'),
      workEnd: fd.get('workEnd'),
      smoking: fd.get('smoking'),
      alcohol: fd.get('alcohol'),
      exercise: fd.get('exercise'),
      screenTime: parseFloat(fd.get('screenTime')),
      conditions,
      medications: fd.get('medications'),
      goals,
      createdAt: new Date().toISOString(),
    };

    saveProfile(profile);
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: profile }));
    window.location.hash = '#dashboard';
  });
}

function renderProfile(container, profile) {
  container.innerHTML = `
    <div class="profile-view">
      <div class="profile-header-card">
        <div class="profile-avatar">${profile.name?.[0]?.toUpperCase() || '?'}</div>
        <h2>${profile.name || 'Utente'}</h2>
        <p>${profile.age || '?'} anni • ${profile.weight || '?'}kg • ${profile.height || '?'}cm</p>
        <div class="profile-badges">
          <span class="badge">${getChronotypeIcon(profile.chronotype)} ${CONFIG.CHRONOTYPES[profile.chronotype]?.name || 'Orso'}</span>
          <span class="badge">${profile.activityLevel || 'moderato'}</span>
          <span class="badge">${profile.workType || 'ufficio'}</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">😴 Sonno</h3>
        <div class="profile-detail-grid">
          <div class="detail-item"><span class="detail-label">Bedtime</span><span class="detail-value">${profile.bedtime || '23:00'}</span></div>
          <div class="detail-item"><span class="detail-label">Sveglia</span><span class="detail-value">${profile.wakeTime || '07:00'}</span></div>
          <div class="detail-item"><span class="detail-label">Obiettivo</span><span class="detail-value">${profile.idealSleep || 8}h</span></div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">🔄 Abitudini</h3>
        <div class="profile-detail-grid">
          <div class="detail-item"><span class="detail-label">Caffè/giorno</span><span class="detail-value">${profile.avgCoffees || 0}</span></div>
          <div class="detail-item"><span class="detail-label">Fumo</span><span class="detail-value">${translateHabit(profile.smoking)}</span></div>
          <div class="detail-item"><span class="detail-label">Alcol</span><span class="detail-value">${translateHabit(profile.alcohol)}</span></div>
          <div class="detail-item"><span class="detail-label">Esercizio</span><span class="detail-value">${profile.exercise || 'N/D'}</span></div>
          <div class="detail-item"><span class="detail-label">Screen time</span><span class="detail-value">${profile.screenTime || '?'}h/giorno</span></div>
        </div>
      </div>

      ${profile.conditions?.length > 0 ? `
        <div class="card">
          <h3 class="card-title">💊 Salute</h3>
          <div class="tags">
            ${profile.conditions.map(c => `<span class="tag">${translateCondition(c)}</span>`).join('')}
          </div>
          ${profile.medications ? `<p class="text-muted">Farmaci: ${profile.medications}</p>` : ''}
        </div>
      ` : ''}

      <div class="card">
        <h3 class="card-title">🎯 Obiettivi</h3>
        <div class="tags">
          ${(profile.goals || []).map(g => `<span class="tag tag-accent">${translateGoal(g)}</span>`).join('')}
        </div>
      </div>

      <button class="btn-secondary" id="btn-edit-profile">Modifica Profilo</button>
    </div>
  `;

  container.querySelector('#btn-edit-profile').addEventListener('click', () => {
    renderSetup(container);
    // Pre-fill form with existing data
    setTimeout(() => prefillForm(container, profile), 50);
  });
}

function prefillForm(container, profile) {
  const form = container.querySelector('#profile-form');
  if (!form) return;

  Object.entries(profile).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input && (typeof value === 'string' || typeof value === 'number')) {
      if (input.type === 'radio') {
        const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        input.value = value;
      }
    }
  });

  // Checkboxes
  (profile.conditions || []).forEach(c => {
    const cb = form.querySelector(`[name="conditions"][value="${c}"]`);
    if (cb) cb.checked = true;
  });
  (profile.goals || []).forEach(g => {
    const cb = form.querySelector(`[name="goals"][value="${g}"]`);
    if (cb) cb.checked = true;
  });
}

function getChronotypeIcon(type) {
  const icons = { LUPO: '🐺', LEONE: '🦁', ORSO: '🐻', DELFINO: '🐬' };
  return icons[type] || '🐻';
}

function getChronotypeDesc(type) {
  const descs = {
    LUPO: 'Notturno, picco creativo di notte',
    LEONE: 'Mattiniero, picco alle prime ore',
    ORSO: 'Segue il ritmo solare, stabile',
    DELFINO: 'Sonno leggero, picco pomeridiano',
  };
  return descs[type] || '';
}

function translateHabit(value) {
  const map = { no: 'No', occasional: 'Occasionale', moderate: 'Moderato', heavy: 'Pesante', frequent: 'Frequente' };
  return map[value] || value || 'N/D';
}

function translateCondition(c) {
  const map = { stress: 'Stress', insomnia: 'Insonnia', anxiety: 'Ansia', migraine: 'Emicranie', fatigue: 'Stanchezza' };
  return map[c] || c;
}

function translateGoal(g) {
  const map = { energy: 'Energia', sleep: 'Sonno', focus: 'Focus', productivity: 'Produttività', stress: 'Stress', fitness: 'Fitness' };
  return map[g] || g;
}

export default { render, getProfile, saveProfile };
