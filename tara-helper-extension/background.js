// TARA Helper - Background Service Worker
console.log('TARA Helper: Background service worker initialized');

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('TARA Helper installed for the first time');
    initializeExtension();
  } else if (details.reason === 'update') {
    console.log('TARA Helper updated to version:', chrome.runtime.getManifest().version);
  }
});

// Initialize extension with default settings
async function initializeExtension() {
  const defaultSettings = {
    autoAnalyze: false,
    highlightEnabled: true,
    confidenceThreshold: 0.7,
    analysisCount: 0,
    maxFreeAnalyses: 5,
    isPremium: false
  };

  await chrome.storage.local.set(defaultSettings);
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'analyzePage',
    title: 'Analyze page with TARA Helper',
    contexts: ['page', 'selection']
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzePage') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startAnalysis',
      selectedText: info.selectionText
    });
    
    // Open side panel
    openSidePanel(tab.windowId);
  }
});

// Function to open side panel
async function openSidePanel(windowId) {
  try {
    // Check if sidePanel API is available
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: windowId });
      console.log('Side panel opened successfully');
    } else {
      console.error('Side panel API not available');
      // Fallback: open in new tab
      chrome.tabs.create({ url: chrome.runtime.getURL('sidebar/sidebar.html') });
    }
  } catch (error) {
    console.error('Error opening side panel:', error);
    // Fallback: open in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('sidebar/sidebar.html') });
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action, 'from:', sender.tab?.id || 'popup');

  // Handle async operations properly
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case 'analyzeContent':
          console.log('Starting content analysis for:', request.content?.url);
          const results = await analyzeContent(request.content, sender.tab?.id);
          console.log('Analysis completed successfully');
          sendResponse({ success: true, data: results });
          break;

        case 'saveAnalysis':
          await saveAnalysisToStorage(request.data);
          sendResponse({ success: true });
          break;

        case 'getAnalysisHistory':
          const history = await getAnalysisHistory();
          sendResponse({ success: true, data: history });
          break;

        case 'exportAnalysis':
          const exportResult = await exportAnalysis(request.format, request.data);
          sendResponse({ success: true, data: exportResult });
          break;

        case 'openSidePanel':
          console.log('Opening side panel for window:', sender.tab?.windowId || request.windowId);
          await openSidePanel(sender.tab?.windowId || request.windowId);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  };

  // Execute async handler
  handleAsync();
  
  // Return true to indicate async response
  return true;
});

// Handle action (extension icon) clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked');
  await openSidePanel(tab.windowId);
});

// Main analysis function
async function analyzeContent(content, tabId) {
  console.log('Analyzing content, text length:', content?.text?.length || 0);
  
  // Validate input
  if (!content || !content.text) {
    throw new Error('No content provided for analysis');
  }

  if (content.text.length < 10) {
    throw new Error('Content too short for meaningful analysis');
  }
  
  // Check usage limits
  const settings = await chrome.storage.local.get(['analysisCount', 'maxFreeAnalyses', 'isPremium']);
  
  if (!settings.isPremium && settings.analysisCount >= settings.maxFreeAnalyses) {
    throw new Error('Free analysis limit reached. Please upgrade to Premium.');
  }

  // Increment analysis count
  await chrome.storage.local.set({
    analysisCount: (settings.analysisCount || 0) + 1
  });

  // Perform analysis
  const analysis = {
    timestamp: new Date().toISOString(),
    url: content.url,
    title: content.title,
    assets: extractAssets(content.text),
    threats: extractThreats(content.text),
    attackPaths: generateAttackPaths(content.text),
    controls: suggestControls(content.text)
  };

  console.log('Analysis results:', {
    assets: analysis.assets.length,
    threats: analysis.threats.length,
    attackPaths: analysis.attackPaths.length,
    controls: analysis.controls.length
  });

  return analysis;
}

// Extract assets from text
function extractAssets(text) {
  const assetKeywords = {
    'ECU': ['ecu', 'electronic control unit', 'engine control'],
    'CAN Bus': ['can bus', 'controller area network', 'can interface', 'can network'],
    'Gateway': ['gateway', 'central gateway', 'cgw', 'network gateway'],
    'Telematics': ['telematics', 'tcu', 'telematic control unit', 'connectivity module'],
    'Infotainment': ['infotainment', 'ivi', 'head unit', 'display system', 'entertainment system'],
    'ADAS': ['adas', 'advanced driver assistance', 'autonomous', 'self-driving', 'driver assist'],
    'OTA': ['ota', 'over-the-air', 'remote update', 'software update', 'firmware update'],
    'V2X': ['v2x', 'v2v', 'v2i', 'vehicle-to-everything', 'dsrc', 'c-v2x'],
    'Diagnostic': ['obd', 'obd-ii', 'diagnostic', 'uds', 'diagnostic port'],
    'Key Fob': ['key fob', 'remote key', 'keyless entry', 'peps', 'passive entry']
  };

  const foundAssets = [];
  const textLower = text.toLowerCase();

  for (const [assetType, keywords] of Object.entries(assetKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        foundAssets.push({
          type: assetType,
          keyword: keyword,
          category: categorizeAsset(assetType),
          confidence: calculateConfidence(textLower, keyword)
        });
        break; // Only add once per type
      }
    }
  }

  console.log('Extracted assets:', foundAssets.length);
  return foundAssets;
}

// Categorize asset per ISO 21434
function categorizeAsset(assetType) {
  const categories = {
    'ECU': 'Hardware Component',
    'CAN Bus': 'Communication Channel',
    'Gateway': 'Hardware Component',
    'Telematics': 'External Connectivity',
    'Infotainment': 'Vehicle Function',
    'ADAS': 'Vehicle Function',
    'OTA': 'External Connectivity',
    'V2X': 'External Connectivity',
    'Diagnostic': 'Interface',
    'Key Fob': 'Hardware Component'
  };
  return categories[assetType] || 'Unknown';
}

// Extract threats from text
function extractThreats(text) {
  const threatPatterns = {
    'Unauthorized Access': ['unauthorized access', 'bypass authentication', 'privilege escalation', 'access control'],
    'Code Injection': ['code injection', 'sql injection', 'command injection', 'buffer overflow', 'injection attack'],
    'Man-in-the-Middle': ['mitm', 'man in the middle', 'man-in-the-middle', 'intercept', 'eavesdrop', 'sniffing'],
    'Denial of Service': ['dos', 'ddos', 'denial of service', 'flood', 'resource exhaustion'],
    'Spoofing': ['spoofing', 'impersonation', 'fake message', 'replay attack', 'message forgery'],
    'Data Tampering': ['tamper', 'tampering', 'modify', 'alter data', 'manipulation', 'modification'],
    'Information Disclosure': ['data leak', 'information disclosure', 'data breach', 'expose', 'extract', 'leakage'],
    'Physical Attack': ['physical access', 'hardware attack', 'side channel', 'glitch', 'physical tampering']
  };

  const foundThreats = [];
  const textLower = text.toLowerCase();

  for (const [threatType, patterns] of Object.entries(threatPatterns)) {
    for (const pattern of patterns) {
      if (textLower.includes(pattern)) {
        foundThreats.push({
          type: threatType,
          strideCategory: mapToSTRIDE(threatType),
          confidence: calculateConfidence(textLower, pattern),
          pattern: pattern
        });
        break;
      }
    }
  }

  console.log('Extracted threats:', foundThreats.length);
  return foundThreats;
}

// Map threat to STRIDE category
function mapToSTRIDE(threatType) {
  const strideMap = {
    'Unauthorized Access': 'Elevation of Privilege',
    'Code Injection': 'Tampering',
    'Man-in-the-Middle': 'Information Disclosure',
    'Denial of Service': 'Denial of Service',
    'Spoofing': 'Spoofing',
    'Data Tampering': 'Tampering',
    'Information Disclosure': 'Information Disclosure',
    'Physical Attack': 'Tampering'
  };
  return strideMap[threatType] || 'Unknown';
}

// Generate attack paths
function generateAttackPaths(text) {
  const textLower = text.toLowerCase();
  const paths = [];

  // Pattern 1: Remote execution
  if ((textLower.includes('remote') && textLower.includes('execute')) || 
      (textLower.includes('rce') || textLower.includes('remote code execution'))) {
    paths.push({
      name: 'Remote Code Execution Path',
      steps: [
        'Attacker gains network access to vehicle',
        'Identifies and exploits vulnerability in exposed service',
        'Executes arbitrary code on target ECU',
        'Escalates privileges to gain system-level access',
        'Achieves persistent access for future attacks'
      ],
      complexity: 'Medium',
      prerequisites: ['Network connectivity to vehicle', 'Knowledge of vulnerability', 'Exploitation tools']
    });
  }

  // Pattern 2: CAN bus attack
  if ((textLower.includes('can') && (textLower.includes('inject') || textLower.includes('attack'))) ||
      textLower.includes('can bus')) {
    paths.push({
      name: 'CAN Bus Injection Attack',
      steps: [
        'Attacker gains physical or remote access to CAN bus',
        'Monitors and analyzes CAN traffic patterns',
        'Identifies target ECU and message IDs',
        'Crafts malicious CAN frames',
        'Injects messages to trigger unintended vehicle behavior'
      ],
      complexity: 'High',
      prerequisites: ['Physical access to OBD-II port or compromised ECU', 'CAN protocol knowledge', 'CAN interface hardware']
    });
  }

  // Pattern 3: OTA update attack
  if ((textLower.includes('ota') || textLower.includes('over-the-air') || textLower.includes('update')) &&
      (textLower.includes('attack') || textLower.includes('tamper') || textLower.includes('compromise'))) {
    paths.push({
      name: 'OTA Update Compromise',
      steps: [
        'Attacker intercepts OTA update communication',
        'Performs man-in-the-middle attack on update channel',
        'Modifies legitimate update package',
        'Injects malicious firmware',
        'Vehicle installs compromised update'
      ],
      complexity: 'High',
      prerequisites: ['Network interception capability', 'Cryptographic weakness or bypass', 'Knowledge of update protocol']
    });
  }

  // Pattern 4: Key fob attack
  if ((textLower.includes('key fob') || textLower.includes('keyless') || textLower.includes('peps')) &&
      (textLower.includes('relay') || textLower.includes('attack') || textLower.includes('clone'))) {
    paths.push({
      name: 'Key Fob Relay Attack',
      steps: [
        'Attacker positions near legitimate key fob',
        'Captures and relays authentication signal',
        'Extends communication range using relay devices',
        'Vehicle authenticates proxied signal',
        'Vehicle unlocks and allows engine start'
      ],
      complexity: 'Low',
      prerequisites: ['Proximity to legitimate key fob', 'Relay attack hardware', 'No specialized knowledge required']
    });
  }

  // Pattern 5: Diagnostic port exploitation
  if ((textLower.includes('obd') || textLower.includes('diagnostic')) &&
      (textLower.includes('attack') || textLower.includes('exploit') || textLower.includes('access'))) {
    paths.push({
      name: 'Diagnostic Port Exploitation',
      steps: [
        'Attacker gains physical access to OBD-II port',
        'Connects diagnostic tool or attack device',
        'Sends unauthorized UDS commands',
        'Bypasses security access mechanisms',
        'Manipulates ECU configuration or firmware'
      ],
      complexity: 'Medium',
      prerequisites: ['Physical vehicle access', 'Diagnostic tools', 'UDS protocol knowledge']
    });
  }

  console.log('Generated attack paths:', paths.length);
  return paths;
}

// Suggest controls
function suggestControls(text) {
  const controls = [];
  const textLower = text.toLowerCase();

  const controlMappings = [
    {
      keywords: ['authentication', 'password', 'credential', 'access control', 'authorize'],
      control: {
        id: 'AC-1',
        name: 'Strong Authentication',
        description: 'Implement multi-factor authentication for all interfaces',
        iso21434Ref: 'Clause 8.3 - Identity and access management',
        phase: 'Development',
        effectiveness: 'High'
      }
    },
    {
      keywords: ['encrypt', 'cryptography', 'cipher', 'crypto', 'encryption'],
      control: {
        id: 'CR-1',
        name: 'Data Encryption',
        description: 'Encrypt sensitive data in transit and at rest using strong cryptographic algorithms',
        iso21434Ref: 'Clause 8.4 - Cryptography',
        phase: 'Development',
        effectiveness: 'High'
      }
    },
    {
      keywords: ['update', 'patch', 'firmware', 'ota', 'software update'],
      control: {
        id: 'SI-1',
        name: 'Secure Update Mechanism',
        description: 'Implement secure, authenticated software update process with code signing',
        iso21434Ref: 'Clause 8.7 - Update management',
        phase: 'Production/Operations',
        effectiveness: 'Critical'
      }
    },
    {
      keywords: ['log', 'audit', 'monitor', 'logging', 'detection'],
      control: {
        id: 'AU-1',
        name: 'Security Monitoring',
        description: 'Implement comprehensive logging and anomaly detection',
        iso21434Ref: 'Clause 8.8 - Detection and response',
        phase: 'Operations',
        effectiveness: 'Medium'
      }
    },
    {
      keywords: ['network', 'firewall', 'segment', 'isolation', 'gateway'],
      control: {
        id: 'NS-1',
        name: 'Network Segmentation',
        description: 'Segment vehicle networks with firewalls between critical and non-critical domains',
        iso21434Ref: 'Clause 8.2 - Network architecture',
        phase: 'Concept',
        effectiveness: 'High'
      }
    },
    {
      keywords: ['can bus', 'can', 'message authentication', 'bus security'],
      control: {
        id: 'NS-2',
        name: 'CAN Message Authentication',
        description: 'Implement message authentication codes (MAC) for CAN bus communications',
        iso21434Ref: 'Clause 8.2.3 - Communication security',
        phase: 'Development',
        effectiveness: 'High'
      }
    },
    {
      keywords: ['boot', 'secure boot', 'integrity', 'verification'],
      control: {
        id: 'SI-2',
        name: 'Secure Boot',
        description: 'Implement secure boot chain with cryptographic verification',
        iso21434Ref: 'Clause 8.5 - Software and data integrity',
        phase: 'Development',
        effectiveness: 'High'
      }
    },
    {
      keywords: ['vulnerability', 'scan', 'penetration test', 'security test'],
      control: {
        id: 'VM-1',
        name: 'Vulnerability Management',
        description: 'Establish continuous vulnerability scanning and patch management',
        iso21434Ref: 'Clause 8.6 - Vulnerability management',
        phase: 'Operations',
        effectiveness: 'High'
      }
    }
  ];

  for (const mapping of controlMappings) {
    if (mapping.keywords.some(kw => textLower.includes(kw))) {
      controls.push(mapping.control);
    }
  }

  console.log('Suggested controls:', controls.length);
  return controls;
}

// Calculate confidence score
function calculateConfidence(text, keyword) {
  const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
  const baseConfidence = 0.5;
  const increment = 0.1;
  const maxConfidence = 0.95;
  
  return Math.min(baseConfidence + (occurrences * increment), maxConfidence);
}

// Save analysis to storage
async function saveAnalysisToStorage(data) {
  const history = await getAnalysisHistory();
  history.unshift({
    ...data,
    id: Date.now(),
    timestamp: new Date().toISOString()
  });

  // Keep only last 50 analyses
  const trimmedHistory = history.slice(0, 50);
  await chrome.storage.local.set({ analysisHistory: trimmedHistory });
  console.log('Analysis saved to storage');
}

// Get analysis history
async function getAnalysisHistory() {
  const result = await chrome.storage.local.get('analysisHistory');
  return result.analysisHistory || [];
}

// Export analysis
async function exportAnalysis(format, data) {
  console.log('Exporting analysis as:', format);
  
  switch (format) {
    case 'json':
      return {
        content: JSON.stringify(data, null, 2),
        filename: `tara-analysis-${Date.now()}.json`,
        mimeType: 'application/json'
      };
    
    case 'csv':
      return {
        content: convertToCSV(data),
        filename: `tara-analysis-${Date.now()}.csv`,
        mimeType: 'text/csv'
      };
    
    default:
      throw new Error('Unsupported export format: ' + format);
  }
}

// Convert data to CSV
function convertToCSV(data) {
  let csv = 'Category,Type,Description,Confidence\n';
  
  if (data.assets && data.assets.length > 0) {
    data.assets.forEach(asset => {
      csv += `Asset,"${asset.type}","${asset.category}",${asset.confidence}\
`;
    });
  }
  
  if (data.threats && data.threats.length > 0) {
    data.threats.forEach(threat => {
      csv += `Threat,"${threat.type}","${threat.strideCategory}",${threat.confidence}\n`;
    });
  }
  
  if (data.controls && data.controls.length > 0) {
    data.controls.forEach(control => {
      csv += `Control,"${control.name}","${control.description}","${control.effectiveness}"\
`;
    });
  }
  
  return csv;
}

console.log('TARA Helper background script loaded successfully');