/*  ================================================
    LinkedLens — Side Panel (Library) Script (Fixed)
    ================================================ */

(function () {
  'use strict';

  var library = [];
  var filteredLibrary = [];

  // ── Init ──
  async function init() {
    library = await sendMessage({ type: 'GET_LIBRARY' });
    if (!Array.isArray(library)) library = [];
    filteredLibrary = library.slice();
    render();
    bindEvents();

    // Refresh periodically
    setInterval(async function () {
      var fresh = await sendMessage({ type: 'GET_LIBRARY' });
      if (Array.isArray(fresh)) {
        library = fresh;
        applyFilters();
      }
    }, 3000);
  }

  // ── Render ──
  function render() {
    var listEl = document.getElementById('sp-list');
    var emptyEl = document.getElementById('sp-empty');
    var countEl = document.getElementById('sp-count');

    countEl.textContent = filteredLibrary.length + ' post' + (filteredLibrary.length !== 1 ? 's' : '');

    if (filteredLibrary.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('ll-hidden');
      return;
    }

    emptyEl.classList.add('ll-hidden');

    var html = '';
    for (var i = 0; i < filteredLibrary.length; i++) {
      var post = filteredLibrary[i];
      var hasUrl = post.url && post.url.length > 0 && !post.url.includes('#ll-');

      html +=
        '<div class="ll-sp-card" data-id="' + escapeAttr(post.id) + '">' +
          '<div class="ll-sp-card-header">' +
            '<div class="ll-sp-card-author">' + escapeHtml(post.author) + '</div>' +
            '<div class="ll-sp-card-meta">' +
              '<span class="ll-sp-card-cat">' + escapeHtml(post.category) + '</span>' +
              '<span class="ll-sp-card-date">' + formatDate(post.savedAt) + '</span>' +
            '</div>' +
          '</div>' +
          (post.headline ? '<div class="ll-sp-card-headline">' + escapeHtml(post.headline) + '</div>' : '') +
          '<div class="ll-sp-card-content">' + escapeHtml(truncate(post.content, 250)) + '</div>' +
          '<div class="ll-sp-card-notes">' +
            '<textarea class="ll-sp-notes-input" placeholder="Add notes..." data-id="' + escapeAttr(post.id) + '">' + escapeHtml(post.notes || '') + '</textarea>' +
          '</div>' +
          '<div class="ll-sp-card-actions">' +
            (hasUrl ? '<a href="' + escapeAttr(post.url) + '" target="_blank" rel="noopener" class="ll-sp-btn ll-sp-btn-link">🔗 Open</a>' : '') +
            '<button class="ll-sp-btn ll-sp-btn-expand" data-id="' + escapeAttr(post.id) + '">📄 Full text</button>' +
            '<button class="ll-sp-btn ll-sp-btn-delete" data-id="' + escapeAttr(post.id) + '">🗑️ Delete</button>' +
          '</div>' +
          '<div class="ll-sp-card-full ll-hidden" data-full-id="' + escapeAttr(post.id) + '">' +
            '<div class="ll-sp-full-content">' + escapeHtml(post.content) + '</div>' +
          '</div>' +
        '</div>';
    }

    listEl.innerHTML = html;
    bindCardEvents();
  }

  // ── Card Events ──
  function bindCardEvents() {
    // Delete buttons
    var deleteBtns = document.querySelectorAll('.ll-sp-btn-delete');
    for (var i = 0; i < deleteBtns.length; i++) {
      deleteBtns[i].addEventListener('click', handleDelete);
    }

    // Expand buttons
    var expandBtns = document.querySelectorAll('.ll-sp-btn-expand');
    for (var j = 0; j < expandBtns.length; j++) {
      expandBtns[j].addEventListener('click', handleExpand);
    }

    // Notes auto-save
    var textareas = document.querySelectorAll('.ll-sp-notes-input');
    for (var k = 0; k < textareas.length; k++) {
      textareas[k].addEventListener('input', handleNotesInput);
    }
  }

  function handleDelete(e) {
    var id = e.currentTarget.dataset.id;
    sendMessage({ type: 'DELETE_POST', id: id }).then(function () {
      library = library.filter(function (p) { return p.id !== id; });
      applyFilters();
    });
  }

  function handleExpand(e) {
    var id = e.currentTarget.dataset.id;
    var fullEl = document.querySelector('[data-full-id="' + id + '"]');
    if (fullEl) {
      fullEl.classList.toggle('ll-hidden');
      e.currentTarget.textContent = fullEl.classList.contains('ll-hidden') ? '📄 Full text' : '📄 Collapse';
    }
  }

  var notesSaveTimers = {};
  function handleNotesInput(e) {
    var textarea = e.currentTarget;
    var id = textarea.dataset.id;

    clearTimeout(notesSaveTimers[id]);
    notesSaveTimers[id] = setTimeout(function () {
      var post = library.find(function (p) { return p.id === id; });
      if (post) {
        post.notes = textarea.value;
        sendMessage({ type: 'UPDATE_POST_NOTES', id: id, notes: textarea.value });
      }
    }, 800);
  }

  // ── Filters ──
  function applyFilters() {
    var search = document.getElementById('sp-search').value.toLowerCase().trim();
    var category = document.getElementById('sp-category').value;
    var sort = document.getElementById('sp-sort').value;

    filteredLibrary = library.filter(function (post) {
      if (category !== 'all' && post.category !== category) return false;
      if (search) {
        var haystack = ((post.author || '') + ' ' + (post.content || '') + ' ' + (post.notes || '') + ' ' + (post.headline || '')).toLowerCase();
        return haystack.indexOf(search) !== -1;
      }
      return true;
    });

    // Sort
    if (sort === 'newest') {
      filteredLibrary.sort(function (a, b) { return b.savedAt - a.savedAt; });
    } else if (sort === 'oldest') {
      filteredLibrary.sort(function (a, b) { return a.savedAt - b.savedAt; });
    } else if (sort === 'author') {
      filteredLibrary.sort(function (a, b) { return (a.author || '').localeCompare(b.author || ''); });
    }

    render();
  }

  // ── Bind top-level events ──
  function bindEvents() {
    var searchTimer;
    document.getElementById('sp-search').addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 300);
    });
    document.getElementById('sp-category').addEventListener('change', applyFilters);
    document.getElementById('sp-sort').addEventListener('change', applyFilters);
  }

  // ── Helpers ──
  function sendMessage(msg) {
    return new Promise(function (resolve) {
      try {
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
          resolve(null);
          return;
        }
        chrome.runtime.sendMessage(msg, function (response) {
          if (chrome.runtime.lastError) {
            console.warn('[LinkedLens] sidepanel sendMessage error:', chrome.runtime.lastError.message);
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

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    var d = new Date(timestamp);
    var now = new Date();
    var diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.round(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.round(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();