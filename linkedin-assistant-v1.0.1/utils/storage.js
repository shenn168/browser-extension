/*  ================================================
    LinkedLens — Storage Utility
    ================================================ */

const LLStorage = {
  async get(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  },

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async update(key, updater) {
    const current = await this.get(key);
    const updated = updater(current);
    await this.set(key, updated);
    return updated;
  },

  async getSettings() {
    return await this.get('ll_settings') || {};
  },

  async getLibrary() {
    return await this.get('ll_library') || [];
  },

  async getTracker() {
    return await this.get('ll_timeTracker') || {};
  },

  async getStats() {
    return await this.get('ll_stats') || {};
  }
};