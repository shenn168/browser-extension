// Setup message listener for analysis results - UPDATED
function setupMessageListener() {
  // Listen to storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.latestAnalysis) {
      console.log('Detected new analysis in storage:', changes.latestAnalysis.newValue);
      displayAnalysisResults(changes.latestAnalysis.newValue);
    }
  });

  // Also listen to window messages (fallback)
  window.addEventListener('message', (event) => {
    if (event.data.type === 'TARA_ANALYSIS_COMPLETE') {
      console.log('Received analysis via window message:', event.data.data);
      displayAnalysisResults(event.data.data);
    }
  });

  // Try to load latest analysis on startup
  chrome.storage.local.get(['latestAnalysis'], (result) => {
    if (result.latestAnalysis) {
      console.log('Loading existing analysis from storage');
      displayAnalysisResults(result.latestAnalysis);
    }
  });
}