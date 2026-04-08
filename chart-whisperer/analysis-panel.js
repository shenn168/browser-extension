// =============================================
// Chart Whisperer — Analysis Panel Script
// =============================================

(function () {
  "use strict";

  // State
  let currentAnalysis = null;

  // DOM Elements
  const chartPreviewContainer = document.getElementById("chart-preview-container");
  const sourceInfo = document.getElementById("source-info");
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const resultsState = document.getElementById("results-state");
  const emptyState = document.getElementById("empty-state");
  const analysisContent = document.getElementById("analysis-content");
  const errorMessage = document.getElementById("error-message");

  // Steps
  const stepCapture = document.getElementById("step-capture");
  const stepSend = document.getElementById("step-send");
  const stepAnalyze = document.getElementById("step-analyze");

  // Buttons
  const btnCopy = document.getElementById("btn-copy");
  const btnReanalyze = document.getElementById("btn-reanalyze");
  const btnRetry = document.getElementById("btn-retry");

  // ---- Initialize ----
  function init() {
    // Check if there's a pending analysis
    chrome.storage.local.get("cw_current_analysis", (result) => {
      if (result.cw_current_analysis && result.cw_current_analysis.status === "pending") {
        startAnalysis(result.cw_current_analysis);
      }
    });

    // Listen for new analysis requests
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "start-analysis") {
        startAnalysis(message.data);
      }
    });

    // Button event listeners
    btnCopy.addEventListener("click", copyAnalysis);
    btnReanalyze.addEventListener("click", reanalyze);
    btnRetry.addEventListener("click", reanalyze);
  }

  // ---- State Management ----
  function showState(state) {
    loadingState.style.display = "none";
    errorState.style.display = "none";
    resultsState.style.display = "none";
    emptyState.style.display = "none";

    switch (state) {
      case "loading":
        loadingState.style.display = "block";
        break;
      case "error":
        errorState.style.display = "block";
        break;
      case "results":
        resultsState.style.display = "block";
        break;
      case "empty":
        emptyState.style.display = "flex";
        break;
    }
  }

  function updateStep(stepEl, status) {
    stepEl.classList.remove("complete", "active");
    const iconEl = stepEl.querySelector(".ap-step-icon");

    switch (status) {
      case "complete":
        stepEl.classList.add("complete");
        iconEl.textContent = "✅";
        break;
      case "active":
        stepEl.classList.add("active");
        iconEl.textContent = "⏳";
        break;
      default:
        iconEl.textContent = "⏳";
    }
  }

  // ---- Analysis Flow ----
  async function startAnalysis(data) {
    currentAnalysis = data;

    // Show chart preview
    if (data.imageBase64) {
      chartPreviewContainer.innerHTML = `<img src="${data.imageBase64}" alt="Chart being analyzed">`;
    } else if (data.imageUrl) {
      chartPreviewContainer.innerHTML = `<img src="${data.imageUrl}" alt="Chart being analyzed">`;
    }

    // Show source info
    if (data.sourceTitle && data.sourceUrl) {
      sourceInfo.textContent = `Source: ${data.sourceTitle}`;
      sourceInfo.title = data.sourceUrl;
    } else {
      sourceInfo.textContent = "";
    }

    // Enter loading state
    showState("loading");
    updateStep(stepCapture, "active");

    // Simulate capture step
    await delay(400);
    updateStep(stepCapture, "complete");
    updateStep(stepSend, "active");

    // Get analysis depth setting
    const settings = await getSettings();
    const analysisDepth = settings.analysisDepth || "standard";

    // Check for API key
    if (!settings.apiKey) {
      showError("API key not configured. Please open the extension popup and add your API key in Settings.");
      return;
    }

    try {
      await delay(300);
      updateStep(stepSend, "complete");
      updateStep(stepAnalyze, "active");

      // Call AI API via background script
      const result = await callAI({
        imageBase64: data.imageBase64 || data.imageUrl,
        analysisDepth: analysisDepth
      });

      updateStep(stepAnalyze, "complete");
      await delay(300);

      // Render results
      renderAnalysis(result);
      showState("results");

      // Save to history
      chrome.runtime.sendMessage({
        action: "save-to-history",
        data: {
          imageBase64: data.imageBase64,
          sourceUrl: data.sourceUrl,
          sourceTitle: data.sourceTitle,
          analysis: result,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error("Analysis failed:", error);

      if (error.message === "API_KEY_MISSING") {
        showError("API key not configured. Please open the popup and add your key.");
      } else if (error.message.includes("401")) {
        showError("Invalid API key. Please check your key in the extension settings.");
      } else if (error.message.includes("429")) {
        showError("Rate limit reached. Please wait a moment and try again.");
      } else if (error.message.includes("400")) {
        showError("The image could not be processed. Try a different chart or use the area selector.");
      } else {
        showError(`Analysis failed: ${error.message}`);
      }
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    showState("error");
  }

  // ---- Render Analysis ----
  function renderAnalysis(markdownText) {
    // Simple markdown-to-HTML converter
    const html = convertMarkdownToHTML(markdownText);
    analysisContent.innerHTML = html;
  }

  function convertMarkdownToHTML(md) {
    let html = md;

    // Escape HTML
    html = html.replace(/&/g, "&amp;");
    html = html.replace(/</g, "&lt;");
    html = html.replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`);

    // Paragraphs (lines not already wrapped)
    html = html.replace(/^(?!<[hulo])(.*\S.*)$/gm, "<p>$1</p>");

    // Clean up extra paragraph tags around lists
    html = html.replace(/<p>(<ul>)/g, "$1");
    html = html.replace(/(<\/ul>)<\/p>/g, "$1");

    return html;
  }

  // ---- Actions ----
  function copyAnalysis() {
    const text = analysisContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
      btnCopy.textContent = "✅";
      setTimeout(() => {
        btnCopy.textContent = "📋";
      }, 1500);
    });
  }

  function reanalyze() {
    if (currentAnalysis) {
      startAnalysis(currentAnalysis);
    }
  }

  // ---- API Call (via background script) ----
  function callAI(data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "call-ai-api", data: data },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Unknown error"));
          }
        }
      );
    });
  }

  // ---- Utilities ----
  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get("cw_settings", (result) => {
        resolve(result.cw_settings || {});
      });
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---- Start ----
  init();

})();