// =============================================
// Chart Whisperer — Popup Script
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  initSettings();
  initDepthSelector();
  initActions();
  initHistory();
  initSettingsPanel();
});

// ---- Load Settings ----
function initSettings() {
  chrome.storage.local.get("cw_settings", (result) => {
    const settings = result.cw_settings || {};

    const apiKeyInput = document.getElementById("api-key");
    const modelSelect = document.getElementById("model-select");
    const saveHistoryCheckbox = document.getElementById("save-history");

    if (settings.apiKey) {
      apiKeyInput.value = settings.apiKey;
    }
    if (settings.model) {
      modelSelect.value = settings.model;
    }
    if (settings.history !== undefined) {
      saveHistoryCheckbox.checked = settings.history;
    }

    // Show warning if no API key
    if (!settings.apiKey) {
      document.getElementById("settings-panel").style.display = "flex";
      document.getElementById("settings-toggle-icon").textContent = "▲";
    }
  });
}

// ---- Depth Selector ----
function initDepthSelector() {
  const buttons = document.querySelectorAll(".cw-depth-btn");

  // Load saved depth
  chrome.storage.local.get("cw_settings", (result) => {
    const depth = result.cw_settings?.analysisDepth || "standard";
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.depth === depth);
    });
  });

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      chrome.storage.local.get("cw_settings", (result) => {
        const settings = result.cw_settings || {};
        settings.analysisDepth = btn.dataset.depth;
        chrome.storage.local.set({ cw_settings: settings });
      });
    });
  });
}

// ---- Quick Actions ----
function initActions() {
  // Select Area button
  document.getElementById("btn-select-area").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          window.postMessage({ type: "CW_ACTIVATE_SELECTOR" }, "*");
        }
      });
      window.close();
    }
  });

  // Paste from Clipboard
  document.getElementById("btn-paste-image").addEventListener("click", async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result;
              chrome.storage.local.set({
                cw_current_analysis: {
                  imageBase64: base64,
                  imageUrl: null,
                  sourceUrl: "clipboard",
                  sourceTitle: "Pasted Image",
                  timestamp: Date.now(),
                  status: "pending"
                }
              });

              chrome.runtime.sendMessage({
                action: "start-analysis",
                data: {
                  imageBase64: base64,
                  sourceUrl: "clipboard",
                  sourceTitle: "Pasted Image"
                }
              });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      alert("No image found in clipboard. Copy a chart image first!");
    } catch (error) {
      alert("Could not access clipboard. Please allow clipboard permissions.");
    }
  });
}

// ---- History ----
function initHistory() {
  loadHistory();

  document.getElementById("btn-clear-history").addEventListener("click", () => {
    chrome.storage.local.set({ cw_history: [] });
    loadHistory();
  });
}

function loadHistory() {
  chrome.storage.local.get("cw_history", (result) => {
    const history = result.cw_history || [];
    const listEl = document.getElementById("history-list");

    if (history.length === 0) {
      listEl.innerHTML = '<p class="cw-empty-state">No analyses yet. Right-click a chart to get started!</p>';
      return;
    }

    listEl.innerHTML = history.slice(0, 10).map((entry) => `
      <div class="cw-history-item" data-id="${entry.id}">
        <img
          class="cw-history-thumb"
          src="${entry.imageBase64 || 'icons/icon48.png'}"
          alt="Chart thumbnail"
        >
        <div class="cw-history-info">
          <div class="cw-history-title">${escapeHtml(entry.sourceTitle || 'Unknown')}</div>
          <div class="cw-history-date">${formatTimestamp(entry.timestamp)}</div>
        </div>
      </div>
    `).join("");

    // Click handler for history items
    listEl.querySelectorAll(".cw-history-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        const entry = history.find((h) => h.id === id);
        if (entry) {
          chrome.storage.local.set({ cw_current_analysis: entry });
          chrome.runtime.sendMessage({
            action: "start-analysis",
            data: entry
          });
        }
      });
    });
  });
}

// ---- Settings Panel ----
function initSettingsPanel() {
  const toggleBtn = document.getElementById("btn-toggle-settings");
  const panel = document.getElementById("settings-panel");
  const icon = document.getElementById("settings-toggle-icon");

  toggleBtn.addEventListener("click", () => {
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "flex" : "none";
    icon.textContent = isHidden ? "▲" : "▼";
  });

  // Toggle API key visibility
  const toggleKeyBtn = document.getElementById("btn-toggle-key");
  const apiKeyInput = document.getElementById("api-key");

  toggleKeyBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleKeyBtn.textContent = isPassword ? "🙈" : "👁";
  });

  // Save settings
  document.getElementById("btn-save-settings").addEventListener("click", () => {
    const apiKey = document.getElementById("api-key").value.trim();
    const model = document.getElementById("model-select").value;
    const historyEnabled = document.getElementById("save-history").checked;

    chrome.storage.local.get("cw_settings", (result) => {
      const settings = result.cw_settings || {};
      settings.apiKey = apiKey;
      settings.model = model;
      settings.history = historyEnabled;

      chrome.storage.local.set({ cw_settings: settings }, () => {
        const btn = document.getElementById("btn-save-settings");
        btn.textContent = "✓ Saved!";
        btn.style.background = "#4ade80";
        setTimeout(() => {
          btn.textContent = "Save Settings";
          btn.style.background = "";
        }, 1500);
      });
    });
  });
}

// ---- Utilities ----
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}