// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_SERVER = "http://localhost:5001";

// Docling-supported MIME types mapped to display icons
const FILE_ICONS = {
  "application/pdf": "📕",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📘",
  "application/msword": "📘",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "📙",
  "application/vnd.ms-powerpoint": "📙",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📗",
  "application/vnd.ms-excel": "📗",
  "text/html": "🌐",
  "text/csv": "📊",
  "text/markdown": "📝",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "image/tiff": "🖼️",
  "image/bmp": "🖼️",
  "image/gif": "🖼️",
  "image/webp": "🖼️",
};

// ─── State ───────────────────────────────────────────────────────────────────
let selectedFile = null;
let markdownContent = "";
let serverBaseUrl = DEFAULT_SERVER;

// ─── DOM References ──────────────────────────────────────────────────────────
const statusDot       = document.getElementById("statusDot");
const statusText      = document.getElementById("statusText");
const refreshStatus   = document.getElementById("refreshStatus");
const settingsBtn     = document.getElementById("settingsBtn");
const settingsPanel   = document.getElementById("settingsPanel");
const serverUrlInput  = document.getElementById("serverUrl");
const saveSettingsBtn = document.getElementById("saveSettings");
const dropZone        = document.getElementById("dropZone");
const fileInput       = document.getElementById("fileInput");
const fileInfo        = document.getElementById("fileInfo");
const fileIcon        = document.getElementById("fileIcon");
const fileName        = document.getElementById("fileName");
const fileSize        = document.getElementById("fileSize");
const clearFileBtn    = document.getElementById("clearFile");
const convertBtn      = document.getElementById("convertBtn");
const progressSection = document.getElementById("progressSection");
const progressFill    = document.getElementById("progressFill");
const progressLabel   = document.getElementById("progressLabel");
const resultSection   = document.getElementById("resultSection");
const resultMeta      = document.getElementById("resultMeta");
const previewBox      = document.getElementById("previewBox");
const downloadBtn     = document.getElementById("downloadBtn");
const convertAnother  = document.getElementById("convertAnother");
const errorSection    = document.getElementById("errorSection");
const errorMsg        = document.getElementById("errorMsg");
const retryBtn        = document.getElementById("retryBtn");

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.local.get("serverUrl");
  serverBaseUrl = stored.serverUrl || DEFAULT_SERVER;
  serverUrlInput.value = serverBaseUrl;
  checkServerStatus();
});

// ─── Settings ────────────────────────────────────────────────────────────────
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

saveSettingsBtn.addEventListener("click", async () => {
  const val = serverUrlInput.value.trim().replace(/\/$/, "");
  if (!val) return;
  serverBaseUrl = val;
  await chrome.storage.local.set({ serverUrl: val });
  settingsPanel.classList.add("hidden");
  checkServerStatus();
});

// ─── Server Status ───────────────────────────────────────────────────────────
async function checkServerStatus() {
  setStatus("checking", "Checking server...");
  try {
    const res = await fetch(`${serverBaseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      setStatus("online", `Server online — ${serverBaseUrl}`);
    } else {
      setStatus("offline", `Server error (HTTP ${res.status})`);
    }
  } catch {
    setStatus("offline", "Server offline — start Docling first");
  }
}

function setStatus(state, text) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = text;
}

refreshStatus.addEventListener("click", checkServerStatus);

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelected(file);
});

dropZone.addEventListener("click", (e) => {
  // Avoid double-trigger when clicking the label/button inside
  if (e.target === dropZone || e.target.classList.contains("drop-icon") ||
      e.target.classList.contains("drop-title") ||
      e.target.classList.contains("drop-sub")) {
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFileSelected(fileInput.files[0]);
});

function handleFileSelected(file) {
  selectedFile = file;
  const icon = FILE_ICONS[file.type] || "📄";
  fileIcon.textContent = icon;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.classList.remove("hidden");
  dropZone.classList.add("hidden");
  convertBtn.disabled = false;
  hideResults();
}

clearFileBtn.addEventListener("click", resetAll);

// ─── Convert ─────────────────────────────────────────────────────────────────
convertBtn.addEventListener("click", () => {
  if (!selectedFile) return;
  startConversion();
});

async function startConversion() {
  showProgress("Uploading file to Docling...", 15);
  convertBtn.disabled = true;
  hideResults();

  try {
    const formData = new FormData();
    formData.append("file", selectedFile);

    showProgress("Processing document...", 40);

    const response = await fetch(`${serverBaseUrl}/convert`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(120000), // 2 min timeout for large docs
    });

    showProgress("Receiving markdown...", 80);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    markdownContent = data.markdown || data.content || data.result || "";

    if (!markdownContent) {
      throw new Error("Server returned empty markdown. Check Docling logs.");
    }

    showProgress("Done!", 100);

    setTimeout(() => {
      progressSection.classList.add("hidden");
      showResult();
    }, 500);

  } catch (err) {
    progressSection.classList.add("hidden");
    showError(err.message);
  }
}

// ─── Progress ────────────────────────────────────────────────────────────────
function showProgress(label, pct) {
  progressSection.classList.remove("hidden");
  errorSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = label;
}

// ─── Result ──────────────────────────────────────────────────────────────────
function showResult() {
  resultSection.classList.remove("hidden");
  const lines = markdownContent.split("\
").length;
  const chars = markdownContent.length;
  resultMeta.textContent = `${lines} lines · ${chars.toLocaleString()} chars`;
  previewBox.textContent = markdownContent.slice(0, 800) +
    (markdownContent.length > 800 ? "\n\n... (preview truncated)" : "");
}

downloadBtn.addEventListener("click", downloadMarkdown);

function downloadMarkdown() {
  const baseName = selectedFile
    ? selectedFile.name.replace(/\.[^.]+$/, "")
    : "converted";
  const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

convertAnother.addEventListener("click", resetAll);

// ─── Error ───────────────────────────────────────────────────────────────────
function showError(msg) {
  errorSection.classList.remove("hidden");
  errorMsg.textContent = msg;
  convertBtn.disabled = false;
}

retryBtn.addEventListener("click", () => {
  errorSection.classList.add("hidden");
  if (selectedFile) startConversion();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hideResults() {
  resultSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  progressSection.classList.add("hidden");
}

function resetAll() {
  selectedFile = null;
  markdownContent = "";
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  dropZone.classList.remove("hidden");
  convertBtn.disabled = true;
  hideResults();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}