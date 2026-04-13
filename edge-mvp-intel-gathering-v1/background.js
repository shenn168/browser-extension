(function () {
  "use strict";

  // ═══════════════════════════════════════
  //  Utility
  // ═══════════════════════════════════════

  function getSettings() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(["mockMode", "apiEndpoint", "apiKey"], function (result) {
        resolve({
          mockMode: result.mockMode !== false, // default ON
          apiEndpoint: result.apiEndpoint || "",
          apiKey: result.apiKey || ""
        });
      });
    });
  }

  /**
   * Split text into sentences without lookbehind regex.
   */
  function splitSentences(text) {
    var normalized = text.replace(/\n+/g, " ").trim();
    var delimited = normalized.replace(/([.!?])\s+/g, "$1|||");
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
   * Truncate a string to a max length with ellipsis.
   */
  function truncate(str, maxLen) {
    if (!str) return "";
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + "...";
  }

  // ═══════════════════════════════════════
  //  Content Extraction Orchestrator
  // ═══════════════════════════════════════

  function extractContentFromTab(tabId) {
    return new Promise(function (resolve, reject) {
      // First attempt: send message to existing content script
      chrome.tabs.sendMessage(tabId, { type: "extractPageContent" }, function (response) {
        if (chrome.runtime.lastError) {
          // Content script likely not loaded; inject it programmatically
          injectAndRetry(tabId, resolve, reject);
          return;
        }
        if (response && response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response);
      });
    });
  }

  function injectAndRetry(tabId, resolve, reject) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["content.js"]
      },
      function (injectionResults) {
        if (chrome.runtime.lastError) {
          reject(new Error("Cannot access this page: " + chrome.runtime.lastError.message));
          return;
        }

        // Wait for the content script to initialize, then retry
        setTimeout(function () {
          chrome.tabs.sendMessage(tabId, { type: "extractPageContent" }, function (response) {
            if (chrome.runtime.lastError) {
              reject(new Error("Content extraction failed after injection: " + chrome.runtime.lastError.message));
              return;
            }
            if (response && response.error) {
              reject(new Error(response.error));
              return;
            }
            resolve(response);
          });
        }, 350);
      }
    );
  }

  // ═══════════════════════════════════════
  //  Mock AI Layer
  // ═══════════════════════════════════════

  var MockAI = {

    /**
     * Summarize: condense the first few sentences into bullets.
     */
    summarizePage: function (payload) {
      var content = payload.content || "";
      var sentences = splitSentences(content).filter(function (s) {
        return s.length > 10;
      });

      var topSentences = sentences.slice(0, 5);
      var summary;

      if (topSentences.length === 0) {
        summary = "No meaningful content found on this page.";
      } else {
        summary = topSentences[0];
        if (topSentences.length > 1) {
          summary += " " + topSentences[1];
        }
      }

      var keyPoints = [];
      for (var i = 0; i < topSentences.length; i++) {
        keyPoints.push(truncate(topSentences[i], 120));
      }

      return {
        summaryShort: summary,
        keyPoints: keyPoints,
        confidenceNote: "Mock mode - derived from extracted page text using simple heuristics."
      };
    },

    /**
     * Explain selection: paraphrase in simpler terms deterministically.
     */
    explainSelection: function (payload) {
      var selection = payload.selection || "";

      if (!selection) {
        return {
          explanation: "No text was selected.",
          confidenceNote: "Mock mode."
        };
      }

      var parts = splitSentences(selection).filter(function (s) {
        return s.length > 0;
      });

      var explanation;
      if (parts.length <= 1) {
        explanation =
          'The selected text states: "' +
          truncate(selection, 200) +
          '". In simpler terms, this passage conveys information about the topic it references. ' +
          "No additional context was available to elaborate further.";
      } else {
        var pointDescriptions = [];
        for (var i = 0; i < parts.length; i++) {
          pointDescriptions.push(
            "Point " + (i + 1) + ': "' + truncate(parts[i], 80) + '"'
          );
        }
        explanation =
          "The selected text makes " +
          parts.length +
          " main points. " +
          pointDescriptions.join(". ") +
          ".";
      }

      return {
        originalSelection: truncate(selection, 200),
        explanation: explanation,
        confidenceNote: "Mock mode - deterministic paraphrase, not AI-generated."
      };
    },

    /**
     * Extract key info: lightweight heuristic entity and signal extraction.
     */
    extractKeyInfo: function (payload) {
      var content = payload.content || "";
      var title = payload.title || "";
      var url = payload.url || "";

      // ── Page type guess ──
      var pageType = "General Web Page";
      var urlLower = url.toLowerCase();

      if (urlLower.indexOf("news") !== -1 || urlLower.indexOf("article") !== -1) {
        pageType = "News/Article";
      } else if (urlLower.indexOf("wiki") !== -1) {
        pageType = "Wiki/Reference";
      } else if (urlLower.indexOf("blog") !== -1 || urlLower.indexOf("post") !== -1) {
        pageType = "Blog Post";
      } else if (
        urlLower.indexOf("shop") !== -1 ||
        urlLower.indexOf("product") !== -1 ||
        urlLower.indexOf("store") !== -1
      ) {
        pageType = "E-commerce/Product";
      }

      // ── Entity extraction ──

      // Capitalized multi-word phrases (potential named entities)
      var capitalizedPhrases = [];
      var capSeen = {};
      var capRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
      var capMatch;
      while ((capMatch = capRegex.exec(content)) !== null) {
        var phrase = capMatch[1];
        if (phrase.length > 3 && !capSeen[phrase]) {
          capSeen[phrase] = true;
          capitalizedPhrases.push(phrase);
        }
        // Safety: prevent infinite loop if zero-length match
        if (capMatch.index === capRegex.lastIndex) {
          capRegex.lastIndex++;
        }
      }

      // Dates: match common date formats
      var dates = [];
      var dateSeen = {};
      var dateRegex1 = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g;
      var dateMatch;
      while ((dateMatch = dateRegex1.exec(content)) !== null) {
        if (!dateSeen[dateMatch[1]]) {
          dateSeen[dateMatch[1]] = true;
          dates.push(dateMatch[1]);
        }
        if (dateMatch.index === dateRegex1.lastIndex) {
          dateRegex1.lastIndex++;
        }
      }

      // Named month dates: "January 5, 2024" etc.
      var dateRegex2 =
        /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{2,4})\b/gi;
      while ((dateMatch = dateRegex2.exec(content)) !== null) {
        if (!dateSeen[dateMatch[1]]) {
          dateSeen[dateMatch[1]] = true;
          dates.push(dateMatch[1]);
        }
        if (dateMatch.index === dateRegex2.lastIndex) {
          dateRegex2.lastIndex++;
        }
      }

      // Numbers with $ or %
      var numbers = [];
      var numSeen = {};
      var numRegex = /(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%)/g;
      var numMatch;
      while ((numMatch = numRegex.exec(content)) !== null) {
        if (!numSeen[numMatch[1]]) {
          numSeen[numMatch[1]] = true;
          numbers.push(numMatch[1]);
        }
        if (numMatch.index === numRegex.lastIndex) {
          numRegex.lastIndex++;
        }
      }

      // ── Key points ──
      var sentences = splitSentences(content).filter(function (s) {
        return s.length > 20;
      });

      var keyPoints = [];
      for (var i = 0; i < Math.min(sentences.length, 4); i++) {
        keyPoints.push(truncate(sentences[i], 150));
      }

      // ── Signal detection ──
      var claimKeywords = [
        "must", "should", "will", "always", "never",
        "guarantee", "critical", "important", "significant"
      ];
      var riskKeywords = [
        "risk", "danger", "warning", "caution", "threat", "vulnerability"
      ];
      var actionKeywords = [
        "launch", "announce", "release", "acquire",
        "partner", "invest", "expand", "hire"
      ];

      function findMatchingSentences(sentenceList, keywords, maxCount) {
        var results = [];
        for (var j = 0; j < sentenceList.length && results.length < maxCount; j++) {
          var lower = sentenceList[j].toLowerCase();
          for (var k = 0; k < keywords.length; k++) {
            if (lower.indexOf(keywords[k]) !== -1) {
              results.push(truncate(sentenceList[j], 150));
              break;
            }
          }
        }
        return results;
      }

      var mainClaims = findMatchingSentences(sentences, claimKeywords, 3);
      var risks = findMatchingSentences(sentences, riskKeywords, 3);
      var actionsMentioned = findMatchingSentences(sentences, actionKeywords, 3);

      return {
        pageType: pageType,
        keyPoints: keyPoints,
        entities: {
          people: [],
          organizations: capitalizedPhrases.slice(0, 8),
          products: [],
          dates: dates.slice(0, 6),
          locations: [],
          numbers: numbers.slice(0, 6)
        },
        signals: {
          mainClaims: mainClaims,
          risks: risks,
          actionsMentioned: actionsMentioned
        },
        confidenceNote:
          "Mock mode - entities and signals detected using simple heuristic patterns, not AI."
      };
    }
  };

  // ═══════════════════════════════════════
  //  Live API Layer
  // ═══════════════════════════════════════

  function callLiveAPI(action, payload, settings) {
    if (!settings.apiEndpoint) {
      return Promise.reject(new Error("API endpoint not configured. Please check Settings."));
    }

    var body = {
      action: action,
      title: payload.title || "",
      url: payload.url || "",
      content: payload.content || ""
    };

    if (action === "explainSelection") {
      body.selection = payload.selection || "";
    }

    var headers = {
      "Content-Type": "application/json"
    };

    if (settings.apiKey) {
      headers["Authorization"] = "Bearer " + settings.apiKey;
    }

    return fetch(settings.apiEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("API returned status " + response.status + ": " + response.statusText);
      }
      return response.json();
    });
  }

  // ═══════════════════════════════════════
  //  Message Handler
  // ═══════════════════════════════════════

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    // ── Content extraction request from popup ──
    if (message.type === "extractContent") {
      extractContentFromTab(message.tabId)
        .then(function (data) {
          sendResponse(data);
        })
        .catch(function (err) {
          sendResponse({ error: err.message || String(err) });
        });
      return true; // async response
    }

    // ── AI action request from popup ──
    if (message.type === "aiAction") {
      var action = message.action;
      var payload = message.payload;

      if (!action || !payload) {
        sendResponse({ error: "Invalid action request: missing action or payload." });
        return true;
      }

      getSettings()
        .then(function (settings) {
          if (settings.mockMode) {
            // Route to mock layer
            var result;
            switch (action) {
              case "summarizePage":
                result = MockAI.summarizePage(payload);
                break;
              case "explainSelection":
                result = MockAI.explainSelection(payload);
                break;
              case "extractKeyInfo":
                result = MockAI.extractKeyInfo(payload);
                break;
              default:
                throw new Error("Unknown action: " + action);
            }
            sendResponse(result);
          } else {
            // Route to live API
            return callLiveAPI(action, payload, settings).then(function (apiResult) {
              sendResponse(apiResult);
            });
          }
        })
        .catch(function (err) {
          sendResponse({ error: err.message || String(err) });
        });

      return true; // async response
    }

    // Unhandled message types
    return false;
  });

  // ═══════════════════════════════════════
  //  Context Menu (optional convenience)
  // ═══════════════════════════════════════

  chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
      id: "passiveai-explain",
      title: "Passive AI: Explain Selection",
      contexts: ["selection"]
    });
  });

  chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === "passiveai-explain" && tab && tab.id) {
      // MV3 cannot programmatically open the popup, so badge the icon as a hint
      try {
        chrome.action.setBadgeText({ text: "!", tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId: tab.id });
        setTimeout(function () {
          chrome.action.setBadgeText({ text: "", tabId: tab.id });
        }, 3000);
      } catch (e) {
        // Tab may have been closed; ignore silently
      }
    }
  });
})();