// Terminus PWA - Notification Service
// Manages push notifications, wind-down protocol, and alert channels

import { CONFIG } from '../config.js';
import { Storage } from '../utils/storage.js';
import { parseTimeToday, hoursBetween } from '../utils/datetime.js';

const NOTIF_LOG_KEY = 'notification_logs';
let winddownTimers = [];

// Request notification permission
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

// Send a notification
export function send(title, body, options = {}) {
  const channel = options.channel || 'SUGGESTION';
  const channelConfig = CONFIG.NOTIFICATIONS[channel] || CONFIG.NOTIFICATIONS.SUGGESTION;

  // Log the notification
  Storage.append(NOTIF_LOG_KEY, {
    title, body, channel,
    timestamp: new Date().toISOString(),
  });

  if (Notification.permission !== 'granted') return null;

  const notif = new Notification(title, {
    body,
    icon: options.icon || '⚡',
    badge: '/web/assets/icon-badge.svg',
    tag: options.tag || `terminus-${channel}-${Date.now()}`,
    silent: channelConfig.sound === 'gentle',
    vibrate: channel === 'ALERT' ? [200, 100, 200] : [100],
    ...options,
  });

  return notif;
}

// Suggestion notification (low frequency, gentle)
export function sendSuggestion(text) {
  return send('Terminus', text, { channel: 'SUGGESTION', tag: 'terminus-suggestion' });
}

// Alert notification (high priority)
export function sendAlert(text) {
  return send('⚠️ Terminus Alert', text, { channel: 'ALERT', tag: 'terminus-alert' });
}

// Dynamic energy-based suggestions
export function checkAndNotify(energyScore, profile) {
  const now = new Date();
  const lastNotif = Storage.get('last_notification_time');
  const minInterval = 30 * 60000; // Min 30min between notifications

  if (lastNotif && (now.getTime() - new Date(lastNotif).getTime()) < minInterval) {
    return; // Too soon
  }

  // Energy-based suggestions
  if (energyScore >= 70) {
    sendSuggestion('Energia alta! Ideale per lavoro profondo o studio intenso.');
  } else if (energyScore >= 50) {
    sendSuggestion('Energia moderata. Buon momento per task standard.');
  } else if (energyScore >= 30) {
    sendSuggestion('Energia bassa. Fai una pausa o una passeggiata.');
  } else {
    sendAlert('Energia critica! Riposa, idratati e evita stimoli.');
  }

  Storage.set('last_notification_time', now.toISOString());
}

// Wind-down Protocol
// Sends graduated notifications before bedtime
export function setupWinddown(bedtimeStr) {
  // Clear existing timers
  clearWinddown();

  const bedtime = parseTimeToday(bedtimeStr);
  if (bedtime < new Date()) {
    bedtime.setDate(bedtime.getDate() + 1);
  }

  const intervals = CONFIG.NOTIFICATIONS.WINDDOWN.intervals; // [120, 60, 30] minutes

  intervals.forEach(minutesBefore => {
    const notifTime = new Date(bedtime.getTime() - minutesBefore * 60000);
    const delay = notifTime.getTime() - Date.now();

    if (delay > 0) {
      const timer = setTimeout(() => {
        const messages = {
          120: '🌙 Wind-down: -2h dal sonno. Riduci luce blu e stimoli.',
          60: '🌙 Wind-down: -1h dal sonno. Inizia la routine serale.',
          30: '🌙 Wind-down: -30min. Spegni schermi, prepara la camera.',
        };
        send('Wind-down Protocol', messages[minutesBefore] || `${minutesBefore}min al sonno`, {
          channel: minutesBefore <= 30 ? 'ALERT' : 'SUGGESTION',
          tag: `winddown-${minutesBefore}`,
        });
      }, delay);

      winddownTimers.push(timer);
    }
  });
}

export function clearWinddown() {
  winddownTimers.forEach(t => clearTimeout(t));
  winddownTimers = [];
}

// Hydration reminders
export function setupHydrationReminder(intervalMinutes = 60) {
  const timerId = setInterval(() => {
    sendSuggestion('💧 Ricordati di bere! Mantieni l\'idratazione costante.');
  }, intervalMinutes * 60000);

  return timerId;
}

// Get notification history
export function getHistory(limit = 20) {
  const logs = Storage.get(NOTIF_LOG_KEY, []);
  return logs.slice(-limit).reverse();
}

export default {
  requestPermission, send, sendSuggestion, sendAlert,
  checkAndNotify, setupWinddown, clearWinddown,
  setupHydrationReminder, getHistory,
};
