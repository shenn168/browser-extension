// Security Headers Checker - Optimized Service Worker

const observedHeaders = new Map();
const scanTimestamps = new Map();
const RATE_LIMIT_MS = 10000;
const FETCH_TIMEOUT_MS = 8000;

// Header listener - lightweight
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return; // Ignore non-tab requests
    
    try {
      const url = new URL(details.url);
      const headers = {};
      
      if (details.responseHeaders) {
        for (const h of details.responseHeaders) {
          headers[h.name.toLowerCase()] = h.value;
        }
      }
      
      observedHeaders.set(`${details.tabId}:${url.origin}`, {
        url: details.url,
        origin: url.origin,
        statusCode: details.statusCode,
        headers: headers,
        timestamp: Date.now()
      });
      
      // Keep map small
      if (observedHeaders.size > 50) {
        const firstKey = observedHeaders.keys().next().value;
        observedHeaders.delete(firstKey);
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["responseHeaders"]
);

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  
  if (msg.type === 'GET_OBSERVED_HEADERS') {
    const key = `${msg.tabId}:${msg.origin}`;
    const data = observedHeaders.get(key);
    
    if (data) {
      sendResponse({ success: true, data: data });
    } else {
      sendResponse({ success: false, error: 'No headers captured. Reload the page and try again.' });
    }
    return true;
  }
  
  if (msg.type === 'FETCH_HEADERS') {
    handleFetch(msg.origin, sendResponse);
    return true;
  }
  
  if (msg.type === 'CHECK_RATE_LIMIT') {
    const key = `${msg.origin}:${msg.mode}`;
    const last = scanTimestamps.get(key);
    if (last && (Date.now() - last) < RATE_LIMIT_MS) {
      sendResponse({ rateLimited: true, remainingSeconds: Math.ceil((RATE_LIMIT_MS - (Date.now() - last)) / 1000) });
    } else {
      sendResponse({ rateLimited: false });
    }
    return true;
  }
  
  if (msg.type === 'RELOAD_TAB') {
    chrome.tabs.reload(msg.tabId);
    sendResponse({ success: true });
    return true;
  }
});

async function handleFetch(origin, sendResponse) {
  const rateKey = `${origin}:B`;
  const last = scanTimestamps.get(rateKey);
  
  if (last && (Date.now() - last) < RATE_LIMIT_MS) {
    sendResponse({ success: false, rateLimited: true, remainingSeconds: Math.ceil((RATE_LIMIT_MS - (Date.now() - last)) / 1000) });
    return;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    const response = await fetch(origin, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const headers = {};
    response.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    
    if (Object.keys(headers).length === 0) {
      sendResponse({ success: false, error: 'Headers not accessible (CORS). Try Mode A.', corsBlocked: true });
      return;
    }
    
    scanTimestamps.set(rateKey, Date.now());
    
    sendResponse({
      success: true,
      data: {
        url: response.url,
        origin: origin,
        statusCode: response.status,
        headers: headers,
        timestamp: Date.now()
      }
    });
    
  } catch (e) {
    sendResponse({ success: false, error: e.name === 'AbortError' ? 'Request timed out.' : `Fetch failed: ${e.message}` });
  }
}