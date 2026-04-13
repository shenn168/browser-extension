(function () {
  "use strict";

  // DOM references
  const modeBadge = document.getElementById("modeBadge");
  const pageTitleEl = document.getElementById("pageTitle");
  const btnSummarize = document.getElementById("btnSummarize");
  const btnExplain = document.getElementById("btnExplain");
  const btnExtract = document.getElementById("btnExtract");
  const statusBar = document.getElementById("statusBar");
  const resultPanel = document.getElementById("resultPanel");
  const resultContent = document.getElementById("resultContent");
  const btnCopy = document.getElementById("btnCopy");
  const btnClear = document.getElementById("btnClear");
  const btnSettings = document.getElementById("btnSettings");

  let lastResultText = "";

  // ── Helpers ──

  function setStatus(message, state) {
    statusBar.textContent = message;
    statusBar.className = "status-bar status-" + state;
  }

  function showResult(html) {
    resultContent.innerHTML = html;
    resultPanel.classList.remove("hidden");
  }

  function hideResult() {
    resultPanel.classList.add("hidden");
    resultContent.innerHTML = "";
    lastResultText = "";
  }

  function setButtonsDisabled(disabled) {
    btnSummarize.disabled = disabled;
    btnExplain.disabled = disabled;
    btnExtract.disabled = disabled;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ── Mode Badge ──

  function updateModeBadge() {
    chrome.storage.local.get(["mockMode"], (result) => {
      const isMock = result.mockMode !== false; // default ON
      modeBadge.textContent = isMock ? "Mock" : "Live API";
      modeBadge.className = "badge " + (isMock ? "badge-mock" : "badge-live");
    });
  }

  // ── Active Tab Info ──

  function getActiveTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          resolve(tabs[0]);
        } else {
          reject(new Error("No active tab found."));
        }
      });
    });
  }

  // ── Content Extraction via Background ──

  function requestContentExtraction(tabId) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "extractContent", tabId: tabId },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        }
      );
    });
  }

  // ── AI Action Request ──

  function requestAction(action, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "aiAction", action: action, payload: payload },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        }
      );
    });
  }

  // ── Result Renderers ──

  function renderSummarize(data) {
    let html = "";
    if (data.summaryShort) {
      html += "<h3>Summary</h3>";
      html += "<p>" + escapeHtml(data.summaryShort) + "</p>";
    }
    if (data.keyPoints && data.keyPoints.length > 0) {
      html += "<h3>Key Points</h3><ul>";
      data.keyPoints.forEach((point) => {
        html += "<li>" + escapeHtml(point) + "</li>";
      });
      html += "</ul>";
    }
    if (data.confidenceNote) {
      html += '<p class="confidence-note">' + escapeHtml(data.confidenceNote) + "</p>";
    }
    lastResultText = (data.summaryShort || "") + "\n" +
      (data.keyPoints || []).map((p) => "• " + p).join("\
") +
      "\n" + (data.confidenceNote || "");
    return html;
  }

  function renderExplain(data) {
    let html = "";
    if (data.originalSelection) {
      html += '<div class="selection-preview"><strong>Selected:</strong> "' +
        escapeHtml(data.originalSelection) + '"</div>';
    }
    if (data.explanation) {
      html += "<h3>Explanation</h3>";
      html += "<p>" + escapeHtml(data.explanation) + "</p>";
    }
    if (data.confidenceNote) {
      html += '<p class="confidence-note">' + escapeHtml(data.confidenceNote) + "</p>";
    }
    lastResultText = (data.explanation || "") + "\
" + (data.confidenceNote || "");
    return html;
  }

  function renderExtract(data) {
    let html = "";
    if (data.pageType) {
      html += "<h3>Page Type</h3>";
      html += "<p>" + escapeHtml(data.pageType) + "</p>";
    }
    if (data.keyPoints && data.keyPoints.length > 0) {
      html += "<h3>Key Points</h3><ul>";
      data.keyPoints.forEach((p) => {
        html += "<li>" + escapeHtml(p) + "</li>";
      });
      html += "</ul>";
    }
    // Entities
    if (data.entities) {
      html += "<h3>Entities</h3>";
      const categories = ["people", "organizations", "products", "dates", "locations", "numbers"];
      categories.forEach((cat) => {
        const items = data.entities[cat];
        if (items && items.length > 0) {
          html += '<div class="entity-category">';
          html += '<span class="entity-label">' + escapeHtml(cat) + ":</span> ";
          html += '<span class="entity-values">' + items.map(escapeHtml).join(", ") + "</span>";
          html += "</div>";
        }
      });
    }
    // Signals
    if (data.signals) {
      html += "<h3>Signals</h3>";
      const signalKeys = ["mainClaims", "risks", "actionsMentioned"];
      signalKeys.forEach((key) => {
        const items = data.signals[key];
        if (items && items.length > 0) {
          html += '<div class="entity-category">';
          html += '<span class="entity-label">' + escapeHtml(key) + ":</span> ";
          html += '<span class="entity-values">' + items.map(escapeHtml).join("; ") + "</span>";
          html += "</div>";
        }
      });
    }
    if (data.confidenceNote) {
      html += '<p class="confidence-note">' + escapeHtml(data.confidenceNote) + "</p>";
    }
    lastResultText = JSON.stringify(data, null, 2);
    return html;
  }

  function renderResult(action, data) {
    // Guard: if the data looks unexpected, render as JSON
    if (!data || typeof data !== "object") {
      showResult("<pre>" + escapeHtml(JSON.stringify(data, null, 2)) + "</pre>");
      return;
    }
    let html = "";
    switch (action) {
      case "summarizePage":
        html = renderSummarize(data);
        break;
      case "explainSelection":
        html = renderExplain(data);
        break;
      case "extractKeyInfo":
        html = renderExtract(data);
        break;
      default:
        html = "<pre>" + escapeHtml(JSON.stringify(data, null, 2)) + "</pre>";
        lastResultText = JSON.stringify(data, null, 2);
    }
    if (!html) {
      html = "<pre>" + escapeHtml(JSON.stringify(data, null, 2)) + "</pre>";
      lastResultText = JSON.stringify(data, null, 2);
    }
    showResult(html);
  }

  // ── Core Flow ──

  async function executeAction(action) {
    setButtonsDisabled(true);
    hideResult();
    setStatus("Extracting page content…", "loading");

    try {
      const tab = await getActiveTab();

      // Check for restricted pages
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") ||
          tab.url.startsWith("about:") || tab.url.startsWith("chrome-extension://")) {
        throw new Error("Cannot analyze restricted browser pages.");
      }

      const extracted = await requestContentExtraction(tab.id);

      if (!extracted || (!extracted.content && !extracted.selection)) {
        throw new Error("Could not extract content from this page.");
      }

      // For explain, verify selection exists
      if (action === "explainSelection" && !extracted.selection) {
        throw new Error("No text is selected on the page. Please select some text first.");
      }

      setStatus("Processing…", "loading");

      const result = await requestAction(action, {
        title: extracted.title || tab.title || "",
        url: extracted.url || tab.url || "",
        selection: extracted.selection || "",
        content: extracted.content || ""
      });

      setStatus("Done", "success");
      renderResult(action, result);
    } catch (err) {
      setStatus(err.message || "An error occurred.", "error");
    } finally {
      setButtonsDisabled(false);
    }
  }

  // ── Event Bindings ──

  btnSummarize.addEventListener("click", () => executeAction("summarizePage"));
  btnExplain.addEventListener("click", () => executeAction("explainSelection"));
  btnExtract.addEventListener("click", () => executeAction("extractKeyInfo"));

  btnCopy.addEventListener("click", () => {
    if (lastResultText) {
      navigator.clipboard.writeText(lastResultText.trim()).then(() => {
        setStatus("Copied to clipboard!", "success");
        setTimeout(() => setStatus("Ready", "idle"), 1500);
      }).catch(() => {
        setStatus("Failed to copy.", "error");
      });
    } else {
      setStatus("Nothing to copy.", "idle");
    }
  });

  btnClear.addEventListener("click", () => {
    hideResult();
    setStatus("Ready", "idle");
  });

  btnSettings.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Init ──

  async function init() {
    updateModeBadge();
    try {
      const tab = await getActiveTab();
      pageTitleEl.textContent = tab.title || tab.url || "Unknown page";
    } catch {
      pageTitleEl.textContent = "No active tab";
    }
  }

  init();
})();