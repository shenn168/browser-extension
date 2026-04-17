/*  ================================================
    LinkedLens — Content Script (Fixed)
    Injected into linkedin.com pages
    ================================================ */

(function () {
  'use strict';

  // Prevent double-init
  if (window.__linkedLensInit) return;
  window.__linkedLensInit = true;

  var settings = {};
  var currentPostIndex = 0;
  var shortcutBuffer = '';
  var shortcutTimer = null;
  var scanDebounceTimer = null;
  var isInitialized = false;

  // ── Initialize ──
  async function init() {
    try {
      console.log('[LinkedLens] Initializing...');

      settings = await sendMessage({ type: 'GET_SETTINGS' });
      if (!settings || typeof settings !== 'object') {
        console.warn('[LinkedLens] Settings not loaded, using defaults');
        settings = {
          sentimentEnabled: true,
          bookmarkSnapshot: true,
          keyboardShortcuts: true,
          nudgeAfterMinutes: 45,
          nudgeType: 'banner',
          nudgeEnabled: true,
          badgeStyle: 'pill'
        };
      }

      // Start time tracking session
      sendMessage({ type: 'START_SESSION' });

      // Wait for feed to load, then scan
      waitForFeed(function () {
        console.log('[LinkedLens] Feed detected, scanning...');
        scanFeed();
        observeFeed();
        isInitialized = true;
      });

      // Keyboard shortcuts
      if (settings.keyboardShortcuts !== false) {
        initKeyboardShortcuts();
      }

      // Listen for messages from background
      chrome.runtime.onMessage.addListener(handleMessage);

      // End session on unload
      window.addEventListener('beforeunload', function () {
        sendMessage({ type: 'END_SESSION' });
      });

      injectShortcutHelpPanel();

      console.log('[LinkedLens] Init complete. Sentiment:', settings.sentimentEnabled !== false);
    } catch (e) {
      console.error('[LinkedLens] Init error:', e);
    }
  }

  // ── Wait for the feed to actually render ──
  function waitForFeed(callback) {
    var attempts = 0;
    var maxAttempts = 30; // 30 seconds max

    function check() {
      attempts++;
      var posts = LLParser.getPosts();
      if (posts.length > 0) {
        callback();
        return;
      }
      if (attempts >= maxAttempts) {
        console.warn('[LinkedLens] Feed not found after ' + maxAttempts + ' attempts, setting up observer anyway');
        callback();
        return;
      }
      setTimeout(check, 1000);
    }

    check();
  }

  // ── Feed Scanner ──
  function scanFeed() {
    if (settings.sentimentEnabled === false) {
      return;
    }

    var posts = LLParser.getPosts();
    var newBadges = 0;

    posts.forEach(function (postEl) {
      if (LLParser.hasBadge(postEl)) return;

      var data = LLParser.extractPostData(postEl);
      if (!data.content || data.content.length < 15) return;

      var sentiment = LLSentiment.analyze(data.content);
      var readability = LLSentiment.readability(data.content);

      injectSentimentBadge(postEl, sentiment, readability, data);
      newBadges++;
    });

    if (newBadges > 0) {
      sendMessage({ type: 'INCREMENT_STAT', key: 'postsAnalyzed', value: newBadges });
      console.log('[LinkedLens] Scanned ' + newBadges + ' new posts');
    }
  }

  // ── Inject Sentiment Badge ──
  function injectSentimentBadge(postEl, sentiment, readability, postData) {
    // Double-check we haven't already placed a badge
    if (postEl.querySelector('.ll-sentiment-badge')) return;

    var badge = document.createElement('div');
    badge.className = 'll-sentiment-badge';

    var colors = {
      positive: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32', emoji: '🟢' },
      neutral: { bg: '#fff8e1', border: '#ffc107', text: '#f57f17', emoji: '🟡' },
      negative: { bg: '#fce4ec', border: '#f44336', text: '#c62828', emoji: '🔴' }
    };

    var c = colors[sentiment.label] || colors.neutral;
    var scoreDisplay = sentiment.normalized > 0 ? '+' + sentiment.normalized : String(sentiment.normalized);

    badge.innerHTML =
      '<div class="ll-badge-pill" style="background:' + c.bg + ';border:1px solid ' + c.border + ';color:' + c.text + '">' +
        '<span class="ll-badge-emoji">' + c.emoji + '</span>' +
        '<span class="ll-badge-label">' + sentiment.label + '</span>' +
        '<span class="ll-badge-score">' + scoreDisplay + '</span>' +
        '<span class="ll-badge-divider">|</span>' +
        '<span class="ll-badge-read">📖 ' + readability.readTime + 'm read</span>' +
        '<span class="ll-badge-divider">|</span>' +
        '<span class="ll-badge-level">' + readability.level + '</span>' +
        '<button class="ll-save-btn" title="Save to library">🔖</button>' +
        '<button class="ll-detail-btn" title="View details">📊</button>' +
      '</div>';

    // Save button handler
    var saveBtn = badge.querySelector('.ll-save-btn');
    saveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      var btn = this;

      sendMessage({
        type: 'SAVE_POST',
        payload: {
          author: postData.author,
          headline: postData.headline,
          content: postData.content,
          url: postData.url
        }
      }).then(function (result) {
        if (result && result.ok) {
          btn.textContent = '✅';
          btn.style.cursor = 'default';
          btn.disabled = true;
          showToast('Post saved to library!');
        } else if (result && result.reason === 'duplicate') {
          btn.textContent = '📌';
          showToast('Already saved!');
        } else {
          console.error('[LinkedLens] Save failed:', result);
          showToast('Save failed — try again');
        }
      }).catch(function (err) {
        console.error('[LinkedLens] Save error:', err);
        showToast('Save error — try again');
      });
    });

    // Detail button handler
    var detailBtn = badge.querySelector('.ll-detail-btn');
    detailBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      showDetailPanel(postEl, postData, sentiment, readability);
    });

    // Find the best insertion point
    var inserted = false;
    var insertSelectors = [
      '.feed-shared-update-v2__description',
      '.update-components-text',
      '.feed-shared-text',
      '.feed-shared-inline-show-more-text',
      'div.feed-shared-update-v2__description-wrapper'
    ];

    for (var i = 0; i < insertSelectors.length; i++) {
      var textContainer = postEl.querySelector(insertSelectors[i]);
      if (textContainer && textContainer.parentElement) {
        textContainer.parentElement.insertBefore(badge, textContainer.nextSibling);
        inserted = true;
        break;
      }
    }

    // Fallback: find the largest text span and insert after its parent
    if (!inserted) {
      var spans = postEl.querySelectorAll('span[dir="ltr"], span.break-words');
      var bestSpan = null;
      var bestLen = 0;
      spans.forEach(function (s) {
        if (s.textContent.length > bestLen) {
          bestLen = s.textContent.length;
          bestSpan = s;
        }
      });
      if (bestSpan && bestSpan.parentElement) {
        var parentBlock = bestSpan.closest('div') || bestSpan.parentElement;
        if (parentBlock && parentBlock.parentElement) {
          parentBlock.parentElement.insertBefore(badge, parentBlock.nextSibling);
          inserted = true;
        }
      }
    }

    // Last resort: prepend to post
    if (!inserted) {
      postEl.prepend(badge);
    }
  }

  // ── Detail Panel ──
  function showDetailPanel(postEl, postData, sentiment, readability) {
    // Remove any existing detail panel in this post
    var existing = postEl.querySelector('.ll-detail-panel');
    if (existing) {
      existing.remove();
      return; // Toggle off
    }

    var panel = document.createElement('div');
    panel.className = 'll-detail-panel';

    var topWords = sentiment.words
      .sort(function (a, b) { return Math.abs(b.score) - Math.abs(a.score); })
      .slice(0, 6)
      .map(function (w) {
        var cls = w.score > 0 ? 'll-word-pos' : w.score < 0 ? 'll-word-neg' : 'll-word-neu';
        var scoreStr = w.score > 0 ? '+' + w.score : String(w.score);
        return '<span class="ll-word-chip ' + cls + '">' + escapeHtml(w.word) + ' (' + scoreStr + ')</span>';
      })
      .join('');

    var confidencePct = Math.round(sentiment.confidence * 100);

    panel.innerHTML =
      '<div class="ll-detail-inner">' +
        '<div class="ll-detail-header">' +
          '<h4>📊 LinkedLens Analysis</h4>' +
          '<button class="ll-detail-close">✕</button>' +
        '</div>' +
        '<div class="ll-detail-grid">' +
          '<div class="ll-detail-card">' +
            '<div class="ll-detail-card-title">Sentiment</div>' +
            '<div class="ll-detail-card-value ll-sentiment-' + sentiment.label + '">' + sentiment.label.toUpperCase() + '</div>' +
            '<div class="ll-detail-card-sub">Score: ' + sentiment.normalized + ' | Confidence: ' + confidencePct + '%</div>' +
          '</div>' +
          '<div class="ll-detail-card">' +
            '<div class="ll-detail-card-title">Readability</div>' +
            '<div class="ll-detail-card-value">' + readability.level + '</div>' +
            '<div class="ll-detail-card-sub">Grade ' + readability.grade + ' | Ease ' + readability.ease + '/100</div>' +
          '</div>' +
          '<div class="ll-detail-card">' +
            '<div class="ll-detail-card-title">Stats</div>' +
            '<div class="ll-detail-card-value">' + readability.wordCount + ' words</div>' +
            '<div class="ll-detail-card-sub">' + readability.sentenceCount + ' sentences | ~' + readability.readTime + 'm read</div>' +
          '</div>' +
        '</div>' +
        '<div class="ll-detail-words">' +
          '<div class="ll-detail-card-title">Key Signal Words</div>' +
          '<div class="ll-word-chips">' + (topWords || '<em>No strong signals detected</em>') + '</div>' +
        '</div>' +
        '<div class="ll-detail-content-preview">' +
          '<div class="ll-detail-card-title">Author</div>' +
          '<div>' + escapeHtml(postData.author) + (postData.headline ? ' — ' + escapeHtml(postData.headline) : '') + '</div>' +
        '</div>' +
      '</div>';

    panel.querySelector('.ll-detail-close').addEventListener('click', function () {
      panel.remove();
    });

    // Insert panel inside the post element
    var badge = postEl.querySelector('.ll-sentiment-badge');
    if (badge && badge.parentElement) {
      badge.parentElement.insertBefore(panel, badge.nextSibling);
    } else {
      postEl.appendChild(panel);
    }
  }

  // ── Toast Notification ──
  function showToast(message, duration) {
    duration = duration || 2500;
    var existing = document.querySelector('.ll-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'll-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Force reflow, then animate
    toast.offsetHeight;
    toast.classList.add('ll-toast-show');

    setTimeout(function () {
      toast.classList.remove('ll-toast-show');
      setTimeout(function () { toast.remove(); }, 300);
    }, duration);
  }

  // ── Feed Observer ──
  function observeFeed() {
    var container = LLParser.getFeedContainer();
    if (!container) {
      console.warn('[LinkedLens] Could not find feed container for observer');
      return;
    }

    var observer = new MutationObserver(function () {
      clearTimeout(scanDebounceTimer);
      scanDebounceTimer = setTimeout(function () {
        scanFeed();
      }, 800);
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    console.log('[LinkedLens] Feed observer attached to:', container.className || container.tagName);

    // Also scan on scroll (catches lazy-loaded posts)
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        scanFeed();
      }, 500);
    }, { passive: true });
  }

  // ── Keyboard Shortcuts ──
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      // Ignore when typing in inputs
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      var key = e.key.toLowerCase();

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
        shortcutTimer = setTimeout(function () { shortcutBuffer = ''; }, 800);
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
    var posts = LLParser.getPosts();
    if (!posts.length) return;

    currentPostIndex = LLParser.getCurrentPostIndex(posts);
    currentPostIndex = Math.max(0, Math.min(posts.length - 1, currentPostIndex + direction));

    var targetPost = posts[currentPostIndex];
    targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Visual highlight
    document.querySelectorAll('.ll-post-focus').forEach(function (el) {
      el.classList.remove('ll-post-focus');
    });
    targetPost.classList.add('ll-post-focus');
    setTimeout(function () { targetPost.classList.remove('ll-post-focus'); }, 2000);
  }

  function interactCurrentPost(action) {
    var posts = LLParser.getPosts();
    if (!posts.length) return;

    currentPostIndex = LLParser.getCurrentPostIndex(posts);
    var post = posts[currentPostIndex];

    if (action === 'like') {
      var likeBtn = post.querySelector(
        'button[aria-label*="Like"], ' +
        'button[aria-label*="like"], ' +
        '.reactions-react-button button, ' +
        'button.react-button__trigger, ' +
        'button[data-reaction-type="LIKE"], ' +
        'span.reactions-react-button button'
      );
      if (likeBtn) {
        likeBtn.click();
        showToast('👍 Liked!');
      }
    }

    if (action === 'comment') {
      var commentBtn = post.querySelector(
        'button[aria-label*="Comment"], ' +
        'button[aria-label*="comment"], ' +
        'button.comment-button, ' +
        'button.social-actions-button[aria-label*="comment"]'
      );
      if (commentBtn) {
        commentBtn.click();
        showToast('💬 Comment box opened');
      }
    }
  }

  async function saveCurrentPost() {
    var posts = LLParser.getPosts();
    if (!posts.length) return;

    currentPostIndex = LLParser.getCurrentPostIndex(posts);
    var post = posts[currentPostIndex];
    var data = LLParser.extractPostData(post);

    if (!data.content || data.content.length < 10) {
      showToast('⚠️ No content to save');
      return;
    }

    var result = await sendMessage({
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
      var btn = post.querySelector('.ll-save-btn');
      if (btn) {
        btn.textContent = '✅';
        btn.disabled = true;
      }
    } else if (result && result.reason === 'duplicate') {
      showToast('📌 Already saved!');
    } else {
      showToast('Save failed — try again');
    }
  }

  function handleGoShortcut(key) {
    var routes = {
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
    var searchInput = document.querySelector(
      'input[aria-label*="Search"], ' +
      'input[placeholder*="Search"], ' +
      '.search-global-typeahead__input'
    );
    if (searchInput) {
      searchInput.focus();
    }
  }

  // ── Shortcut Help Panel ──
  function injectShortcutHelpPanel() {
    if (document.getElementById('ll-shortcut-help')) return;

    var panel = document.createElement('div');
    panel.id = 'll-shortcut-help';
    panel.className = 'll-shortcut-help ll-hidden';
    panel.innerHTML =
      '<div class="ll-help-inner">' +
        '<div class="ll-help-header">' +
          '<h3>⌨️ LinkedLens Shortcuts</h3>' +
          '<button class="ll-help-close">✕</button>' +
        '</div>' +
        '<div class="ll-help-grid">' +
          '<div class="ll-help-group">' +
            '<h4>Navigation</h4>' +
            '<div class="ll-help-row"><kbd>J</kbd> Next post</div>' +
            '<div class="ll-help-row"><kbd>K</kbd> Previous post</div>' +
            '<div class="ll-help-row"><kbd>/</kbd> Focus search</div>' +
            '<div class="ll-help-row"><kbd>Esc</kbd> Close panels</div>' +
          '</div>' +
          '<div class="ll-help-group">' +
            '<h4>Actions</h4>' +
            '<div class="ll-help-row"><kbd>L</kbd> Like current post</div>' +
            '<div class="ll-help-row"><kbd>C</kbd> Comment on post</div>' +
            '<div class="ll-help-row"><kbd>S</kbd> Save to library</div>' +
            '<div class="ll-help-row"><kbd>?</kbd> Toggle this help</div>' +
          '</div>' +
          '<div class="ll-help-group">' +
            '<h4>Go To (press G then...)</h4>' +
            '<div class="ll-help-row"><kbd>G</kbd> <kbd>H</kbd> Home feed</div>' +
            '<div class="ll-help-row"><kbd>G</kbd> <kbd>M</kbd> Messages</div>' +
            '<div class="ll-help-row"><kbd>G</kbd> <kbd>N</kbd> Notifications</div>' +
            '<div class="ll-help-row"><kbd>G</kbd> <kbd>J</kbd> Jobs</div>' +
            '<div class="ll-help-row"><kbd>G</kbd> <kbd>P</kbd> My Profile</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    panel.querySelector('.ll-help-close').addEventListener('click', function () {
      panel.classList.add('ll-hidden');
    });

    // Close on clicking backdrop
    panel.addEventListener('click', function (e) {
      if (e.target === panel) {
        panel.classList.add('ll-hidden');
      }
    });
  }

  function toggleShortcutHelp() {
    var panel = document.getElementById('ll-shortcut-help');
    if (panel) panel.classList.toggle('ll-hidden');
  }

  function closeAllPanels() {
    document.querySelectorAll('.ll-detail-panel').forEach(function (p) { p.remove(); });
    var help = document.getElementById('ll-shortcut-help');
    if (help) help.classList.add('ll-hidden');
  }

  // ── Message handler from background ──
  function handleMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'SHOW_NUDGE') {
      showNudgeBanner(msg.minutes);
    }
    if (msg.type === 'SETTINGS_UPDATED') {
      settings = msg.settings;
    }
  }

  // ── Nudge Banner ──
  function showNudgeBanner(minutes) {
    var existing = document.querySelector('.ll-nudge-banner');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.className = 'll-nudge-banner';
    banner.innerHTML =
      '<div class="ll-nudge-inner">' +
        '<span class="ll-nudge-icon">⏱️</span>' +
        '<span class="ll-nudge-text">You\'ve been on LinkedIn for <strong>' + minutes + ' minutes</strong>. Consider taking a break!</span>' +
        '<button class="ll-nudge-dismiss">Got it</button>' +
        '<button class="ll-nudge-snooze">+15 min</button>' +
      '</div>';

    banner.querySelector('.ll-nudge-dismiss').addEventListener('click', function () {
      banner.classList.add('ll-nudge-hide');
      setTimeout(function () { banner.remove(); }, 300);
    });

    banner.querySelector('.ll-nudge-snooze').addEventListener('click', function () {
      banner.classList.add('ll-nudge-hide');
      setTimeout(function () { banner.remove(); }, 300);
      showToast('⏱️ Snooze: next nudge in 15 minutes');
    });

    document.body.prepend(banner);
  }

  // ── Utility: Send message to background ──
  function sendMessage(msg) {
    return new Promise(function (resolve) {
      try {
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
          console.warn('[LinkedLens] Runtime not available');
          resolve(null);
          return;
        }
        chrome.runtime.sendMessage(msg, function (response) {
          if (chrome.runtime.lastError) {
            console.warn('[LinkedLens] sendMessage error:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        console.warn('[LinkedLens] sendMessage exception:', e);
        resolve(null);
      }
    });
  }

  // ── Utility: Escape HTML ──
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();