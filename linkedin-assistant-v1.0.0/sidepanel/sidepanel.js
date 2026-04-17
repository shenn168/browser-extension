/*  ================================================
    LinkedLens — Side Panel (Library) Script
    ================================================ */

(function () {
  'use strict';

  let library = [];
  let filteredLibrary = [];

  // ── Init ──
  async function init() {
    library = await sendMessage({ type: 'GET_LIBRARY' }) || [];
    filteredLibrary = [...library];
    render();
    bindEvents();

    // Refresh periodically
    setInterval(async () => {
      library = await sendMessage({ type: 'GET_LIBRARY' }) || [];
      applyFilters();
    }, 5000);
  }

  // ── Render ──
  function render() {
    const listEl = document.getElementById('sp-list');
    const emptyEl = document.getElementById('sp-empty');
    const countEl = document.getElementById('sp-count');

    countEl.textContent = `${filteredLibrary.length} post${filteredLibrary.length !== 1 ? 's' : ''}`;

    if (filteredLibrary.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('ll-hidden');
      return;
    }

    emptyEl.classList.add('ll-hidden');

    listEl.innerHTML = filteredLibrary.map(post => `
      <div class="ll-sp-card" data-id="${post.id}">
        <div class="ll-sp-card-header">
          <div class="ll-sp-card-author">${escapeHtml(post.author)}</div>
          <div class="ll-sp-card-meta">
            <span class="ll-sp-card-cat">${post.category}</span>
            <span class="ll-sp-card-date">${formatDate(post.savedAt)}</span>
          </div>
        </div>
        ${post.headline ? `<div class="ll-sp-card-headline">${escapeHtml(post.headline)}</div>` : ''}
        <div class="ll-sp-card-content">${escapeHtml(truncate(post.content, 250))}</div>
        <div class="ll-sp-card-notes">
          <textarea class="ll-sp-notes-input" placeholder="Add notes..." data-id="${post.id}">${escapeHtml(post.notes || '')}</textarea>
        </div>
        <div class="ll-sp-card-actions">
          ${post.url ? `<a href="${escapeHtml(post.url)}" target="_blank" class="ll-sp-btn ll-sp-btn-link">🔗 Open</a>` : ''}
          <button class="ll-sp-btn ll-sp-btn-expand" data-id="${post.id}">📄 Full text</button>
          <button class="ll-sp-btn ll-sp-btn-delete" data-id="${post.id}">🗑️ Delete</button>
        </div>
        <div class="ll-sp-card-full ll-hidden" data-full-id="${post.id}">
          <div class="ll-sp-full-content">${escapeHtml(post.content)}</div>
        </div>
      </div>
    `).join('');

    bindCardEvents();
  }

  // ── Card Events ──
  function bindCardEvents() {
    // Delete buttons
    document.querySelectorAll('.ll-sp-btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await sendMessage({ type: 'DELETE_POST', id });
        library = library.filter(p => p.id !== id);
        applyFilters();
      });
    });

    // Expand buttons
    document.querySelectorAll('.ll-sp-btn-expand').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const fullEl = document.querySelector(`[data-full-id="${id}"]`);
        if (fullEl) {
          fullEl.classList.toggle('ll-hidden');
          btn.textContent = fullEl.classList.contains('ll-hidden') ? '📄 Full text' : '📄 Collapse';
        }
      });
    });

    // Notes auto-save
    document.querySelectorAll('.ll-sp-notes-input').forEach(textarea => {
      let saveTimer;
      textarea.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const id = textarea.dataset.id;
          const post = library.find(p => p.id === id);
          if (post) {
            post.notes = textarea.value;
            await chrome.storage.local.set({ ll_library: library });
          }
        }, 800);
      });
    });
  }

  // ── Filters ──
  function applyFilters() {
    const search = document.getElementById('sp-search').value.toLowerCase().trim();
    const category = document.getElementById('sp-category').value;
    const sort = document.getElementById('sp-sort').value;

    filteredLibrary = library.filter(post => {
      if (category !== 'all' && post.category !== category) return false;
      if (search) {
        const haystack = (post.author + ' ' + post.content + ' ' + post.notes + ' ' + post.headline).toLowerCase();
        return haystack.includes(search);
      }
      return true;
    });

    // Sort
    if (sort === 'newest') {
      filteredLibrary.sort((a, b) => b.savedAt - a.savedAt);
    } else if (sort === 'oldest') {
      filteredLibrary.sort((a, b) => a.savedAt - b.savedAt);
    } else if (sort === 'author') {
      filteredLibrary.sort((a, b) => a.author.localeCompare(b.author));
    }

    render();
  }

  // ── Bind top-level events ──
  function bindEvents() {
    let searchTimer;
    document.getElementById('sp-search').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 300);
    });
    document.getElementById('sp-category').addEventListener('change', applyFilters);
    document.getElementById('sp-sort').addEventListener('change', applyFilters);
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

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;

    if (diff < 3600000) return Math.round(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.round(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Boot ──
  init();
})();