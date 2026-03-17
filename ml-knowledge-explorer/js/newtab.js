/* ── STATE ─────────────────────────────────────────────── */
let allData       = [];
let favorites     = [];
let notes         = {};
let currentCategory = "all";
let currentSearch   = "";
let quizQuestions   = [];
let quizIndex       = 0;
let quizScore       = 0;
let flashCards      = [];
let flashIndex      = 0;
let pendingUpdates  = [];

/* ── INIT ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    favorites          = await Storage.getFavorites();
    notes              = await Storage.getNotes();
    const customEntries = await Storage.getCustomEntries();
    allData            = [...ML_DATA, ...customEntries];

    const savedTheme = await Storage.getTheme();
    applyTheme(savedTheme);

    pendingUpdates = await Storage.getPendingUpdates();
    if (pendingUpdates.length > 0) showUpdateBanner(pendingUpdates.length);

    updateNetworkBadge();
    window.addEventListener("online",  updateNetworkBadge);
    window.addEventListener("offline", updateNetworkBadge);

    buildCategoryChips();
    renderList();
    updateStats();
    bindEvents();

  } catch (err) {
    console.error("ML Explorer init error:", err);
    showToast("⚠️ Error loading data. Please reload.");
  }
});

/* ── TOAST ─────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, duration = 2800) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), duration);
}

/* ── NETWORK BADGE ─────────────────────────────────────── */
function updateNetworkBadge() {
  const online = navigator.onLine;
  document.getElementById("onlineBadge").classList.toggle("hidden", !online);
  document.getElementById("offlineBadge").classList.toggle("hidden",  online);
}

/* ── THEME ─────────────────────────────────────────────── */
function applyTheme(theme) {
  document.body.classList.remove("dark", "light");
  document.body.classList.add(theme);
  document.getElementById("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
}

/* ── CATEGORY CHIPS ────────────────────────────────────── */
function buildCategoryChips() {
  const container = document.getElementById("filterChips");
  container.innerHTML = `<button class="chip active" data-cat="all">All</button>`;

  const cats = [...new Set(allData.map(d => d.category))];
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className     = "chip";
    btn.dataset.cat   = cat;
    btn.textContent   = cat;
    container.appendChild(btn);
  });

  const favChip = document.createElement("button");
  favChip.className   = "chip";
  favChip.dataset.cat = "__favorites";
  favChip.textContent = "⭐ Favorites";
  container.appendChild(favChip);

  container.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      renderList();
      updateStats();
    });
  });
}

/* ── FILTER ────────────────────────────────────────────── */
function getFilteredData() {
  let data = allData;

  if (currentCategory === "__favorites") {
    data = data.filter(d => favorites.includes(d.id));
  } else if (currentCategory !== "all") {
    data = data.filter(d => d.category === currentCategory);
  }

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    data = data.filter(d => d.name.toLowerCase().includes(q));
  }

  return data;
}

/* ── RENDER LIST ───────────────────────────────────────── */
function renderList() {
  const list  = document.getElementById("accordionList");
  const empty = document.getElementById("emptyState");
  const filtered = getFilteredData();

  list.innerHTML = "";

  if (filtered.length === 0) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  list.classList.remove("hidden");
  empty.classList.add("hidden");

  filtered.forEach(item => list.appendChild(buildAccordionItem(item)));
}

/* ── BUILD ACCORDION ITEM ──────────────────────────────── */
function buildAccordionItem(item) {
  const isFav    = favorites.includes(item.id);
  const userNote = notes[item.id] || "";
  const isOnline = navigator.onLine;

  const linksHtml = isOnline
    ? item.links.map(l =>
        `<a class="ext-link" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label} ↗</a>`
      ).join("")
    : `<span class="offline-note">🔌 Links available when online</span>`;

  const div = document.createElement("div");
  div.className    = [
    "accordion-item",
    isFav      ? "favorited" : "",
    item.isNew ? "is-new"    : ""
  ].filter(Boolean).join(" ");
  div.dataset.id = item.id;

  div.innerHTML = `
    <div class="accordion-header">
      <div class="accordion-left">
        <span class="accordion-name">${escapeHtml(item.name)}</span>
        <span class="accordion-cat">${escapeHtml(item.category)}</span>
        ${item.isNew ? '<span class="new-badge">NEW</span>' : ""}
      </div>
      <div class="accordion-right">
        <button class="fav-btn ${isFav ? "active" : ""}" title="Toggle Favorite">
          ${isFav ? "⭐" : "☆"}
        </button>
        <span class="chevron">▼</span>
      </div>
    </div>
    <div class="accordion-body">
      <div class="detail-section">
        <div class="detail-label">Definition</div>
        <p class="detail-text">${escapeHtml(item.definition)}</p>
      </div>
      <div class="detail-section">
        <div class="detail-label">Use Cases</div>
        <div class="tag-list">
          ${item.useCases.map(u => `<span class="tag">${escapeHtml(u)}</span>`).join("")}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Examples</div>
        <div class="tag-list">
          ${item.examples.map(e => `<span class="tag">${escapeHtml(e)}</span>`).join("")}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label">External Links</div>
        <div class="link-list">${linksHtml}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">My Notes</div>
        <textarea class="notes-area" placeholder="Add your personal notes here...">${escapeHtml(userNote)}</textarea>
        <div class="notes-row">
          <button class="notes-save-btn">Save Note</button>
          <span class="notes-saved" id="saved-${item.id}">✓ Saved</span>
        </div>
      </div>
    </div>
  `;

  /* Accordion toggle */
  div.querySelector(".accordion-header").addEventListener("click", e => {
    if (e.target.closest(".fav-btn")) return;
    div.classList.toggle("open");
  });

  /* Favorite toggle */
  div.querySelector(".fav-btn").addEventListener("click", async e => {
    e.stopPropagation();
    favorites = await Storage.toggleFavorite(item.id);
    const isFavNow = favorites.includes(item.id);
    const btn = div.querySelector(".fav-btn");
    btn.textContent = isFavNow ? "⭐" : "☆";
    btn.classList.toggle("active", isFavNow);
    div.classList.toggle("favorited", isFavNow);
    updateStats();
    showToast(isFavNow ? "⭐ Added to favorites" : "Removed from favorites");
  });

  /* Save note */
  div.querySelector(".notes-save-btn").addEventListener("click", async () => {
    const textarea = div.querySelector(".notes-area");
    const val = textarea.value;
    await Storage.saveNote(item.id, val);
    notes[item.id] = val;
    const savedEl = document.getElementById(`saved-${item.id}`);
    savedEl.classList.add("show");
    setTimeout(() => savedEl.classList.remove("show"), 2200);
  });

  return div;
}

/* ── HTML ESCAPE ───────────────────────────────────────── */
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── STATS ─────────────────────────────────────────────── */
function updateStats() {
  const filtered  = getFilteredData();
  const cats      = [...new Set(allData.map(d => d.category))];
  document.getElementById("statsTotal").textContent      = `${allData.length} types`;
  document.getElementById("statsCategories").textContent = `${cats.length} categories`;
  document.getElementById("statsFavorites").textContent  = `${favorites.length} favorites`;
  const filtEl = document.getElementById("statsFiltered");
  filtEl.textContent = filtered.length !== allData.length
    ? `Showing ${filtered.length}`
    : "";
}

/* ── UPDATE BANNER ─────────────────────────────────────── */
function showUpdateBanner(count) {
  document.getElementById("updateMsg").textContent =
    `🆕 ${count} new ML type${count > 1 ? "s" : ""} found. Review before adding.`;
  document.getElementById("updateBanner").classList.remove("hidden");
}

/* ── QUIZ ──────────────────────────────────────────────── */
function startQuiz() {
  quizQuestions = Quiz.generateQuestions(allData, 10);
  quizIndex     = 0;
  quizScore     = 0;
  renderQuizQuestion();
  openModal("quizModal");
}

function renderQuizQuestion() {
  const container = document.getElementById("quizContent");

  if (quizIndex >= quizQuestions.length) {
    renderQuizScore();
    return;
  }

  const q   = quizQuestions[quizIndex];
  const pct = (quizIndex / quizQuestions.length) * 100;

  container.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-progress">Question ${quizIndex + 1} of ${quizQuestions.length}</div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${pct}%"></div>
      </div>
      <p class="quiz-question">${escapeHtml(q.question)}</p>
      <div class="quiz-choices">
        ${q.choices.map(c =>
          `<button class="quiz-choice" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`
        ).join("")}
      </div>
      <div class="quiz-feedback hidden" id="quizFeedback"></div>
      <div class="quiz-nav">
        <button class="btn btn-primary btn-sm hidden" id="quizNextBtn">
          ${quizIndex + 1 === quizQuestions.length ? "See Results" : "Next →"}
        </button>
      </div>
    </div>
  `;

  container.querySelectorAll(".quiz-choice").forEach(btn => {
    btn.addEventListener("click", () => handleQuizAnswer(btn, q));
  });
}

function handleQuizAnswer(btn, q) {
  document.querySelectorAll(".quiz-choice").forEach(b => (b.disabled = true));

  const isCorrect = btn.dataset.choice === q.answer;
  if (isCorrect) {
    btn.classList.add("correct");
    quizScore++;
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".quiz-choice").forEach(b => {
      if (b.dataset.choice === q.answer) b.classList.add("correct");
    });
  }

  const fb = document.getElementById("quizFeedback");
  fb.className = `quiz-feedback ${isCorrect ? "correct-fb" : "wrong-fb"}`;
  fb.textContent = isCorrect
    ? `✅ Correct! ${q.item.definition.substring(0, 110)}...`
    : `❌ Correct answer: "${q.answer}". ${q.item.definition.substring(0, 110)}...`;
  fb.classList.remove("hidden");

  const nextBtn = document.getElementById("quizNextBtn");
  nextBtn.classList.remove("hidden");
  nextBtn.addEventListener("click", () => {
    quizIndex++;
    renderQuizQuestion();
  }, { once: true });
}

function renderQuizScore() {
  const pct = Math.round((quizScore / quizQuestions.length) * 100);
  const msg =
    pct === 100 ? "🏆 Perfect Score!"   :
    pct >= 80   ? "🌟 Excellent!"        :
    pct >= 60   ? "👍 Good Job!"         :
    pct >= 40   ? "📚 Keep Studying!"    : "🔁 Try Again!";

  document.getElementById("quizContent").innerHTML = `
    <div class="quiz-score-box">
      <div class="score-circle">
        <span class="score-num">${quizScore}</span>
        <span class="score-total">/ ${quizQuestions.length}</span>
      </div>
      <p class="score-msg">${msg}</p>
      <p class="score-sub">${pct}% accuracy</p>
      <button class="btn btn-primary" id="retryQuiz">🔁 Try Again</button>
    </div>
  `;
  document.getElementById("retryQuiz").addEventListener("click", startQuiz);
}

/* ── FLASHCARDS ────────────────────────────────────────── */
function startFlashcards() {
  flashCards = Quiz.generateFlashcards([...allData].sort(() => Math.random() - 0.5));
  flashIndex = 0;
  renderFlashcard();
  openModal("flashModal");
}

function renderFlashcard() {
  const card = flashCards[flashIndex];
  document.getElementById("flashContent").innerHTML = `
    <div class="flash-container">
      <p class="flash-hint">Click the card to flip</p>
      <p class="flash-counter">${flashIndex + 1} / ${flashCards.length}</p>
      <div class="flashcard" id="theFlashcard">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <h3>${escapeHtml(card.front)}</h3>
            <p>Tap to reveal definition &amp; examples</p>
          </div>
          <div class="flashcard-back">
            <p>${escapeHtml(card.back)}</p>
          </div>
        </div>
      </div>
      <div class="flash-nav">
        <button class="flash-nav-btn" id="flashPrev" ${flashIndex === 0 ? "disabled" : ""}>← Prev</button>
        <button class="flash-nav-btn" id="flashNext" ${flashIndex === flashCards.length - 1 ? "disabled" : ""}>Next →</button>
      </div>
    </div>
  `;

  document.getElementById("theFlashcard").addEventListener("click", () => {
    document.getElementById("theFlashcard").classList.toggle("flipped");
  });
  document.getElementById("flashPrev").addEventListener("click", () => { flashIndex--; renderFlashcard(); });
  document.getElementById("flashNext").addEventListener("click", () => { flashIndex++; renderFlashcard(); });
}

/* ── CHECK FOR UPDATES ─────────────────────────────────── */
async function checkForUpdates() {
  if (!navigator.onLine) {
    showToast("🔌 You are offline. Connect to check for updates.");
    return;
  }

  const btn = document.getElementById("btnUpdate");
  btn.textContent = "⏳ Checking...";
  btn.disabled    = true;

  try {
    const existingNames = allData.map(d => d.name);
    const found         = await Updater.checkForNewTypes(existingNames);

    if (found.length === 0) {
      showToast("✅ Knowledge base is up to date!");
    } else {
      pendingUpdates = found;
      await Storage.setPendingUpdates(pendingUpdates);
      showUpdateBanner(found.length);
      showToast(`🆕 ${found.length} new type${found.length > 1 ? "s" : ""} found!`);
    }
  } catch (err) {
    console.error("Update check error:", err);
    showToast("⚠️ Update check failed. Try again later.");
  } finally {
    btn.textContent = "🔄 Check Updates";
    btn.disabled    = false;
  }
}

/* ── UPDATE REVIEW MODAL ───────────────────────────────── */
function renderUpdateReview() {
  if (pendingUpdates.length === 0) {
    closeModal("updateModal");
    return;
  }

  document.getElementById("updateContent").innerHTML = `
    <div class="update-review-list">
      ${pendingUpdates.map((item, i) => `
        <div class="update-review-item">
          <div class="update-item-info">
            <div class="update-item-name">${escapeHtml(item.name)}</div>
            <div class="update-item-snippet">${escapeHtml(item.definition.substring(0, 160))}...</div>
          </div>
          <div class="update-item-actions">
            <button class="btn btn-primary btn-sm approve-btn" data-index="${i}">✓ Add</button>
            <button class="btn btn-secondary btn-sm reject-btn" data-index="${i}">✕ Skip</button>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="update-footer">
      <button class="btn btn-primary btn-sm" id="approveAll">✓ Add All</button>
      <button class="btn btn-secondary btn-sm" id="rejectAll">✕ Skip All</button>
    </div>
  `;

  document.querySelectorAll(".approve-btn").forEach(btn => {
    btn.addEventListener("click", () => approveUpdate(parseInt(btn.dataset.index)));
  });
  document.querySelectorAll(".reject-btn").forEach(btn => {
    btn.addEventListener("click", () => rejectUpdate(parseInt(btn.dataset.index)));
  });
  document.getElementById("approveAll").addEventListener("click", approveAllUpdates);
  document.getElementById("rejectAll").addEventListener("click",  rejectAllUpdates);

  openModal("updateModal");
}

async function approveUpdate(index) {
  const item   = pendingUpdates[index];
  const custom = await Storage.getCustomEntries();
  custom.push(item);
  await Storage.saveCustomEntries(custom);
  allData.push(item);
  pendingUpdates.splice(index, 1);
  await Storage.setPendingUpdates(pendingUpdates);
  buildCategoryChips();
  renderList();
  updateStats();
  showToast(`✅ "${item.name}" added!`);

  if (pendingUpdates.length === 0) {
    closeModal("updateModal");
    document.getElementById("updateBanner").classList.add("hidden");
  } else {
    renderUpdateReview();
  }
}

function rejectUpdate(index) {
  const name = pendingUpdates[index].name;
  pendingUpdates.splice(index, 1);
  Storage.setPendingUpdates(pendingUpdates);
  showToast(`Skipped "${name}"`);

  if (pendingUpdates.length === 0) {
    closeModal("updateModal");
    document.getElementById("updateBanner").classList.add("hidden");
  } else {
    renderUpdateReview();
  }
}

async function approveAllUpdates() {
  const custom = await Storage.getCustomEntries();
  pendingUpdates.forEach(item => { custom.push(item); allData.push(item); });
  await Storage.saveCustomEntries(custom);
  pendingUpdates = [];
  await Storage.clearPendingUpdates();
  buildCategoryChips();
  renderList();
  updateStats();
  closeModal("updateModal");
  document.getElementById("updateBanner").classList.add("hidden");
  showToast("✅ All new types added!");
}

async function rejectAllUpdates() {
  pendingUpdates = [];
  await Storage.clearPendingUpdates();
  closeModal("updateModal");
  document.getElementById("updateBanner").classList.add("hidden");
  showToast("All updates skipped.");
}

/* ── MODAL HELPERS ─────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

/* ── BIND EVENTS ───────────────────────────────────────── */
function bindEvents() {

  /* Search */
  const searchInput = document.getElementById("searchInput");
  const clearBtn    = document.getElementById("clearSearch");

  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    clearBtn.classList.toggle("hidden", !currentSearch);
    renderList();
    updateStats();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearch     = "";
    clearBtn.classList.add("hidden");
    renderList();
    updateStats();
    searchInput.focus();
  });

  /* Theme */
  document.getElementById("themeToggle").addEventListener("click", async () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    await Storage.setTheme(next);
  });

  /* Quiz */
  document.getElementById("btnQuiz").addEventListener("click", startQuiz);

  /* Flashcards */
  document.getElementById("btnFlash").addEventListener("click", startFlashcards);

  /* Check Updates */
  document.getElementById("btnUpdate").addEventListener("click", checkForUpdates);

  /* Export dropdown toggle */
  const exportMenu = document.getElementById("exportMenu");
  document.getElementById("btnExport").addEventListener("click", e => {
    e.stopPropagation();
    exportMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".export-wrapper")) exportMenu.classList.add("hidden");
  });

  /* Export actions */
  document.getElementById("exportJSON").addEventListener("click", () => {
    Exporter.toJSON(allData, notes);
    exportMenu.classList.add("hidden");
    showToast("📄 JSON exported!");
  });
  document.getElementById("exportMD").addEventListener("click", () => {
    Exporter.toMarkdown(allData, notes);
    exportMenu.classList.add("hidden");
    showToast("📝 Markdown exported!");
  });
  document.getElementById("exportPDF").addEventListener("click", () => {
    Exporter.toPDF(allData, notes);
    exportMenu.classList.add("hidden");
  });

  /* Update banner */
  document.getElementById("btnReviewUpdates").addEventListener("click", renderUpdateReview);
  document.getElementById("btnDismissUpdate").addEventListener("click", () => {
    document.getElementById("updateBanner").classList.add("hidden");
  });

  /* Modal close buttons */
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.modal));
  });

  /* Close modal on backdrop click */
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  /* Keyboard: Escape closes modals */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal:not(.hidden)").forEach(m => closeModal(m.id));
      exportMenu.classList.add("hidden");
    }
  });

  /* Clear filters button (empty state) */
  document.getElementById("clearFilters").addEventListener("click", () => {
    currentSearch   = "";
    currentCategory = "all";
    document.getElementById("searchInput").value = "";
    document.getElementById("clearSearch").classList.add("hidden");
    document.querySelectorAll(".chip").forEach(c =>
      c.classList.toggle("active", c.dataset.cat === "all")
    );
    renderList();
    updateStats();
  });
}