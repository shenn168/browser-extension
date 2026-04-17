/*  ================================================
    LinkedLens — Options Page Script
    ================================================ */

(function () {
  'use strict';

  let settings = {};

  // ── Element Map ──
  const els = {};

  function $(id) {
    if (!els[id]) els[id] = document.getElementById(id);
    return els[id];
  }

  // ── Init ──
  async function init() {
    settings = await sendMessage({ type: 'GET_SETTINGS' }) || {};
    populateUI();
    bindEvents();
    calculateStorage();
  }

  // ── Populate UI from settings ──
  function populateUI() {
    $('opt-sentiment').checked = settings.sentimentEnabled !== false;
    $('opt-badge-style').value = settings.badgeStyle || 'pill';
    $('opt-shortcuts').checked = settings.keyboardShortcuts !== false;
    $('opt-snapshot').checked = settings.bookmarkSnapshot !== false;
    $('opt-capacity').value = String(settings.libraryCapacity || 500);
    $('opt-nudge').checked = settings.nudgeEnabled !== false;
    $('opt-nudge-time').value = String(settings.nudgeAfterMinutes || 45);
    $('opt-nudge-type').value = settings.nudgeType || 'banner';
  }

  // ── Gather settings from UI ──
  function gatherSettings() {
    return {
      sentimentEnabled: $('opt-sentiment').checked,
      badgeStyle: $('opt-badge-style').value,
      keyboardShortcuts: $('opt-shortcuts').checked,
      bookmarkSnapshot: $('opt-snapshot').checked,
      libraryCapacity: parseInt($('opt-capacity').value, 10),
      nudgeEnabled: $('opt-nudge').checked,
      nudgeAfterMinutes: parseInt($('opt-nudge-time').value, 10),
      nudgeType: $('opt-nudge-type').value
    };
  }

  // ── Save handler ──
  async function saveSettings() {
    settings = gatherSettings();
    await sendMessage({ type: 'SAVE_SETTINGS', payload: settings });
    showSaveBanner();
  }

  // ── Bind events ──
  function bindEvents() {
    // Auto-save on any change
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('change', saveSettings);
    });

    // Export library
    $('btn-export').addEventListener('click', async () => {
      const library = await sendMessage({ type: 'GET_LIBRARY' }) || [];
      const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedlens-library-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Clear library
    $('btn-clear-library').addEventListener('click', async () => {
      if (confirm('Delete all saved posts? This cannot be undone.')) {
        await chrome.storage.local.set({ ll_library: [] });
        showSaveBanner('Library cleared');
        calculateStorage();
      }
    });

    // Clear tracker
    $('btn-clear-tracker').addEventListener('click', async () => {
      if (confirm('Reset all time tracking data?')) {
        await chrome.storage.local.set({
          ll_timeTracker: {
            sessions: [],
            currentSession: null,
            totalToday: 0,
            dailyLog: {}
          }
        });
        showSaveBanner('Time data reset');
        calculateStorage();
      }
    });

    // Clear all
    $('btn-clear-all').addEventListener('click', async () => {
      if (confirm('⚠️ This will delete ALL LinkedLens data including settings, library, and time tracking. Continue?')) {
        await chrome.storage.local.clear();
        // Re-init defaults
        location.reload();
      }
    });
  }

  // ── Storage calculation ──
  async function calculateStorage() {
    const all = await chrome.storage.local.get(null);
    const bytes = new Blob([JSON.stringify(all)]).size;
    const maxBytes = 10 * 1024 * 1024; // 10MB
    const pct = Math.round((bytes / maxBytes) * 100);
    const display = bytes < 1024 ? bytes + ' B'
      : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB'
      : (bytes / 1048576).toFixed(2) + ' MB';

    $('opt-storage-info').textContent = `${display} of 10 MB used (${pct}%)`;
    $('opt-storage-fill').style.width = Math.min(pct, 100) + '%';

    if (pct > 80) {
      $('opt-storage-fill').style.background = '#f44336';
    } else if (pct > 50) {
      $('opt-storage-fill').style.background = '#ff9800';
    }
  }

  // ── Save banner flash ──
  function showSaveBanner(text) {
    const banner = $('save-banner');
    if (text) banner.querySelector('span').textContent = text;
    else banner.querySelector('span').textContent = 'Settings saved ✓';

    banner.classList.remove('ll-hidden');
    setTimeout(() => banner.classList.add('ll-hidden'), 2000);
  }

  // ── Helpers ──
  function sendMessage(msg) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(msg, response => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(response);
      });
    });
  }

  // ── Boot ──
  init();
})();