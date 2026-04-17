/*  ================================================
    LinkedLens — Background Service Worker (MV3) Fixed
    ================================================ */

// ── Alarm names ──
const ALARM_TIME_TICK = 'linkedlens-time-tick';
const ALARM_NUDGE = 'linkedlens-nudge-check';

// ── Default data factory ──
function getDefaults() {
  return {
    ll_settings: {
      sentimentEnabled: true,
      bookmarkSnapshot: true,
      keyboardShortcuts: true,
      nudgeAfterMinutes: 45,
      nudgeType: 'banner',
      nudgeEnabled: true,
      badgeStyle: 'pill',
      libraryCapacity: 500
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
}

// ── Installation / Defaults ──
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const defaults = getDefaults();
    const existing = await chrome.storage.local.get(Object.keys(defaults));
    const toSet = {};
    for (const [key, value] of Object.entries(defaults)) {
      if (existing[key] === undefined || existing[key] === null) {
        toSet[key] = value;
      }
    }
    if (Object.keys(toSet).length) {
      await chrome.storage.local.set(toSet);
    }
  } catch (e) {
    console.error('[LinkedLens] onInstalled error:', e);
  }

  // Create periodic alarms
  chrome.alarms.create(ALARM_TIME_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_NUDGE, { periodInMinutes: 5 });
});

// ── Also ensure alarms exist on startup (service worker can restart) ──
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get(ALARM_TIME_TICK, (alarm) => {
    if (!alarm) chrome.alarms.create(ALARM_TIME_TICK, { periodInMinutes: 1 });
  });
  chrome.alarms.get(ALARM_NUDGE, (alarm) => {
    if (!alarm) chrome.alarms.create(ALARM_NUDGE, { periodInMinutes: 5 });
  });
});

// ── Alarm handler ──
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === ALARM_TIME_TICK) {
      await tickSessionTime();
    }
    if (alarm.name === ALARM_NUDGE) {
      await checkNudge();
    }
  } catch (e) {
    console.error('[LinkedLens] alarm error:', e);
  }
});

// ── Tick: increment active session ──
async function tickSessionTime() {
  const data = await chrome.storage.local.get(['ll_timeTracker']);
  const tracker = data.ll_timeTracker;
  if (!tracker || !tracker.currentSession) return;

  const now = Date.now();
  tracker.currentSession.elapsed = now - tracker.currentSession.startedAt;

  const todayKey = new Date().toISOString().slice(0, 10);
  if (!tracker.dailyLog) tracker.dailyLog = {};
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

  if (!settings || !settings.nudgeEnabled || !tracker || !tracker.currentSession) return;

  const elapsed = Date.now() - tracker.currentSession.startedAt;
  const limitMs = (settings.nudgeAfterMinutes || 45) * 60 * 1000;

  if (elapsed >= limitMs && !tracker.currentSession.nudged) {
    tracker.currentSession.nudged = true;
    await chrome.storage.local.set({ ll_timeTracker: tracker });

    if (settings.nudgeType === 'notification') {
      chrome.notifications.create('ll-nudge', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'LinkedLens — Time Check',
        message: 'You have been on LinkedIn for ' + settings.nudgeAfterMinutes + ' minutes. Consider taking a break!'
      });
    } else {
      const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*', active: true, currentWindow: true });
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_NUDGE',
            minutes: settings.nudgeAfterMinutes
          });
        } catch (e) {
          // Tab may not have content script loaded
        }
      }
    }
  }
}

// ── Message router ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) {
    sendResponse({ error: 'invalid message' });
    return false;
  }

  const handler = messageHandlers[msg.type];
  if (handler) {
    handler(msg, sender)
      .then(result => sendResponse(result))
      .catch(err => {
        console.error('[LinkedLens] message handler error:', msg.type, err);
        sendResponse({ error: err.message });
      });
    return true; // Keep channel open for async response
  }

  sendResponse({ error: 'unknown message type' });
  return false;
});

// ── Message handlers map ──
const messageHandlers = {
  START_SESSION: async () => {
    return await handleStartSession();
  },
  END_SESSION: async () => {
    return await handleEndSession();
  },
  GET_TRACKER: async () => {
    const d = await chrome.storage.local.get(['ll_timeTracker']);
    return d.ll_timeTracker || getDefaults().ll_timeTracker;
  },
  SAVE_POST: async (msg) => {
    return await handleSavePost(msg.payload);
  },
  GET_LIBRARY: async () => {
    const d = await chrome.storage.local.get(['ll_library']);
    return d.ll_library || [];
  },
  DELETE_POST: async (msg) => {
    return await handleDeletePost(msg.id);
  },
  UPDATE_POST_NOTES: async (msg) => {
    return await handleUpdatePostNotes(msg.id, msg.notes);
  },
  GET_SETTINGS: async () => {
    const d = await chrome.storage.local.get(['ll_settings']);
    return d.ll_settings || getDefaults().ll_settings;
  },
  SAVE_SETTINGS: async (msg) => {
    await chrome.storage.local.set({ ll_settings: msg.payload });
    return { ok: true };
  },
  GET_STATS: async () => {
    const d = await chrome.storage.local.get(['ll_stats']);
    return d.ll_stats || getDefaults().ll_stats;
  },
  INCREMENT_STAT: async (msg) => {
    return await handleIncrementStat(msg.key, msg.value);
  },
  OPEN_SIDEPANEL: async (msg, sender) => {
    try {
      if (sender && sender.tab) {
        await chrome.sidePanel.open({ tabId: sender.tab.id });
      }
    } catch (e) {
      // sidePanel may not be available
    }
    return { ok: true };
  }
};

async function handleStartSession() {
  const data = await chrome.storage.local.get(['ll_timeTracker']);
  const tracker = data.ll_timeTracker || getDefaults().ll_timeTracker;

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

  if (!tracker.sessions) tracker.sessions = [];
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
  if (!payload) return { ok: false, reason: 'no payload' };

  const data = await chrome.storage.local.get(['ll_library', 'll_stats', 'll_settings']);
  const library = data.ll_library || [];
  const stats = data.ll_stats || getDefaults().ll_stats;
  const settings = data.ll_settings || getDefaults().ll_settings;

  // Duplicate detection: check by URL (if real URL) AND by content hash
  const contentHash = simpleHash(payload.content || '');
  const hasRealUrl = payload.url && !payload.url.includes('#ll-') && payload.url !== '';

  const isDuplicate = library.some(function(p) {
    // Match by real URL
    if (hasRealUrl && p.url && p.url === payload.url) return true;
    // Match by content hash (for posts without proper URL)
    if (p._contentHash && p._contentHash === contentHash && contentHash !== '0') return true;
    return false;
  });

  if (isDuplicate) {
    return { ok: false, reason: 'duplicate' };
  }

  const entry = {
    id: generateId(),
    author: (payload.author || 'Unknown').substring(0, 200),
    headline: (payload.headline || '').substring(0, 300),
    content: settings.bookmarkSnapshot !== false ? (payload.content || '').substring(0, 10000) : '',
    url: payload.url || '',
    savedAt: Date.now(),
    category: autoCategory(payload.content || ''),
    notes: '',
    tags: [],
    _contentHash: contentHash
  };

  library.unshift(entry);

  // Cap at configured capacity
  const capacity = settings.libraryCapacity || 500;
  while (library.length > capacity) {
    library.pop();
  }

  stats.postsSaved = (stats.postsSaved || 0) + 1;

  await chrome.storage.local.set({ ll_library: library, ll_stats: stats });
  return { ok: true, entry: entry };
}

async function handleDeletePost(id) {
  const data = await chrome.storage.local.get(['ll_library']);
  let library = data.ll_library || [];
  library = library.filter(function(p) { return p.id !== id; });
  await chrome.storage.local.set({ ll_library: library });
  return { ok: true };
}

async function handleUpdatePostNotes(id, notes) {
  const data = await chrome.storage.local.get(['ll_library']);
  const library = data.ll_library || [];
  const post = library.find(function(p) { return p.id === id; });
  if (post) {
    post.notes = notes || '';
    await chrome.storage.local.set({ ll_library: library });
    return { ok: true };
  }
  return { ok: false, reason: 'not found' };
}

async function handleIncrementStat(key, value) {
  const data = await chrome.storage.local.get(['ll_stats']);
  const stats = data.ll_stats || getDefaults().ll_stats;
  stats[key] = (stats[key] || 0) + (value || 1);
  await chrome.storage.local.set({ ll_stats: stats });
  return stats;
}

function autoCategory(text) {
  const categories = {
    'Leadership': ['leader', 'manage', 'team', 'culture', 'vision', 'mentor', 'executive', 'ceo', 'cto'],
    'Technology': ['ai', 'cloud', 'software', 'data', 'tech', 'machine learning', 'api', 'code', 'developer', 'engineering'],
    'Career': ['career', 'interview', 'resume', 'promotion', 'salary', 'job', 'hiring', 'hired', 'role'],
    'Marketing': ['brand', 'content', 'seo', 'marketing', 'audience', 'social media', 'campaign', 'growth'],
    'Startup': ['founder', 'startup', 'funding', 'venture', 'mvp', 'entrepreneur', 'bootstrap', 'series a'],
    'Finance': ['finance', 'invest', 'revenue', 'profit', 'stock', 'market', 'economic', 'budget'],
    'Productivity': ['productivity', 'habit', 'routine', 'focus', 'time management', 'efficient', 'workflow']
  };

  var lower = text.toLowerCase();
  var best = 'General';
  var bestScore = 0;

  for (var cat in categories) {
    if (!categories.hasOwnProperty(cat)) continue;
    var keywords = categories[cat];
    var score = 0;
    for (var i = 0; i < keywords.length; i++) {
      var parts = lower.split(keywords[i]);
      score += parts.length - 1;
    }
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

function simpleHash(str) {
  if (!str) return '0';
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}