/*  ================================================
    LinkedLens — LinkedIn DOM Parser (Fixed)
    ================================================
    Robust selectors for extracting data from
    LinkedIn's feed. Uses multiple fallback strategies
    with broader selector coverage for 2024-2026 DOM.
    ================================================ */

const LLParser = {

  // ── Get all visible feed posts ──
  getPosts() {
    const selectors = [
      'div.feed-shared-update-v2',
      'div[data-urn*="urn:li:activity"]',
      'div[data-id*="urn:li:activity"]',
      'div.occludable-update > div',
      'main .scaffold-finite-scroll__content > div > div'
    ];

    for (const sel of selectors) {
      const posts = document.querySelectorAll(sel);
      if (posts.length > 0) {
        // Filter to only visible posts with actual content
        const visible = Array.from(posts).filter(p => {
          return p.offsetHeight > 0 && p.querySelector(
            '.feed-shared-update-v2__description, ' +
            '.update-components-text, ' +
            '.feed-shared-text, ' +
            '.feed-shared-inline-show-more-text, ' +
            'span[dir="ltr"], ' +
            'div.break-words, ' +
            'span.break-words'
          );
        });
        if (visible.length > 0) return visible;
      }
    }

    // Ultimate fallback: grab any container with data-urn containing activity
    const allUrns = document.querySelectorAll('[data-urn*="activity"]');
    if (allUrns.length > 0) return Array.from(allUrns);

    return [];
  },

  // ── Extract data from a single post element ──
  extractPostData(postEl) {
    return {
      element: postEl,
      author: this.getAuthor(postEl),
      headline: this.getHeadline(postEl),
      content: this.getContent(postEl),
      url: this.getPostUrl(postEl),
      timestamp: this.getTimestamp(postEl),
      urn: this.getUrn(postEl)
    };
  },

  getAuthor(el) {
    const selectors = [
      '.update-components-actor__name .visually-hidden',
      '.update-components-actor__name span[aria-hidden="true"]',
      '.update-components-actor__title .visually-hidden',
      '.feed-shared-actor__name span',
      '.feed-shared-actor__name',
      'a.app-aware-link span.visually-hidden',
      '.update-components-actor__name span',
      'span.feed-shared-actor__name',
      'a[data-control-name="actor"] span'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node) {
        const text = node.textContent.trim().replace(/\s+/g, ' ');
        // Filter out empty or "LinkedIn" generic names
        if (text && text.length > 1 && text !== 'LinkedIn Member') {
          return text;
        }
      }
    }
    return 'Unknown Author';
  },

  getHeadline(el) {
    const selectors = [
      '.update-components-actor__description .visually-hidden',
      '.update-components-actor__description span[aria-hidden="true"]',
      '.feed-shared-actor__description span',
      '.feed-shared-actor__description',
      '.update-components-actor__supplementary-actor-info span',
      '.update-components-actor__description span'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node) {
        const text = node.textContent.trim().replace(/\s+/g, ' ');
        if (text && text.length > 1) return text;
      }
    }
    return '';
  },

  getContent(el) {
    // Strategy 1: Direct content selectors
    const selectors = [
      '.feed-shared-update-v2__description .break-words',
      '.feed-shared-update-v2__description',
      '.update-components-text .break-words',
      '.update-components-text',
      '.feed-shared-text .break-words',
      '.feed-shared-text',
      '.feed-shared-inline-show-more-text',
      'div.feed-shared-update-v2__description-wrapper span[dir="ltr"]',
      'div.update-components-text__text-view span[dir="ltr"]'
    ];

    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node) {
        const text = this._extractVisibleText(node);
        if (text && text.length > 15) return text;
      }
    }

    // Strategy 2: Find the largest text block within the post
    const spans = el.querySelectorAll('span[dir="ltr"], span.break-words, div.break-words');
    let longest = '';
    spans.forEach(s => {
      const text = s.textContent.trim();
      if (text.length > longest.length) longest = text;
    });
    if (longest.length > 15) return longest.replace(/\s+/g, ' ');

    return '';
  },

  /**
   * Extract visible text, ignoring hidden elements and "see more" buttons
   */
  _extractVisibleText(node) {
    let text = '';
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(textNode) {
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          // Skip visually hidden or "see more" elements
          if (parent.classList.contains('visually-hidden')) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.feed-shared-inline-show-more-text__see-more-less-toggle')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let current;
    while (current = walker.nextNode()) {
      text += current.textContent;
    }
    return text.trim().replace(/\s+/g, ' ');
  },

  getPostUrl(el) {
    const urn = this.getUrn(el);
    if (urn) {
      const activityId = urn.split(':').pop();
      if (activityId && /^\d+$/.test(activityId)) {
        return 'https://www.linkedin.com/feed/update/urn:li:activity:' + activityId + '/';
      }
    }
    // Fallback: look for a permalink
    const link = el.querySelector('a[href*="/feed/update/"]');
    if (link) return link.href.split('?')[0];

    // Fallback: look for a time-based link that contains the activity URN
    const timeLink = el.querySelector('a[href*="urn:li:activity"]');
    if (timeLink) return timeLink.href.split('?')[0];

    // Generate a unique pseudo-URL using content hash so duplicates are caught
    const content = this.getContent(el);
    if (content) {
      const hash = this._simpleHash(content);
      return 'https://www.linkedin.com/feed/#ll-' + hash;
    }

    return '';
  },

  /**
   * Simple string hash for dedup when no URL is available
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  },

  getUrn(el) {
    // Check the element itself
    const attrs = ['data-urn', 'data-id'];
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (val && val.includes('urn:li:activity')) return val;
    }

    // Walk up the DOM tree (max 5 levels)
    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      for (const attr of attrs) {
        const val = parent.getAttribute(attr);
        if (val && val.includes('urn:li:activity')) return val;
      }
      parent = parent.parentElement;
      depth++;
    }

    // Walk down: check direct children
    const children = el.querySelectorAll('[data-urn*="urn:li:activity"], [data-id*="urn:li:activity"]');
    if (children.length > 0) {
      return children[0].getAttribute('data-urn') || children[0].getAttribute('data-id');
    }

    return '';
  },

  getTimestamp(el) {
    const timeEl = el.querySelector('time');
    if (timeEl) {
      return timeEl.getAttribute('datetime') || timeEl.textContent.trim();
    }
    const selectors = [
      '.update-components-actor__sub-description .visually-hidden',
      '.feed-shared-actor__sub-description span',
      'span.update-components-actor__sub-description'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node && node.textContent.trim()) {
        return node.textContent.trim();
      }
    }
    return '';
  },

  // ── Check if post already has our badge ──
  hasBadge(el) {
    return !!el.querySelector('.ll-sentiment-badge');
  },

  // ── Get the main feed container ──
  getFeedContainer() {
    const selectors = [
      'main.scaffold-layout__main',
      '.scaffold-layout__main',
      'div.scaffold-finite-scroll__content',
      '[role="main"]',
      'main'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  },

  // ── Get current post index closest to viewport center ──
  getCurrentPostIndex(posts) {
    const viewportCenter = window.innerHeight / 2;
    let closest = 0;
    let closestDist = Infinity;

    posts.forEach(function(post, i) {
      const rect = post.getBoundingClientRect();
      if (rect.height === 0) return;
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - viewportCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });

    return closest;
  }
};