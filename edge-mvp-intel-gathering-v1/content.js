(function () {
  "use strict";

  // Noise selectors to remove before extracting main text
  // Avoiding generic "header" to preserve article headlines
  var NOISE_SELECTORS = [
    "nav",
    "footer",
    "script",
    "style",
    "noscript",
    "svg",
    "iframe",
    "video",
    "audio",
    "canvas",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
    ".cookie-banner",
    ".cookie-consent",
    "#cookie-banner",
    "#cookie-consent",
    ".ad",
    ".ads",
    ".advertisement",
    ".sidebar",
    "aside"
  ];

  // Maximum content length to send (characters)
  var MAX_CONTENT_LENGTH = 15000;

  /**
   * Get currently selected text on the page.
   */
  function getSelection() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.toString().trim();
    }
    return "";
  }

  /**
   * Extract text from an element by stripping noise selectors.
   * Uses textContent on a clone since innerText is unreliable on detached nodes.
   */
  function extractCleanText(root) {
    var clone = root.cloneNode(true);
    NOISE_SELECTORS.forEach(function (selector) {
      try {
        var elements = clone.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
          if (elements[i].parentNode) {
            elements[i].parentNode.removeChild(elements[i]);
          }
        }
      } catch (e) {
        // Selector might be invalid; skip silently
      }
    });

    // textContent works reliably on detached nodes unlike innerText
    var text = clone.textContent || "";
    return text;
  }

  /**
   * Split text into sentences without using lookbehind regex.
   * Returns an array of trimmed sentence strings.
   */
  function splitSentences(text) {
    // Replace sentence-ending punctuation followed by whitespace with a delimiter
    var delimited = text.replace(/([.!?])\s+/g, "$1|||");
    var parts = delimited.split("|||");
    var result = [];
    for (var i = 0; i < parts.length; i++) {
      var s = parts[i].trim();
      if (s.length > 0) {
        result.push(s);
      }
    }
    return result;
  }

  /**
   * Extract main visible content from the page with priority ordering.
   */
  function extractContent() {
    var text;

    // Priority 1: <article>
    var article = document.querySelector("article");
    if (article) {
      text = extractCleanText(article).trim();
      if (text.length > 100) {
        return text;
      }
    }

    // Priority 2: <main>
    var main = document.querySelector("main");
    if (main) {
      text = extractCleanText(main).trim();
      if (text.length > 100) {
        return text;
      }
    }

    // Priority 3: Common content containers
    var containerSelectors = [
      "#content",
      "#main-content",
      ".content",
      ".main-content",
      ".post-content",
      ".entry-content",
      ".article-body",
      "[role='main']"
    ];

    for (var i = 0; i < containerSelectors.length; i++) {
      var el = document.querySelector(containerSelectors[i]);
      if (el) {
        text = extractCleanText(el).trim();
        if (text.length > 100) {
          return text;
        }
      }
    }

    // Priority 4: Fallback to body
    return extractCleanText(document.body).trim();
  }

  /**
   * Handle incoming messages from the background script.
   */
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "extractPageContent") {
      try {
        var content = extractContent();

        // Trim to max length
        if (content.length > MAX_CONTENT_LENGTH) {
          content = content.substring(0, MAX_CONTENT_LENGTH) + " [truncated]";
        }

        // Collapse excessive whitespace
        content = content.replace(/\
{3,}/g, "\
\n");
        content = content.replace(/[ \t]{2,}/g, " ");

        sendResponse({
          title: document.title || "",
          url: window.location.href || "",
          selection: getSelection(),
          content: content
        });
      } catch (err) {
        sendResponse({
          error: "Content extraction failed: " + (err.message || String(err))
        });
      }
      return true; // Keep channel open for this handled message
    }
    // Do NOT return true for unhandled messages
    return false;
  });
})();