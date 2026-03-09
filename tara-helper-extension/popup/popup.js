// TARA Helper - Popup Script
console.log('TARA Helper: Popup loaded');

// Load initial data
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  attachEventListeners();
});

// Load statistics
async function loadStats() {
  try {
    const data = await chrome.storage.local.get([
      'analysisCount',
      'maxFreeAnalyses',
      'isPremium'
    ]);

    document.getElementById('analysisCount').textContent = data.analysisCount || 0;
    document.getElementById('analysisLimit').textContent = `/ ${data.maxFreeAnalyses || 5}`;
    document.getElementById('accountType').textContent = data.isPremium ? 'Premium' : 'Free';

    // Update button state if limit reached
    if (!data.isPremium && data.analysisCount >= data.maxFreeAnalyses) {
      const analyzeBtn = document.getElementById('analyzeBtn');
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = '<span class="btn-icon">⚠️</span>Limit Reached - Upgrade';
      analyzeBtn.onclick = () => showUpgradeDialog();
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Attach event listeners
function attachEventListeners() {
  // Analyze button
  document.getElementById('analyzeBtn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'startAnalysis' }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Content script error:', chrome.runtime.lastError);
          showNotification('Please refresh the page and try again', 'error');
          return;
        }
        
        if (response?.success) {
          showNotification('Analysis started!', 'success');
          
          // Open side panel
          await openSidePanelHelper(tab.windowId);
          
          // Refresh stats after analysis
          setTimeout(loadStats, 1000);
        } else {
          showNotification('Failed to start analysis', 'error');
        }
      });
    } catch (error) {
      console.error('Analysis error:', error);
      showNotification('Error: ' + error.message, 'error');
    }

// Test analysis button (for debugging)
document.getElementById('testAnalysisBtn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send test analysis directly
    const testData = {
      url: tab.url,
      title: tab.title,
      text: 'CAN bus ECU telematics OTA update authentication encryption vulnerability threat remote access'
    };

    chrome.runtime.sendMessage({
      action: 'analyzeContent',
      content: testData
    }, (response) => {
      if (response?.success) {
        alert('✓ Test Analysis Success!\n\
Found:\n' +
              `- Assets: ${response.data.assets.length}\
` +
              `- Threats: ${response.data.threats.length}\
` +
              `- Controls: ${response.data.controls.length}\
\
` +
              'Check console for details.');
        console.log('Test analysis result:', response.data);
      } else {
        alert('✗ Test Failed: ' + (response?.error || 'Unknown error'));
      }
    });
  } catch (error) {
    alert('Error: ' + error.message);
  }
});
  });

  // Open sidebar button
  document.getElementById('openSidebarBtn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await openSidePanelHelper(tab.windowId);
      // Don't close popup to show feedback
      showNotification('Opening analysis panel...', 'success');
    } catch (error) {
      console.error('Error opening sidebar:', error);
      showNotification('Failed to open panel: ' + error.message, 'error');
    }
  });

  // Clear highlights button
  document.getElementById('clearHighlightsBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' }, (response) => {
      if (chrome.runtime.lastError) {
        showNotification('Please refresh page first', 'error');
        return;
      }
      showNotification('Highlights cleared', 'success');
    });
  });

  // View history button
  document.getElementById('viewHistoryBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await openSidePanelHelper(tab.windowId);
    showNotification('Opening history...', 'success');
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    showNotification('Settings coming soon!', 'info');
  });

  // Upgrade link
  document.getElementById('upgradeLink').addEventListener('click', (e) => {
    e.preventDefault();
    showUpgradeDialog();
  });
}

// Helper function to open side panel
async function openSidePanelHelper(windowId) {
  try {
    console.log('Attempting to open side panel for window:', windowId);
    
    // Method 1: Try using sidePanel API directly
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: windowId });
      console.log('Side panel opened successfully via API');
      return;
    }
    
    // Method 2: Send message to background script
    const response = await chrome.runtime.sendMessage({ 
      action: 'openSidePanel',
      windowId: windowId 
    });
    
    if (response?.success) {
      console.log('Side panel opened via background script');
    } else {
      throw new Error(response?.error || 'Failed to open side panel');
    }
  } catch (error) {
    console.error('Error opening side panel:', error);
    
    // Fallback: Open in new tab
    console.log('Using fallback: opening in new tab');
    const url = chrome.runtime.getURL('sidebar/sidebar.html');
    await chrome.tabs.create({ url: url });
    showNotification('Opened in new tab (side panel not available)', 'info');
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#667eea',
    warning: '#ffc107'
  };

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: ${colors[type]};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 13px;
    animation: slideIn 0.3s ease;
    max-width: 280px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Show upgrade dialog
function showUpgradeDialog() {
  const message = 'Upgrade to Premium:\n\
' +
        '✓ Unlimited analyses\
' +
        '✓ Advanced feasibility scoring\
' +
        '✓ Team collaboration\n' +
        '✓ API access\
' +
        '✓ PDF export\
\n' +
        'Coming soon! Stay tuned for pricing.';
  
  alert(message);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);