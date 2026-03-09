// TARA Helper - Content Script
console.log('TARA Helper: Content script loaded on:', window.location.href);

let isAnalyzing = false;
let highlightedElements = [];

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);

  switch (request.action) {
    case 'startAnalysis':
      startPageAnalysis(request.selectedText)
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          console.error('Analysis error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response

    case 'highlightContent':
      try {
        highlightPageContent(request.data);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'clearHighlights':
      try {
        clearAllHighlights();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Start analyzing current page
async function startPageAnalysis(selectedText = null) {
  if (isAnalyzing) {
    console.log('Analysis already in progress');
    showError('Analysis already in progress. Please wait...');
    return;
  }

  isAnalyzing = true;
  showAnalysisIndicator();

  try {
    // Extract page content
    const text = selectedText || extractPageText();
    
    if (!text || text.length < 10) {
      throw new Error('Not enough text content found on this page');
    }

    const pageContent = {
      url: window.location.href,
      title: document.title,
      text: text,
      timestamp: new Date().toISOString()
    };

    console.log('Sending content for analysis:', {
      url: pageContent.url,
      textLength: pageContent.text.length
    });

    // Send to background for analysis with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout - please try again')), 30000);
    });

    const analysisPromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        content: pageContent
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Analysis failed'));
        }
      });
    });

    const result = await Promise.race([analysisPromise, timeoutPromise]);

    console.log('Analysis complete:', result);
    
    // Highlight page content
    highlightPageContent(result);
    
    // Store analysis results
    await chrome.storage.local.set({ latestAnalysis: result });
    
    // Show success message
    showSuccess(`Analysis complete! Found: ${result.assets.length} assets, ${result.threats.length} threats, ${result.controls.length} controls`);
    
    // Notify sidebar
    window.postMessage({
      type: 'TARA_ANALYSIS_COMPLETE',
      data: result
    }, '*');

  } catch (error) {
    console.error('Analysis error:', error);
    showError(error.message);
  } finally {
    hideAnalysisIndicator();
    isAnalyzing = false;
  }
}

// Extract text from page
function extractPageText() {
  try {
    // Try to get main content first
    const mainContent = document.querySelector('main') || 
                       document.querySelector('article') || 
                       document.querySelector('#content') ||
                       document.querySelector('.content') ||
                       document.body;

    // Clone to avoid modifying actual page
    const clone = mainContent.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = ['script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer', '.ad', '.advertisement'];
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Get text
    const text = clone.innerText || clone.textContent || '';
    
    console.log('Extracted text length:', text.length);
    
    if (text.length === 0) {
      throw new Error('No text content found on page');
    }
    
    // Limit text to prevent performance issues (first 50000 characters)
    return text.substring(0, 50000);
    
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Failed to extract page content');
  }
}

// Highlight content on page
function highlightPageContent(analysisData) {
  console.log('Starting page highlighting...');
  clearAllHighlights();

  if (!analysisData) {
    console.warn('No analysis data to highlight');
    return;
  }

  const { assets, threats, controls } = analysisData;
  let highlightCount = 0;

  // Highlight assets (yellow)
  if (assets && assets.length > 0) {
    console.log('Highlighting', assets.length, 'assets');
    assets.forEach(asset => {
      const count = highlightText(asset.keyword, '#fff3cd', 'asset', asset.type);
      highlightCount += count;
    });
  }

  // Highlight threats (red)
  if (threats && threats.length > 0) {
    console.log('Highlighting', threats.length, 'threats');
    threats.forEach(threat => {
      const count = highlightText(threat.pattern, '#f8d7da', 'threat', threat.type);
      highlightCount += count;
    });
  }

  // Highlight controls (green)
  if (controls && controls.length > 0) {
    console.log('Highlighting', controls.length, 'controls');
    controls.forEach(control => {
      // Extract meaningful keywords from control name
      const keywords = control.name.toLowerCase().split(' ').filter(w => w.length > 4);
      keywords.forEach(kw => {
        const count = highlightText(kw, '#d4edda', 'control', control.name);
        highlightCount += count;
      });
    });
  }

  console.log('Total highlights applied:', highlightCount);
  
  if (highlightCount === 0) {
    console.warn('No matches found for highlighting');
  }
}

// Highlight specific text
function highlightText(searchText, color, type, title) {
  let count = 0;
  
  try {
    const regex = new RegExp(`\\b(${escapeRegex(searchText)})\\b`, 'gi');
    
    // Get all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName?.toLowerCase();
          // Skip scripts, styles, and already highlighted content
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (parent.classList?.contains('tara-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Only accept if text matches
          return regex.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodesToProcess = [];
    let node;
    
    while (node = walker.nextNode()) {
      nodesToProcess.push(node);
    }

    // Process nodes
    nodesToProcess.forEach(textNode => {
      const parent = textNode.parentNode;
      const text = textNode.nodeValue;
      
      if (!regex.test(text)) return;
      
      // Create wrapper
      const wrapper = document.createElement('span');
      wrapper.innerHTML = text.replace(regex, (match) => {
        count++;
        return `<mark class="tara-highlight tara-${type}" 
                      style="background-color: ${color}; padding: 2px 4px; border-radius: 2px; cursor: help; font-weight: 500;" 
                      title="${type}: ${title}" 
                      data-tara-type="${type}">${match}</mark>`;
      });
      
      // Replace text node
      parent.replaceChild(wrapper, textNode);
      highlightedElements.push(wrapper);
    });

  } catch (error) {
    console.error('Error highlighting text:', error);
  }

  return count;
}

// Escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Clear all highlights
function clearAllHighlights() {
  console.log('Clearing highlights...');
  
  // Remove wrapped elements
  highlightedElements.forEach(el => {
    if (el && el.parentNode) {
      try {
        const text = el.textContent;
        const textNode = document.createTextNode(text);
        el.parentNode.replaceChild(textNode, el);
      } catch (e) {
        console.warn('Error clearing highlight element:', e);
      }
    }
  });
  
  // Also remove any remaining mark elements
  const marks = document.querySelectorAll('mark.tara-highlight');
  marks.forEach(mark => {
    try {
      const text = mark.textContent;
      const textNode = document.createTextNode(text);
      mark.parentNode.replaceChild(textNode, mark);
    } catch (e) {
      console.warn('Error clearing mark element:', e);
    }
  });
  
  highlightedElements = [];
  console.log('Highlights cleared');
}

// Show analysis indicator
function showAnalysisIndicator() {
  const existing = document.getElementById('tara-analysis-indicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.id = 'tara-analysis-indicator';
  indicator.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; 
                padding: 18px 25px; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                display: flex; align-items: center; gap: 15px; animation: slideInRight 0.3s ease;">
      <div class="tara-spinner" style="width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); 
                                       border-top-color: white; border-radius: 50%; 
                                       animation: spin 1s linear infinite;"></div>
      <div>
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 3px;">Analyzing page...</div>
        <div style="font-size: 12px; opacity: 0.9;">Extracting threats, assets, and controls</div>
      </div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    </style>
  `;
  document.body.appendChild(indicator);
}

// Hide analysis indicator
function hideAnalysisIndicator() {
  const indicator = document.getElementById('tara-analysis-indicator');
  if (indicator) {
    indicator.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 300);
  }
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; 
                padding: 18px 25px; border-radius: 10px; box-shadow: 0 6px 20px rgba(220,53,69,0.4);
                z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                max-width: 380px; animation: slideInRight 0.3s ease;">
      <div style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">❌ Analysis Error</div>
      <div style="font-size: 13px; line-height: 1.5;">${message}</div>
    </div>
  `;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 300);
  }, 6000);
}

// Show success message
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; background: #28a745; color: white; 
                padding: 18px 25px; border-radius: 10px; box-shadow: 0 6px 20px rgba(40,167,69,0.4);
                z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                max-width: 380px; animation: slideInRight 0.3s ease;">
      <div style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">✓ Success</div>
      <div style="font-size: 13px; line-height: 1.5;">${message}</div>
    </div>
  `;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 300);
  }, 5000);
}

// Initialize keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Alt+T to trigger analysis
  if (e.altKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    console.log('Keyboard shortcut triggered: Alt+T');
    startPageAnalysis();
  }
  
  // Alt+C to clear highlights
  if (e.altKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    console.log('Keyboard shortcut triggered: Alt+C');
    clearAllHighlights();
    showSuccess('Highlights cleared');
  }
});

console.log('TARA Helper content script ready. Press Alt+T to analyze page.');