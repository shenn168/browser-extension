/*  ================================================
    LinkedLens — LinkedIn DOM Parser
    ================================================
    Robust selectors for extracting data from
    LinkedIn's feed. Uses multiple fallback strategies.
    ================================================ */

const LLParser = {

  // ── Get all visible feed posts ──
  getPosts() {
    const selectors = [
      '.feed-shared-update-v2',
      '[data-urn*="urn:li:activity"]',
      '.occludable-update',
      'div[data-id*="urn:li:activity"]'
    ];

    for (const sel of selectors) {
      const posts = document.querySelectorAll(sel);
      if (posts.length > 0) return Array.from(posts);
    }
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
      '.feed-shared-actor__name',
      '.update-components-actor__title .visually-hidden',
      'a[data-control-name="actor"] span'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node && node.textContent.trim()) {
        return node.textContent.trim().replace(/\s+/g, ' ');
      }
    }
    return 'Unknown Author';
  },

  getHeadline(el) {
    const selectors = [
      '.update-components-actor__description .visually-hidden',
      '.update-components-actor__description span[aria-hidden="true"]',
      '.feed-shared-actor__description',
      '.update-components-actor__supplementary-actor-info'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node && node.textContent.trim()) {
        return node.textContent.trim().replace(/\s+/g, ' ');
      }
    }
    return '';
  },

  getContent(el) {
    const selectors = [
      '.feed-shared-update-v2__description',
      '.update-components-text',
      '.feed-shared-text',
      '.break-words',
      '[data-test-id="main-feed-activity-card__commentary"]'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node && node.textContent.trim()) {
        return node.textContent.trim().replace(/\s+/g, ' ');
      }
    }
    return '';
  },

  getPostUrl(el) {
    const urn = this.getUrn(el);
    if (urn) {
      const activityId = urn.split(':').pop();
      return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    }
    // Fallback: look for a permalink
    const link = el.querySelector('a[href*="/feed/update/"]');
    if (link) return link.href.split('?')[0];
    return window.location.href;
  },

  getUrn(el) {
    // Check data attributes
    const urn = el.getAttribute('data-urn') || el.getAttribute('data-id');
    if (urn) return urn;

    // Check parent chain
    let parent = el;
    while (parent) {
      const d = parent.getAttribute('data-urn') || parent.getAttribute('data-id');
      if (d && d.includes('urn:li:activity')) return d;
      parent = parent.parentElement;
    }
    return '';
  },

  getTimestamp(el) {
    const selectors = [
      '.update-components-actor__sub-description .visually-hidden',
      'time',
      '.feed-shared-actor__sub-description span'
    ];
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      if (node) {
        const dt = node.getAttribute('datetime');
        if (dt) return dt;
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
      '.scaffold-layout__main',
      'main.scaffold-layout__main',
      '[role="main"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  },

  // ── Get current post (for keyboard nav) ──
  getCurrentPostIndex(posts) {
    const viewportCenter = window.innerHeight / 2;
    let closest = 0;
    let closestDist = Infinity;

    posts.forEach((post, i) => {
      const rect = post.getBoundingClientRect();
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