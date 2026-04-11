// Background service worker — Manifest V3
// Handles install events and can relay future messages if needed.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("[Docling MD Converter] Extension installed.");
    // Set default server URL in storage on first install
    chrome.storage.local.set({ serverUrl: "http://localhost:5001" });
  }
});