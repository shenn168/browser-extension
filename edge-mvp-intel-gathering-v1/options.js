(function () {
  "use strict";

  const mockModeToggle = document.getElementById("mockModeToggle");
  const apiEndpointInput = document.getElementById("apiEndpoint");
  const apiKeyInput = document.getElementById("apiKey");
  const btnSave = document.getElementById("btnSave");
  const statusMessage = document.getElementById("statusMessage");

  // Load current settings
  function loadSettings() {
    chrome.storage.local.get(["mockMode", "apiEndpoint", "apiKey"], (result) => {
      mockModeToggle.checked = result.mockMode !== false; // default ON
      apiEndpointInput.value = result.apiEndpoint || "";
      apiKeyInput.value = result.apiKey || "";
    });
  }

  // Save settings
  function saveSettings() {
    const settings = {
      mockMode: mockModeToggle.checked,
      apiEndpoint: apiEndpointInput.value.trim(),
      apiKey: apiKeyInput.value.trim()
    };

    // Validate: if mock mode is off, endpoint is required
    if (!settings.mockMode && !settings.apiEndpoint) {
      showStatus("API endpoint is required when Mock Mode is off.", "error");
      return;
    }

    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        showStatus("Failed to save: " + chrome.runtime.lastError.message, "error");
      } else {
        showStatus("Settings saved successfully.", "success");
      }
    });
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message " + type;
    setTimeout(() => {
      statusMessage.textContent = "";
      statusMessage.className = "status-message";
    }, 3000);
  }

  btnSave.addEventListener("click", saveSettings);
  loadSettings();
})();