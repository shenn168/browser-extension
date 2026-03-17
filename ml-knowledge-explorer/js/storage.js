const Storage = {
  async get(key) {
    return new Promise(resolve => {
      chrome.storage.local.get(key, result => resolve(result[key]));
    });
  },

  async set(key, value) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  async getFavorites() {
    return (await this.get("favorites")) || [];
  },

  async toggleFavorite(id) {
    const favs = await this.getFavorites();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id);
    else favs.splice(idx, 1);
    await this.set("favorites", favs);
    return favs;
  },

  async getNotes() {
    return (await this.get("notes")) || {};
  },

  async saveNote(id, text) {
    const notes = await this.getNotes();
    notes[id] = text;
    await this.set("notes", notes);
  },

  async getCustomEntries() {
    return (await this.get("customEntries")) || [];
  },

  async saveCustomEntries(entries) {
    await this.set("customEntries", entries);
  },

  async getTheme() {
    return (await this.get("theme")) || "dark";
  },

  async setTheme(theme) {
    await this.set("theme", theme);
  },

  async getPendingUpdates() {
    return (await this.get("pendingUpdates")) || [];
  },

  async setPendingUpdates(updates) {
    await this.set("pendingUpdates", updates);
  },

  async clearPendingUpdates() {
    await this.set("pendingUpdates", []);
  }
};