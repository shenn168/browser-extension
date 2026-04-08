// =============================================
// Chart Whisperer — Background Service Worker
// =============================================

// Create the right-click context menu item on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "chart-whisperer-analyze",
    title: "🔍 Chart Whisperer — Analyze This Chart",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    id: "chart-whisperer-select-area",
    title: "📐 Chart Whisperer — Select Area to Analyze",
    contexts: ["page", "frame"]
  });

  // Set default settings
  chrome.storage.local.get("cw_settings", (result) => {
    if (!result.cw_settings) {
      chrome.storage.local.set({
        cw_settings: {
          apiKey: "",
          model: "gpt-4o",
          analysisDepth: "standard",
          theme: "auto",
          history: true
        }
      });
    }
  });

  console.log("Chart Whisperer installed successfully.");
});

// Handle right-click menu actions
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "chart-whisperer-analyze") {
    handleImageAnalysis(info, tab);
  } else if (info.menuItemId === "chart-whisperer-select-area") {
    handleAreaSelection(tab);
  }
});

// Handle direct image right-click
async function handleImageAnalysis(info, tab) {
  const imageUrl = info.srcUrl;

  if (!imageUrl) {
    notifyUser(tab.id, "No image detected. Try selecting an area instead.");
    return;
  }

  try {
    // Convert image URL to base64
    const base64Image = await fetchImageAsBase64(imageUrl);

    // Store the image data for the analysis panel
    await chrome.storage.local.set({
      cw_current_analysis: {
        imageBase64: base64Image,
        imageUrl: imageUrl,
        sourceUrl: tab.url,
        sourceTitle: tab.title,
        timestamp: Date.now(),
        status: "pending"
      }
    });

    // Open the side panel
    await chrome.sidePanel.open({ tabId: tab.id });

    // Send message to analysis panel to begin
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "start-analysis",
        data: {
          imageBase64: base64Image,
          imageUrl: imageUrl,
          sourceUrl: tab.url,
          sourceTitle: tab.title
        }
      });
    }, 500);

  } catch (error) {
    console.error("Chart Whisperer error:", error);
    notifyUser(tab.id, "Failed to capture chart image. Please try the area selection tool.");
  }
}

// Handle area selection mode
async function handleAreaSelection(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: activateAreaSelector
    });
  } catch (error) {
    console.error("Failed to inject selector:", error);
  }
}

// Injected function for area selection
function activateAreaSelector() {
  // Dispatches to content.js
  window.postMessage({ type: "CW_ACTIVATE_SELECTOR" }, "*");
}

// Fetch an image URL and convert to base64
async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // If CORS blocks us, try via the content script
    throw new Error("CORS_BLOCKED");
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Content script captured a screenshot region
  if (message.action === "area-captured") {
    chrome.storage.local.set({
      cw_current_analysis: {
        imageBase64: message.data.imageBase64,
        imageUrl: null,
        sourceUrl: message.data.sourceUrl,
        sourceTitle: message.data.sourceTitle,
        timestamp: Date.now(),
        status: "pending"
      }
    });

    chrome.sidePanel.open({ tabId: sender.tab.id });

    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "start-analysis",
        data: {
          imageBase64: message.data.imageBase64,
          sourceUrl: message.data.sourceUrl,
          sourceTitle: message.data.sourceTitle
        }
      });
    }, 500);
  }

  // Request to call AI API
  if (message.action === "call-ai-api") {
    callAIAPI(message.data)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  // Save to history
  if (message.action === "save-to-history") {
    saveToHistory(message.data);
  }
});

// AI API call handler
async function callAIAPI(data) {
  const settings = await getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const { imageBase64, analysisDepth } = data;

  const systemPrompt = buildSystemPrompt(analysisDepth);
  const userContent = buildUserContent(imageBase64);

  // OpenAI-compatible endpoint (works with OpenAI, Azure, etc.)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// Build the system prompt based on analysis depth
function buildSystemPrompt(depth) {
  const base = `You are "Chart Whisperer," an expert data visualization analyst. 
Your job is to analyze charts, graphs, plots, and data figures and provide clear, 
plain-English insights that anyone can understand.

Always structure your response in this exact format:

## 📊 Chart Type
Identify what kind of chart/graph this is (bar, line, pie, scatter, etc.)

## 📝 What This Shows
A 1-2 sentence plain-English summary of what the chart is displaying.

## 🔑 Key Findings
- Bullet points of the most important observations
- Include specific numbers/values when visible
- Note the highest, lowest, and any standout data points

## 📈 Trends & Patterns
- Describe any upward/downward trends
- Note any seasonal patterns, cycles, or anomalies
- Identify correlations if multiple data series exist

## ⚠️ Things to Watch
- Any surprising or concerning data points
- Caveats about the data presentation
- Potential misleading elements (truncated axes, cherry-picked ranges, etc.)

## 💡 Plain-English Takeaway
One paragraph summarizing what this chart means in everyday language, 
as if explaining to someone with no data background.`;

  if (depth === "detailed") {
    return base + `\
\
Additionally provide:
## 📐 Statistical Observations
- Estimated ranges, averages, and distributions
- Rate of change calculations where applicable
- Confidence in your readings (high/medium/low)

## 🧠 Deeper Context
- What questions does this data raise?
- What additional data would help complete the picture?
- Suggestions for better visualization if applicable`;
  }

  if (depth === "quick") {
    return `You are "Chart Whisperer." Analyze this chart and provide ONLY:
## 📊 Chart Type
One line.
## 💡 Quick Takeaway
2-3 bullet points with the most important insights. Keep it under 100 words total.`;
  }

  return base;
}

// Build the user message content with the image
function buildUserContent(imageBase64) {
  const content = [
    {
      type: "text",
      text: "Please analyze this chart/graph and provide your insights following your structured format."
    }
  ];

  if (imageBase64.startsWith("data:")) {
    content.push({
      type: "image_url",
      image_url: {
        url: imageBase64,
        detail: "high"
      }
    });
  } else {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${imageBase64}`,
        detail: "high"
      }
    });
  }

  return content;
}

// Get settings from storage
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get("cw_settings", (result) => {
      resolve(result.cw_settings || {});
    });
  });
}

// Save analysis to history
async function saveToHistory(entry) {
  const settings = await getSettings();
  if (!settings.history) return;

  chrome.storage.local.get("cw_history", (result) => {
    const history = result.cw_history || [];
    history.unshift({
      ...entry,
      id: `cw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Keep only last 50 entries
    if (history.length > 50) {
      history.splice(50);
    }

    chrome.storage.local.set({ cw_history: history });
  });
}

// Send notification to user via content script
function notifyUser(tabId, message) {
  chrome.tabs.sendMessage(tabId, {
    action: "show-notification",
    message: message
  });
}