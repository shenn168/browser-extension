/*  ================================================
    LinkedLens — Background Service Worker (MV3)
    ================================================ */

// ── Alarm names ──
const ALARM_TIME_TICK = 'linkedlens-time-tick';
const ALARM_NUDGE = 'linkedlens-nudge-check';

// ── Installation / Defaults ──
chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    ll_settings: {
      sentimentEnabled: true,
      bookmarkSnapshot: true,
      keyboardShortcuts: true,
      nudgeAfterMinutes: 45,
      nudgeType: 'banner',
      nudgeEnabled: true,
      badgeStyle: 'pill'
    },
    ll_library: [],
    ll_timeTracker: {
      sessions: [],
      currentSession: null,
      totalToday: 0,
      dailyLog: {}
    },
    ll_stats: {
      postsAnalyzed: 0,
      postsSaved: 0,
      totalTime: 0
    }
  };

  const existing = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (!existing[key]) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length) {
    await chrome.storage.local.set(toSet);
  }

  // Create periodic alarms
  chrome.alarms.create(ALARM_TIME_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_NUDGE, { periodInMinutes: 5 });
});

// ── Alarm handler ──
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TIME_TICK) {
    await tickSessionTime();
  }
  if (alarm.name === ALARM_NUDGE) {
    await checkNudge();
  }
});

// ── Tick: increment active session ──
async function tickSessionTime() {
  const data = await chrome.storage.local.get(['ll_timeTracker']);
  const tracker = data.ll_timeTracker;
  if (!tracker || !tracker.currentSession) return;

  const now = Date.now();
  const elapsed = now - tracker.currentSession.startedAt;
  tracker.currentSession.elapsed = elapsed;

  const todayKey = new Date().toISOString().slice(0, 10);
  if (!tracker.dailyLog[todayKey]) tracker.dailyLog[todayKey] = 0;
  tracker.dailyLog[todayKey] += 60000; // +1 min
  tracker.totalToday = tracker.dailyLog[todayKey];

  await chrome.storage.local.set({ ll_timeTracker: tracker });
}

// ── Nudge check ──
async function checkNudge() {
  const data = await chrome.storage.local.get(['ll_timeTracker', 'll_settings']);
  const tracker = data.ll_timeTracker;
  const settings = data.ll_settings;

  if (!settings.nudgeEnabled || !tracker.currentSession) return;

  const elapsed = Date.now() - tracker.currentSession.startedAt;
  const limitMs = (settings.nudgeAfterMinutes || 45) * 60 * 1000;

  if (elapsed >= limitMs && !tracker.currentSession.nudged) {
    tracker.currentSession.nudged = true;
    await chrome.storage.local.set({ ll_timeTracker: tracker });

    if (settings.nudgeType === 'notification') {
      chrome.notifications.create('ll-nudge', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'LinkedLens — Time Check ⏱️',
        message: `You've been on LinkedIn for ${settings.nudgeAfterMinutes} minutes. Consider taking a break!`
      });
    } else {
      // Send message to content script for banner
      const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*', active: true });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_NUDGE',
          minutes: settings.nudgeAfterMinutes
        }).catch(() => {});
      }
    }
  }
}

// ── Message router ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_SESSION') {
    handleStartSession().then(sendResponse);
    return true;
  }
  if (msg.type === 'END_SESSION') {
    handleEndSession().then(sendResponse);
    return true;
  }
  if (msg.type === 'GET_TRACKER') {
    chrome.storage.local.get(['ll_timeTracker']).then(d => sendResponse(d.ll_timeTracker));
    return true;
  }
  if (msg.type === 'SAVE_POST') {
    handleSavePost(msg.payload).then(sendResponse);
    return true;
  }
  if (msg.type === 'GET_LIBRARY') {
    chrome.storage.local.get(['ll_library']).then(d => sendResponse(d.ll_library || []));
    return true;
  }
  if (msg.type === 'DELETE_POST') {
    handleDeletePost(msg.id).then(sendResponse);
    return true;
  }
  if (msg.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['ll_settings']).then(d => sendResponse(d.ll_settings));
    return true;
  }
  if (msg.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ ll_settings: msg.payload }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_STATS') {
    chrome.storage.local.get(['ll_stats']).then(d => sendResponse(d.ll_stats));
    return true;
  }
  if (msg.type === 'INCREMENT_STAT') {
    handleIncrementStat(msg.key, msg.value).then(sendResponse);
    return true;
  }
  if (msg.type === 'OPEN_SIDEPANEL') {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }
});

async function handleStartSession() {
  const data = await chrome.storage.local.get(['ll_timeTracker']);
  const tracker = data.ll_timeTracker || { sessions: [], currentSession: null, totalToday: 0, dailyLog: {} };

  if (!tracker.currentSession) {
    tracker.currentSession = {
      startedAt: Date.now(),
      elapsed: 0,
      nudged: false
    };
    await chrome.storage.local.set({ ll_timeTracker: tracker });
  }
  return { ok: true };
}

async function handleEndSession() {
  const data = await chrome.storage.local.get(['ll_timeTracker']);
  const tracker = data.ll_timeTracker;
  if (!tracker || !tracker.currentSession) return { ok: true };

  const session = tracker.currentSession;
  session.endedAt = Date.now();
  session.elapsed = session.endedAt - session.startedAt;
  tracker.sessions.push(session);
  tracker.currentSession = null;

  // Keep only last 100 sessions
  if (tracker.sessions.length > 100) {
    tracker.sessions = tracker.sessions.slice(-100);
  }

  await chrome.storage.local.set({ ll_timeTracker: tracker });
  return { ok: true };
}

async function handleSavePost(payload) {
  const data = await chrome.storage.local.get(['ll_library', 'll_stats']);
  const library = data.ll_library || [];
  const stats = data.ll_stats || { postsAnalyzed: 0, postsSaved: 0, totalTime: 0 };

  // Avoid duplicates by URL
  if (payload.url && library.some(p => p.url === payload.url)) {
    return { ok: false, reason: 'duplicate' };
  }

  const entry = {
    id: generateId(),
    author: payload.author || 'Unknown',
    headline: payload.headline || '',
    content: payload.content || '',
    url: payload.url || '',
    savedAt: Date.now(),
    category: autoCategory(payload.content || ''),
    notes: '',
    tags: []
  };

  library.unshift(entry);

  // Cap at 500 entries
  if (library.length > 500) library.pop();

  stats.postsSaved++;

  await chrome.storage.local.set({ ll_library: library, ll_stats: stats });
  return { ok: true, entry };
}

async function handleDeletePost(id) {
  const data = await chrome.storage.local.get(['ll_library']);
  let library = data.ll_library || [];
  library = library.filter(p => p.id !== id);
  await chrome.storage.local.set({ ll_library: library });
  return { ok: true };
}

async function handleIncrementStat(key, value) {
  const data = await chrome.storage.local.get(['ll_stats']);
  const stats = data.ll_stats || { postsAnalyzed: 0, postsSaved: 0, totalTime: 0 };
  stats[key] = (stats[key] || 0) + (value || 1);
  await chrome.storage.local.set({ ll_stats: stats });
  return stats;
}

function autoCategory(text) {
  const categories = {
    'Leadership': ['leader', 'manage', 'team', 'culture', 'vision', 'mentor', 'executive'],
    'Technology': ['ai', 'cloud', 'software', 'data', 'tech', 'machine learning', 'api', 'code', 'developer'],
    'Career': ['career', 'interview', 'resume', 'promotion', 'salary', 'job', 'hiring', 'hired'],
    'Marketing': ['brand', 'content', 'seo', 'marketing', 'audience', 'social media', 'campaign'],
    'Startup': ['founder', 'startup', 'funding', 'venture', 'mvp', 'entrepreneur', 'bootstrap'],
    'Finance': ['finance', 'invest', 'revenue', 'profit', 'stock', 'market', 'economic'],
    'Productivity': ['productivity', 'habit', 'routine', 'focus', 'time management', 'efficient']
  };

  const lower = text.toLowerCase();
  let best = 'General';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(categories)) {
    const score = keywords.reduce((s, k) => s + (lower.split(k).length - 1), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}