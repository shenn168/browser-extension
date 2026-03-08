// Security Headers Checker - Optimized Popup

let activeTabId = null;
let activeOrigin = '';
let currentResults = null;

// Security headers config
const HEADERS_CONFIG = {
  'strict-transport-security': {
    name: 'Strict-Transport-Security (HSTS)',
    check: (v, https) => {
      if (!https) return { status: 'info', msg: 'Only effective over HTTPS' };
      if (!v) return { status: 'warning', msg: 'Missing - browsers may use insecure HTTP' };
      const maxAge = v.match(/max-age=(\d+)/i);
      if (maxAge && parseInt(maxAge[1]) >= 31536000) return { status: 'good', msg: 'Properly configured' };
      return { status: 'warning', msg: 'max-age too short (recommend 1 year)' };
    },
    fix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains'
  },
  'content-security-policy': {
    name: 'Content-Security-Policy (CSP)',
    check: (v) => {
      if (!v) return { status: 'warning', msg: 'Missing - vulnerable to XSS attacks' };
      if (/unsafe-inline|unsafe-eval/i.test(v)) return { status: 'warning', msg: 'Contains unsafe directives' };
      return { status: 'good', msg: 'Present and configured' };
    },
    fix: "Content-Security-Policy: default-src 'self'"
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    check: (v) => {
      if (!v) return { status: 'warning', msg: 'Missing - vulnerable to clickjacking' };
      if (/^(DENY|SAMEORIGIN)$/i.test(v)) return { status: 'good', msg: `Set to ${v.toUpperCase()}` };
      return { status: 'warning', msg: 'Unexpected value' };
    },
    fix: 'X-Frame-Options: DENY'
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    check: (v) => {
      if (!v) return { status: 'warning', msg: 'Missing - MIME sniffing possible' };
      if (v.toLowerCase() === 'nosniff') return { status: 'good', msg: 'Set to nosniff' };
      return { status: 'warning', msg: 'Unexpected value' };
    },
    fix: 'X-Content-Type-Options: nosniff'
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    check: (v) => {
      if (!v) return { status: 'warning', msg: 'Missing - may leak URLs' };
      if (/no-referrer|strict-origin|same-origin/i.test(v)) return { status: 'good', msg: 'Properly configured' };
      return { status: 'info', msg: `Set to ${v}` };
    },
    fix: 'Referrer-Policy: strict-origin-when-cross-origin'
  },
  'permissions-policy': {
    name: 'Permissions-Policy',
    check: (v) => {
      if (!v) return { status: 'info', msg: 'Not set (optional)' };
      return { status: 'good', msg: 'Configured' };
    },
    fix: 'Permissions-Policy: geolocation=(), camera=()'
  },
  'cross-origin-opener-policy': {
    name: 'Cross-Origin-Opener-Policy (COOP)',
    check: (v) => {
      if (!v) return { status: 'info', msg: 'Not set (optional)' };
      if (v.toLowerCase() === 'same-origin') return { status: 'good', msg: 'Strict isolation enabled' };
      return { status: 'info', msg: `Set to ${v}` };
    },
    fix: 'Cross-Origin-Opener-Policy: same-origin'
  },
  'cross-origin-resource-policy': {
    name: 'Cross-Origin-Resource-Policy (CORP)',
    check: (v) => {
      if (!v) return { status: 'info', msg: 'Not set (optional)' };
      return { status: 'good', msg: `Set to ${v}` };
    },
    fix: 'Cross-Origin-Resource-Policy: same-origin'
  },
  'cross-origin-embedder-policy': {
    name: 'Cross-Origin-Embedder-Policy (COEP)',
    check: (v) => {
      if (!v) return { status: 'info', msg: 'Not set (optional)' };
      return { status: 'good', msg: `Set to ${v}` };
    },
    fix: 'Cross-Origin-Embedder-Policy: require-corp'
  }
};

// Initialize immediately
init();

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      showError('Cannot access tab');
      return;
    }
    
    activeTabId = tab.id;
    const url = new URL(tab.url);
    activeOrigin = url.origin;
    
    document.getElementById('activeUrl').textContent = tab.url;
    document.getElementById('activeOrigin').textContent = `Origin: ${activeOrigin}`;
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      showError(`Cannot scan ${url.protocol} URLs`);
      document.getElementById('scanBtn').disabled = true;
    }
    
    // Setup event listeners
    document.getElementById('scanBtn').onclick = scan;
    document.getElementById('rescanBtn').onclick = scan;
    document.getElementById('copyBtn').onclick = copyReport;
    document.getElementById('reloadTabBtn').onclick = () => {
      chrome.runtime.sendMessage({ type: 'RELOAD_TAB', tabId: activeTabId });
      showError('Tab reloading... Click Scan after page loads.');
    };
    
    document.querySelectorAll('input[name="scanMode"]').forEach(r => {
      r.onchange = () => {
        document.getElementById('modeWarning').classList.toggle('hidden', r.value === 'A');
      };
    });
    
  } catch (e) {
    showError('Error: ' + e.message);
  }
}

async function scan() {
  const mode = document.querySelector('input[name="scanMode"]:checked').value;
  
  hideResults();
  showLoading();
  
  try {
    let results;
    
    if (mode === 'A') {
      results = await scanModeA();
    } else if (mode === 'B') {
      results = await scanModeB();
    } else {
      results = await scanModeAB();
    }
    
    currentResults = results;
    showResults(results);
    
  } catch (e) {
    showError(e.message);
    if (e.message.includes('Reload')) {
      document.getElementById('reloadTabBtn').classList.remove('hidden');
    }
  }
  
  hideLoading();
}

function scanModeA() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'GET_OBSERVED_HEADERS',
      tabId: activeTabId,
      origin: activeOrigin
    }, (res) => {
      if (res?.success) {
        resolve({ mode: 'A', label: 'Observed', ...res.data, analysis: analyze(res.data.headers, res.data.url) });
      } else {
        reject(new Error(res?.error || 'No headers. Reload page and try again.'));
      }
    });
  });
}

function scanModeB() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'FETCH_HEADERS',
      origin: activeOrigin
    }, (res) => {
      if (res?.success) {
        resolve({ mode: 'B', label: 'Fetched', ...res.data, analysis: analyze(res.data.headers, res.data.url) });
      } else {
        reject(new Error(res?.error || 'Fetch failed'));
      }
    });
  });
}

async function scanModeAB() {
  let a, b, errA, errB;
  
  try { a = await scanModeA(); } catch (e) { errA = e.message; }
  try { b = await scanModeB(); } catch (e) { errB = e.message; }
  
  if (!a && !b) throw new Error(`Both failed.\nMode A: ${errA}\
Mode B: ${errB}`);
  
  const analysis = {};
  for (const key of Object.keys(HEADERS_CONFIG)) {
    const aa = a?.analysis?.[key];
    const bb = b?.analysis?.[key];
    analysis[key] = {
      ...(aa || bb),
      valueA: a?.headers?.[key] || null,
      valueB: b?.headers?.[key] || null,
      isDifferent: a?.headers?.[key] !== b?.headers?.[key]
    };
  }
  
  return { mode: 'AB', label: 'Compared', url: a?.url || b?.url, timestamp: Date.now(), analysis, resultA: a, resultB: b };
}

function analyze(headers, url) {
  const isHttps = url?.startsWith('https');
  const result = {};
  
  for (const [key, cfg] of Object.entries(HEADERS_CONFIG)) {
    const value = headers[key] || null;
    const check = cfg.check(value, isHttps);
    result[key] = { name: cfg.name, value, ...check, fix: cfg.fix };
  }
  
  return result;
}

function showResults(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  
  let good = 0, warn = 0, info = 0;
  
  for (const [key, data] of Object.entries(results.analysis)) {
    const tr = document.createElement('tr');
    
    // Status count
    if (data.status === 'good') good++;
    else if (data.status === 'warning') warn++;
    else info++;
    
    // Value display
    let valueHtml;
    if (results.mode === 'AB') {
      const diff = data.isDifferent ? 'style="border-left:3px solid orange;padding-left:5px"' : '';
      valueHtml = `
        <small>A:</small> <code>${esc(data.valueA) || '<em>none</em>'}</code><br>
        <small>B:</small> <code ${diff}>${esc(data.valueB) || '<em>none</em>'}</code>
      `;
    } else {
      valueHtml = data.value ? `<code>${esc(data.value)}</code>` : '<em>Not set</em>';
    }
    
    tr.innerHTML = `
      <td><strong>${data.name}</strong></td>
      <td><span class="badge badge-${data.status}">${data.status.toUpperCase()}</span></td>
      <td class="value-cell">${valueHtml}</td>
      <td>
        <div>${data.msg}</div>
        <details><summary>Fix</summary><code>${esc(data.fix)}</code></details>
      </td>
    `;
    
    tbody.appendChild(tr);
  }
  
  // Summary
  document.getElementById('summaryStats').innerHTML = `
    <span class="badge badge-good">Good: ${good}</span>
    <span class="badge badge-warning">Warning: ${warn}</span>
    <span class="badge badge-info">Info: ${info}</span>
  `;
  
  document.getElementById('scanInfo').textContent = `Mode: ${results.label} | ${new Date().toLocaleTimeString()}`;
  document.getElementById('resultsSection').classList.remove('hidden');
  document.getElementById('rescanBtn').classList.remove('hidden');
  document.getElementById('copyBtn').classList.remove('hidden');
  
  // Show comparison note
  document.getElementById('comparisonNote').classList.toggle('hidden', results.mode !== 'AB');
}

function copyReport() {
  if (!currentResults) return;
  
  let md = `# Security Headers Report\n\
`;
  md += `**URL:** ${currentResults.url}\
`;
  md += `**Mode:** ${currentResults.label}\
`;
  md += `**Time:** ${new Date().toISOString()}\
\
`;
  md += `| Header | Status | Value |\
|--------|--------|-------|\
`;
  
  for (const [k, d] of Object.entries(currentResults.analysis)) {
    const val = d.value || 'Not set';
    md += `| ${d.name} | ${d.status.toUpperCase()} | ${val.substring(0, 50)} |\
`;
  }
  
  navigator.clipboard.writeText(md).then(() => {
    const toast = document.getElementById('copyToast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
  });
}

function showLoading() {
  document.getElementById('loadingSection').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingSection').classList.add('hidden');
}

function showError(msg) {
  document.getElementById('errorMessage').textContent = msg;
  document.getElementById('errorSection').classList.remove('hidden');
}

function hideResults() {
  document.getElementById('errorSection').classList.add('hidden');
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('reloadTabBtn').classList.add('hidden');
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}