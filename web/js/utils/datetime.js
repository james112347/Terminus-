// Terminus PWA - Date/Time Utilities

export function now() {
  return new Date();
}

export function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function formatDateFull(date) {
  return new Date(date).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export function formatRelative(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'adesso';
  if (mins < 60) return `${mins}min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ieri';
  if (days < 7) return `${days}g fa`;
  return formatDate(date);
}

// Parse time string "HH:MM" to today's Date
export function parseTimeToday(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = today();
  d.setHours(h, m, 0, 0);
  return d;
}

// Hours between two dates
export function hoursBetween(a, b) {
  return Math.abs(new Date(b) - new Date(a)) / 3600000;
}

// Minutes since midnight
export function minutesSinceMidnight(date = new Date()) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

// Get day of week (0=Mon, 6=Sun, Italian style)
export function dayOfWeek(date = new Date()) {
  const d = new Date(date).getDay();
  return d === 0 ? 6 : d - 1;
}

export function dayName(dayIndex) {
  const names = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  return names[dayIndex];
}

// Get start of week (Monday)
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Iterate days in range
export function eachDay(start, end) {
  const days = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}
