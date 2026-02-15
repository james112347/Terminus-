// Terminus PWA - Local Storage Utilities
// Provides typed, namespaced access to localStorage with JSON serialization

const PREFIX = 'terminus_';

export const Storage = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  // Append to array stored at key
  append(key, item, maxItems = 1000) {
    const arr = this.get(key, []);
    arr.push(item);
    if (arr.length > maxItems) arr.splice(0, arr.length - maxItems);
    this.set(key, arr);
    return arr;
  },

  // Get items from array within date range
  getRange(key, startDate, endDate) {
    const arr = this.get(key, []);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return arr.filter(item => {
      const t = new Date(item.timestamp || item.date || item.created_at).getTime();
      return t >= start && t <= end;
    });
  },

  // Get today's items
  getToday(key) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86400000);
    return this.getRange(key, start, end);
  },

  // Get last N days
  getLastDays(key, days) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    return this.getRange(key, start, end);
  },

  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  },
};
