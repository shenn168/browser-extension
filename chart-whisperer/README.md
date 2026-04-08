# 🔍 Chart Whisperer

**Instant plain-English insights for any chart, graph, or data visualization on the web.**

Chart Whisperer is a lightweight Microsoft Edge (Manifest V3) browser extension that lets you right-click any chart image on a webpage and receive an AI-powered analysis — key findings, trends, patterns, warnings, and a plain-English takeaway — all delivered in a sleek side panel without ever leaving the page.

---

## 📸 How It Works

1. Browse to any webpage containing a chart or graph.
2. **Right-click** the chart image.
3. Select **"🔍 Chart Whisperer — Analyze This Chart"** from the context menu.
4. The side panel opens and displays a structured, human-readable analysis within seconds.

That's it. No copying, no pasting, no switching tabs.

---

## ✨ Features

- **Right-Click Analysis** — Analyze any chart image directly from the context menu.
- **Area Selector Tool** — Click and drag to capture charts that are not standalone images (canvas, SVG, embedded visuals).
- **Clipboard Paste** — Paste a chart image from your clipboard for instant analysis.
- **Three Analysis Depths**
  - ⚡ **Quick** — 2–3 bullet points in under 5 seconds.
  - 📊 **Standard** — Full structured breakdown with findings, trends, and warnings.
  - 🔬 **Detailed** — Adds statistical observations, deeper context, and visualization suggestions.
- **Analysis History** — Automatically saves your last 50 analyses for quick reference.
- **Copy to Clipboard** — One-click copy of the full analysis text.
- **Re-Analyze** — Retry any analysis with a single click.
- **Dark UI** — Modern, distraction-free dark theme designed for focus.
- **Local Storage Only** — Your API key and history never leave your browser.

---

## 📊 What the Analysis Includes

Every standard analysis is structured into these sections:

| Section | Description |
|---|---|
| 📊 **Chart Type** | Identifies the visualization type (bar, line, pie, scatter, etc.) |
| 📝 **What This Shows** | A 1–2 sentence plain-English summary |
| 🔑 **Key Findings** | Bullet points of the most important observations with specific values |
| 📈 **Trends & Patterns** | Upward/downward trends, seasonal patterns, correlations, anomalies |
| ⚠️ **Things to Watch** | Surprising data points, caveats, and potentially misleading elements |
| 💡 **Plain-English Takeaway** | A paragraph summary for non-technical readers |

Detailed mode adds:

| Section | Description |
|---|---|
| 📐 **Statistical Observations** | Estimated ranges, averages, rate of change, confidence levels |
| 🧠 **Deeper Context** | Follow-up questions, missing data suggestions, visualization improvements |

---

## 🗂️ Project Structure

```plaintext
chart-whisperer/
├── manifest.json            # Extension manifest (MV3)
├── background.js            # Service worker — context menus, API routing, history
├── content.js               # Content script — area selector, notifications, image capture
├── popup.html               # Extension popup — quick actions, settings, history
├── popup.css                # Popup styles
├── popup.js                 # Popup logic
├── analysis-panel.html      # Side panel — analysis display
├── analysis-panel.css       # Side panel styles
├── analysis-panel.js        # Side panel logic — loading states, rendering, actions
├── icons/
│   ├── icon16.png           # Toolbar icon (16×16)
│   ├── icon48.png           # Extension management icon (48×48)
│   └── icon128.png          # Store/install icon (128×128)
├── utils/
│   └── api.js               # API utilities — validation, compression, token estimation
└── README.md                # This file