// Terminus PWA - Shared UI Utilities
// Toast notifications, AI response formatting, HTML sanitization

// === HTML Sanitization ===
export function escapeHtml(str) {
  if (!str) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// === Toast Notifications ===
export function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// === AI Response Formatting ===
export function formatAIResponse(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n<br>&bull; ')
    .replace(/\n\d+\. /g, (m) => `<br>${m.trim()} `)
    .replace(/\n/g, '<br>');
}
