# 🧠 ML Knowledge Explorer

> A sleek, modern Microsoft Edge browser extension for exploring, searching, and refreshing your knowledge on all types of Machine Learning — with offline support, quiz mode, flashcards, and more.

![Version](https://img.shields.io/badge/version-1.1.0-6c63ff)
![Manifest](https://img.shields.io/badge/manifest-v3-00d4b4)
![License](https://img.shields.io/badge/license-MIT-blue)
![Browser](https://img.shields.io/badge/browser-Microsoft%20Edge-0078d7)

---

## 📸 Overview

ML Knowledge Explorer replaces your new tab page with a beautifully designed knowledge base covering **50+ types of Machine Learning**, organized into categories with definitions, use cases, examples, and external links. It works fully offline and can check for new ML types from Wikipedia when you're connected.

---

## ✨ Features

- **50+ ML Types Preloaded** — Comprehensive coverage across 8 categories
- **Accordion UI** — Clean list/accordion layout for distraction-free browsing
- **Search** — Instantly search ML types by name
- **Category Filters** — Filter by category using chip buttons
- **Favorites / Bookmarks** — Star your most-referenced ML types
- **Dark & Light Mode** — Toggle between themes, preference is saved
- **Detail View** — Each ML type expands to show:
  - Definition
  - Use Cases
  - Examples
  - External Links (when online)
- **Personal Notes** — Add and save your own notes to any ML type
- **Quiz Mode** — Test your knowledge with auto-generated multiple choice questions
- **Flashcard Mode** — Review ML types with flippable flashcards
- **Online Update Checker** — Manually check Wikipedia for newly documented ML types
- **Approve / Reject Updates** — Review and approve before any new entry is added
- **Export** — Export your full knowledge base as:
  - 📄 JSON
  - 📝 Markdown
  - 🖨️ PDF (via browser print)
- **Offline Support** — Full functionality without internet; links shown only when online
- **Offline / Online Indicator** — Live network status badge in the header
- **Persistent Storage** — All data saved locally via `chrome.storage.local`
- **New Tab Override** — Opens automatically on every new tab
- **Extension Icon Click** — Also opens via toolbar icon click

---

## 📁 File Structure

```plaintext
ml-knowledge-explorer/
│
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker — handles icon click
├── newtab.html            # Main UI (new tab page)
│
├── css/
│   └── styles.css         # All styles (dark/light themes, components)
│
├── js/
│   ├── data.js            # Full ML knowledge base (50+ entries)
│   ├── storage.js         # chrome.storage.local abstraction
│   ├── updater.js         # Wikipedia API update checker
│   ├── quiz.js            # Quiz and flashcard logic
│   ├── exporter.js        # JSON, Markdown, PDF export
│   └── newtab.js          # Main app logic and UI controller
│
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png