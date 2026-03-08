# Security Headers Checker - Edge Extension

A Microsoft Edge (Chromium / Manifest V3) extension that analyzes HTTP security headers and provides detailed configuration reports.

## Features

- **Three Scan Modes:**
  - **Mode A (Observe):** Uses headers captured from browser navigation (recommended)
  - **Mode B (Fetch):** Performs on-demand request from extension
  - **Mode A+B (Compare):** Runs both and highlights differences

- **Headers Analyzed:**
  - Strict-Transport-Security (HSTS)
  - Content-Security-Policy (CSP)
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
  - Cross-Origin-Opener-Policy (COOP)
  - Cross-Origin-Resource-Policy (CORP)
  - Cross-Origin-Embedder-Policy (COEP)

- **Features:**
  - Status badges (Good/Warning/Missing/Info)
  - Detailed explanations and remediation tips
  - Copy Markdown report to clipboard
  - Rate limiting (10 seconds per origin+mode)
  - Full privacy (no external data transmission)

## Installation

1. Download/clone this repository
2. Open Edge and navigate to `edge://extensions`
3. Enable **Developer mode** (toggle in bottom-left)
4. Click **Load unpacked**
5. Select the extension folder
6. The shield icon appears in the toolbar

## Permissions Justification

| Permission | Reason |
|------------|--------|
| `activeTab` | Access current tab URL for scanning |
| `webRequest` | Observe response headers (Mode A) |
| `storage` | Cache results in session storage |
| `<all_urls>` | Capture headers from any website |

## Limitations

1. **Mode B CORS restrictions:** Fetch API may not expose all headers due to CORS
2. **Dynamic headers:** Headers may vary by user agent, auth state, CDN location
3. **Header-only check:** Does not verify actual security implementation
4. **No CSP parsing:** Basic pattern matching, not full CSP directive analysis
5. **Session-only cache:** Results cleared when browser closes

## Future Improvements

1. Full CSP directive parser with detailed policy analysis
2. Historical tracking with chrome.storage.local
3. Export to JSON/PDF formats
4. Header recommendations based on site type
5. Integration with Mozilla Observatory API
6. Batch scanning of multiple URLs
7. Dark mode support
8. Internationalization (i18n)

## Manual Test Plan

### Test Cases

1. **HTTPS site with good headers**
   - Visit: https://securityheaders.com
   - Expected: Multiple "Good" statuses

2. **HTTP site**
   - Visit: http://example.com
   - Expected: Protocol warning, HSTS shows "Info"

3. **Mode A without navigation**
   - Open popup on fresh tab
   - Expected: "No observed headers" message, reload button

4. **Mode B CORS blocking**
   - Visit site with strict CORS
   - Expected: CORS error message suggesting Mode A

5. **Mode A+B comparison**
   - Visit any HTTPS site
   - Select Mode A+B, scan
   - Expected: Side-by-side values, difference explanations

6. **Rate limiting**
   - Scan same site twice quickly
   - Expected: Rate limit countdown appears

7. **Copy report**
   - Complete a scan, click Copy Report
   - Expected: Toast notification, valid Markdown in clipboard

8. **Restricted URL**
   - Navigate to edge://settings
   - Expected: Error about unsupported URL scheme

9. **Missing headers site**
   - Visit a site known for poor security headers
   - Expected: Multiple "Warning" and "Missing" statuses

10. **Reload tab functionality**
    - Clear observed headers, request scan
    - Click "Reload Tab" button
    - Expected: Tab reloads, can scan after

## Building for Production

```bash
# Zip for distribution (exclude development files)
zip -r security-headers-checker.zip manifest.json *.js *.html *.css icons/ -x "*.git*"