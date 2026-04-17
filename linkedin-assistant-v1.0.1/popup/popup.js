/*  ================================================
    LinkedLens — Popup Script
    ================================================ */

(function () {
  'use strict';

  let settings = {};
  let sessionInterval = null;

  // ── Init ──
  async function init() {
    settings = await sendMessage({ type: 'GET_SETTINGS' }) || {};
    const stats = await sendMessage({ type: 'GET_STATS' }) || {};
    const tracker = await sendMessage({ type: 'GET_TRACKER' }) || {};

    renderStats(stats);
    renderSession(tracker);
    renderToggles();
    renderWeeklyChart(tracker);
    bindActions();

    // Live timer update
    sessionInterval = setInterval(async () => {
      const t = await sendMessage({ type: 'GET_TRACKER' });
      renderSession(t);
    }, 1000);
  }

  // ── Render Stats ──
  function renderStats(stats) {
    document.getElementById('stat-analyzed').textContent = formatNumber(stats.postsAnalyzed || 0);
    document.getElementById('stat-saved').textContent = formatNumber(stats.postsSaved || 0);

    // Today time
    sendMessage({ type: 'GET_TRACKER' }).then(tracker => {
      if (tracker) {
        const todayKey = new Date().toISOString().slice(0, 10);
        const todayMs = tracker.dailyLog ? (tracker.dailyLog[todayKey] || 0) : 0;
        document.getElementById('stat-time').textContent = formatDuration(todayMs);
      }
    });
  }

  // ── Render Session Timer ──
  function renderSession(tracker) {
    if (!tracker) return;

    const timerEl = document.getElementById('session-timer');
    const metaEl = document.getElementById('session-meta');

    if (tracker.currentSession) {
      const elapsed = Date.now() - tracker.currentSession.startedAt;
      timerEl.textContent = formatTime(elapsed);
      timerEl.classList.add('ll-timer-active');
      metaEl.textContent = 'Session active';
    } else {
      timerEl.textContent = '00:00:00';
      timerEl.classList.remove('ll-timer-active');
      metaEl.textContent = 'No active session';
    }
  }

  // ── Render Toggles ──
  function renderToggles() {
    const sentimentSpan = document.getElementById('sentiment-status');
    const shortcutsSpan = document.getElementById('shortcuts-status');

    sentimentSpan.textContent = settings.sentimentEnabled !== false ? 'ON' : 'OFF';
    sentimentSpan.className = settings.sentimentEnabled !== false ? 'll-on' : 'll-off';

    shortcutsSpan.textContent = settings.keyboardShortcuts !== false ? 'ON' : 'OFF';
    shortcutsSpan.className = settings.keyboardShortcuts !== false ? 'll-on' : 'll-off';
  }

  // ── Weekly Chart (CSS bar chart) ──
  function renderWeeklyChart(tracker) {
    const container = document.getElementById('weekly-chart');
    if (!tracker || !tracker.dailyLog) {
      container.innerHTML = '<div class="ll-chart-empty">Start browsing LinkedIn to track usage</div>';
      return;
    }

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        label: dayNames[d.getDay()],
        ms: tracker.dailyLog[key] || 0,
        isToday: i === 0
      });
    }

    const maxMs = Math.max(...days.map(d => d.ms), 1);

    let html = '';
    days.forEach(day => {
      const pct = Math.round((day.ms / maxMs) * 100);
      const mins = Math.round(day.ms / 60000);
      html += `
        <div class="ll-chart-row">
          <span class="ll-chart-label ${day.isToday ? 'll-chart-today' : ''}">${day.label}</span>
          <div class="ll-chart-bar-bg">
            <div class="ll-chart-bar" style="width:${Math.max(pct, 2)}%"></div>
          </div>
          <span class="ll-chart-value">${mins}m</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ── Bind Actions ──
  function bindActions() {
    document.getElementById('btn-sidepanel').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('linkedin.com')) {
        chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
          // Fallback: open side panel page in new tab
          chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
        });
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
      }
    });

    document.getElementById('btn-sentiment').addEventListener('click', async () => {
      settings.sentimentEnabled = settings.sentimentEnabled === false ? true : false;
      await sendMessage({ type: 'SAVE_SETTINGS', payload: settings });
      renderToggles();
    });

    document.getElementById('btn-shortcuts').addEventListener('click', async () => {
      settings.keyboardShortcuts = settings.keyboardShortcuts === false ? true : false;
      await sendMessage({ type: 'SAVE_SETTINGS', payload: settings });
      renderToggles();
    });

    document.getElementById('btn-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
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

  function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDuration(ms) {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return mins + 'm';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h + 'h ' + m + 'm';
  }

  // ── Boot ──
  init();
})();