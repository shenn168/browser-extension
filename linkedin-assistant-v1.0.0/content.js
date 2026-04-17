/*  ================================================
    LinkedLens — Content Script
    Injected into linkedin.com pages
    ================================================ */

(function () {
  'use strict';

  // Prevent double-init
  if (window.__linkedLensInit) return;
  window.__linkedLensInit = true;

  let settings = {};
  let currentPostIndex = 0;
  let shortcutBuffer = '';
  let shortcutTimer = null;

  // ── Initialize ──
  async function init() {
    settings = await sendMessage({ type: 'GET_SETTINGS' }) || {};

    // Start time tracking session
    sendMessage({ type: 'START_SESSION' });

    // Initial scan
    setTimeout(scanFeed, 2000);

    // Observe DOM for new posts
    observeFeed();

    // Keyboard shortcuts
    if (settings.keyboardShortcuts !== false) {
      initKeyboardShortcuts();
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleMessage);

    // End session on unload
    window.addEventListener('beforeunload', () => {
      sendMessage({ type: 'END_SESSION' });
    });

    injectShortcutHelpPanel();
  }

  // ── Feed Scanner ──
  function scanFeed() {
    if (settings.sentimentEnabled === false) return;

    const posts = LLParser.getPosts();
    posts.forEach(postEl => {
      if (LLParser.hasBadge(postEl)) return;

      const data = LLParser.extractPostData(postEl);
      if (!data.content || data.content.length < 20) return;

      const sentiment = LLSentiment.analyze(data.content);
      const readability = LLSentiment.readability(data.content);

      injectSentimentBadge(postEl, sentiment, readability, data);

      sendMessage({ type: 'INCREMENT_STAT', key: 'postsAnalyzed', value: 1 });
    });
  }

  // ── Inject Sentiment Badge ──
  function injectSentimentBadge(postEl, sentiment, readability, postData) {
    const badge = document.createElement('div');
    badge.className = 'll-sentiment-badge';

    const colors = {
      positive: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32', emoji: '🟢' },
      neutral: { bg: '#fff8e1', border: '#ffc107', text: '#f57f17', emoji: '🟡' },
      negative: { bg: '#fce4ec', border: '#f44336', text: '#c62828', emoji: '🔴' }
    };

    const c = colors[sentiment.label];

    badge.innerHTML = `
      <div class="ll-badge-pill" style="background:${c.bg};border:1px solid ${c.border};color:${c.text}">
        <span class="ll-badge-emoji">${c.emoji}</span>
        <span class="ll-badge-label">${sentiment.label}</span>
        <span class="ll-badge-score">${sentiment.normalized > 0 ? '+' : ''}${sentiment.normalized}</span>
        <span class="ll-badge-divider">|</span>
        <span class="ll-badge-read">📖 ${readability.readTime}m read</span>
        <span class="ll-badge-divider">|</span>
        <span class="ll-badge-level">${readability.level}</span>
        <button class="ll-save-btn" title="Save to library">🔖</button>
        <button class="ll-detail-btn" title="View details">📊</button>
      </div>
    `;

    // Save button handler
    badge.querySelector('.ll-save-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const btn = e.currentTarget;
      const result = await sendMessage({
        type: 'SAVE_POST',
        payload: {
          author: postData.author,
          headline: postData.headline,
          content: postData.content,
          url: postData.url
        }
      });
      if (result && result.ok) {
        btn.textContent = '✅';
        btn.style.cursor = 'default';
        showToast('Post saved to library!');
      } else if (result && result.reason === 'duplicate') {
        btn.textContent = '📌';
        showToast('Already saved!');
      }
    });

    // Detail button handler
    badge.querySelector('.ll-detail-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showDetailPanel(postData, sentiment, readability);
    });

    // Insert badge
    const textContainer = postEl.querySelector('.feed-shared-update-v2__description') ||
      postEl.querySelector('.update-components-text') ||
      postEl.querySelector('.feed-shared-text');

    if (textContainer) {
      textContainer.parentElement.insertBefore(badge, textContainer.nextSibling);
    } else {
      postEl.prepend(badge);
    }
  }

  // ── Detail Panel (inline expandable) ──
  function showDetailPanel(postData, sentiment, readability) {
    // Remove any existing detail panel
    document.querySelectorAll('.ll-detail-panel').forEach(p => p.remove());

    const panel = document.createElement('div');
    panel.className = 'll-detail-panel';

    const topWords = sentiment.words
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 6)
      .map(w => `<span class="ll-word-chip ${w.score > 0 ? 'll-word-pos' : w.score < 0 ? 'll-word-neg' : 'll-word-neu'}">${w.word} (${w.score > 0 ? '+' : ''}${w.score})</span>`)
      .join('');

    panel.innerHTML = `
      <div class="ll-detail-inner">
        <div class="ll-detail-header">
          <h4>📊 LinkedLens Analysis</h4>
          <button class="ll-detail-close">✕</button>
        </div>
        <div class="ll-detail-grid">
          <div class="ll-detail-card">
            <div class="ll-detail-card-title">Sentiment</div>
            <div class="ll-detail-card-value ll-sentiment-${sentiment.label}">${sentiment.label.toUpperCase()}</div>
            <div class="ll-detail-card-sub">Score: ${sentiment.normalized} | Confidence: ${Math.round(sentiment.confidence * 100)}%</div>
          </div>
          <div class="ll-detail-card">
            <div class="ll-detail-card-title">Readability</div>
            <div class="ll-detail-card-value">${readability.level}</div>
            <div class="ll-detail-card-sub">Grade ${readability.grade} | Ease ${readability.ease}/100</div>
          </div>
          <div class="ll-detail-card">
            <div class="ll-detail-card-title">Stats</div>
            <div class="ll-detail-card-value">${readability.wordCount} words</div>
            <div class="ll-detail-card-sub">${readability.sentenceCount} sentences | ~${readability.readTime}m read</div>
          </div>
        </div>
        <div class="ll-detail-words">
          <div class="ll-detail-card-title">Key Signal Words</div>
          <div class="ll-word-chips">${topWords || '<em>No strong signals detected</em>'}</div>
        </div>
        <div class="ll-detail-content-preview">
          <div class="ll-detail-card-title">Author</div>
          <div>${postData.author}${postData.headline ? ' — ' + postData.headline : ''}</div>
        </div>
      </div>
    `;

    panel.querySelector('.ll-detail-close').addEventListener('click', () => panel.remove());

    // Position near the post
    const postEl = document.querySelector('.ll-detail-btn:focus')?.closest('.feed-shared-update-v2') ||
      document.querySelector('.feed-shared-update-v2');
    if (postEl) {
      postEl.appendChild(panel);
    } else {
      document.body.appendChild(panel);
    }
  }

  // ── Toast Notification ──
  function showToast(message, duration) {
    duration = duration || 2500;
    const existing = document.querySelector('.ll-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('ll-toast-show'));

    setTimeout(() => {
      toast.classList.remove('ll-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ── Feed Observer ──
  function observeFeed() {
    const container = LLParser.getFeedContainer();
    const observer = new MutationObserver(debounce(() => {
      scanFeed();
    }, 1000));
    observer.observe(container, { childList: true, subtree: true });
  }

  // ── Keyboard Shortcuts ──
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore when typing in inputs
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Multi-key combo handling (g+h, g+m, etc.)
      if (shortcutBuffer === 'g') {
        clearTimeout(shortcutTimer);
        shortcutBuffer = '';
        handleGoShortcut(key);
        e.preventDefault();
        return;
      }

      if (key === 'g') {
        shortcutBuffer = 'g';
        shortcutTimer = setTimeout(() => { shortcutBuffer = ''; }, 800);
        return;
      }

      shortcutBuffer = '';

      switch (key) {
        case 'j':
          e.preventDefault();
          navigatePost(1);
          break;
        case 'k':
          e.preventDefault();
          navigatePost(-1);
          break;
        case 'l':
          e.preventDefault();
          interactCurrentPost('like');
          break;
        case 'c':
          e.preventDefault();
          interactCurrentPost('comment');
          break;
        case 's':
          e.preventDefault();
          saveCurrentPost();
          break;
        case '/':
          e.preventDefault();
          focusSearch();
          break;
        case '?':
          if (e.shiftKey) {
            e.preventDefault();
            toggleShortcutHelp();
          }
          break;
        case 'escape':
          closeAllPanels();
          break;
      }
    });
  }

  function navigatePost(direction) {
    const posts = LLParser.getPosts();
    if (!posts.length) return;

    currentPostIndex = LLParser.getCurrentPostIndex(posts);
    currentPostIndex = Math.max(0, Math.min(posts.length - 1, currentPostIndex + direction));

    const targetPost = posts[currentPostIndex];
    targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Visual highlight
    document.querySelectorAll('.ll-post-focus').forEach(el => el.classList.remove('ll-post-focus'));
    targetPost.classList.add('ll-post-focus');
    setTimeout(() => targetPost.classList.remove('ll-post-focus'), 2000);
  }

  function interactCurrentPost(action) {
    const posts = LLParser.getPosts();
    if (!posts.length) return;

    currentPostIndex = LLParser.getCurrentPostIndex(posts);
    const post = posts[currentPostIndex];

    if (action === 'like') {
      const likeBtn = post.querySelector('button[aria-label*="Like"]') ||
        post.querySelector('.reactions-react-button button') ||
        post.querySelector('button.react-button__trigger');
      if (likeBtn) {
        likeBtn.click();
        showToast('👍 Liked!');
      }
    }

    if (action === 'comment') {
      const commentBtn = post.querySelector('button[aria-label*="Comment"]') ||
        post.querySelector('button.comment-button');
      if (commentBtn) {
        commentBtn.click();
        showToast('💬 Comment box opened');
      }
    }
  }

  async function saveCurrentPost() {
    const posts = LLParser.getPosts();
    if (!posts.length) return;

    currentPostIndex = LLParser.getCurrentPostIndex(posts);
    const post = posts[currentPostIndex];
    const data = LLParser.extractPostData(post);

    const result = await sendMessage({
      type: 'SAVE_POST',
      payload: {
        author: data.author,
        headline: data.headline,
        content: data.content,
        url: data.url
      }
    });

    if (result && result.ok) {
      showToast('🔖 Post saved to library!');
      // Update save button if it exists
      const btn = post.querySelector('.ll-save-btn');
      if (btn) btn.textContent = '✅';
    } else if (result && result.reason === 'duplicate') {
      showToast('📌 Already saved!');
    }
  }

  function handleGoShortcut(key) {
    const routes = {
      'h': '/feed/',
      'm': '/messaging/',
      'n': '/notifications/',
      'j': '/jobs/',
      'p': '/in/me/'
    };
    if (routes[key]) {
      window.location.href = 'https://www.linkedin.com' + routes[key];
    }
  }

  function focusSearch() {
    const searchInput = document.querySelector('input[aria-label*="Search"]') ||
      document.querySelector('.search-global-typeahead__input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  // ── Shortcut Help Panel ──
  function injectShortcutHelpPanel() {
    const panel = document.createElement('div');
    panel.id = 'll-shortcut-help';
    panel.className = 'll-shortcut-help ll-hidden';
    panel.innerHTML = `
      <div class="ll-help-inner">
        <div class="ll-help-header">
          <h3>⌨️ LinkedLens Shortcuts</h3>
          <button class="ll-help-close">✕</button>
        </div>
        <div class="ll-help-grid">
          <div class="ll-help-group">
            <h4>Navigation</h4>
            <div class="ll-help-row"><kbd>J</kbd> Next post</div>
            <div class="ll-help-row"><kbd>K</kbd> Previous post</div>
            <div class="ll-help-row"><kbd>/</kbd> Focus search</div>
            <div class="ll-help-row"><kbd>Esc</kbd> Close panels</div>
          </div>
          <div class="ll-help-group">
            <h4>Actions</h4>
            <div class="ll-help-row"><kbd>L</kbd> Like current post</div>
            <div class="ll-help-row"><kbd>C</kbd> Comment on post</div>
            <div class="ll-help-row"><kbd>S</kbd> Save to library</div>
            <div class="ll-help-row"><kbd>?</kbd> Toggle this help</div>
          </div>
          <div class="ll-help-group">
            <h4>Go To (press G then...)</h4>
            <div class="ll-help-row"><kbd>G</kbd> <kbd>H</kbd> Home feed</div>
            <div class="ll-help-row"><kbd>G</kbd> <kbd>M</kbd> Messages</div>
            <div class="ll-help-row"><kbd>G</kbd> <kbd>N</kbd> Notifications</div>
            <div class="ll-help-row"><kbd>G</kbd> <kbd>J</kbd> Jobs</div>
            <div class="ll-help-row"><kbd>G</kbd> <kbd>P</kbd> My Profile</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.ll-help-close').addEventListener('click', () => {
      panel.classList.add('ll-hidden');
    });
  }

  function toggleShortcutHelp() {
    const panel = document.getElementById('ll-shortcut-help');
    if (panel) panel.classList.toggle('ll-hidden');
  }

  function closeAllPanels() {
    document.querySelectorAll('.ll-detail-panel').forEach(p => p.remove());
    const help = document.getElementById('ll-shortcut-help');
    if (help) help.classList.add('ll-hidden');
  }

  // ── Message handler from background ──
  function handleMessage(msg) {
    if (msg.type === 'SHOW_NUDGE') {
      showNudgeBanner(msg.minutes);
    }
    if (msg.type === 'SETTINGS_UPDATED') {
      settings = msg.settings;
    }
  }

  // ── Nudge Banner ──
  function showNudgeBanner(minutes) {
    const existing = document.querySelector('.ll-nudge-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'll-nudge-banner';
    banner.innerHTML = `
      <div class="ll-nudge-inner">
        <span class="ll-nudge-icon">⏱️</span>
        <span class="ll-nudge-text">You've been on LinkedIn for <strong>${minutes} minutes</strong>. Consider taking a break!</span>
        <button class="ll-nudge-dismiss">Got it</button>
        <button class="ll-nudge-snooze">+15 min</button>
      </div>
    `;

    banner.querySelector('.ll-nudge-dismiss').addEventListener('click', () => {
      banner.classList.add('ll-nudge-hide');
      setTimeout(() => banner.remove(), 300);
    });

    banner.querySelector('.ll-nudge-snooze').addEventListener('click', () => {
      banner.classList.add('ll-nudge-hide');
      setTimeout(() => banner.remove(), 300);
      showToast('⏱️ Snooze: next nudge in 15 minutes');
    });

    document.body.prepend(banner);
  }

  // ── Utility ──
  function sendMessage(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function debounce(fn, delay) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

  // ── Boot ──
  init();

})();