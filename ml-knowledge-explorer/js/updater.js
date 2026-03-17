const Updater = {
  WIKIPEDIA_API: "https://en.wikipedia.org/w/api.php",

  async isOnline() {
    return navigator.onLine;
  },

  async checkForNewTypes(existingNames) {
    const queries = [
      "machine learning types",
      "types of machine learning algorithms",
      "machine learning paradigms"
    ];

    const found = [];

    for (const query of queries) {
      try {
        const url = `${this.WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&format=json&origin=*&srlimit=10`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.query && data.query.search) {
          for (const item of data.query.search) {
            const title = item.title;
            const snippet = item.snippet.replace(/<[^>]+>/g, "");

            const isMlRelated =
              title.toLowerCase().includes("learning") ||
              title.toLowerCase().includes("machine") ||
              snippet.toLowerCase().includes("machine learning");

            const isNew = !existingNames.some(
              name => name.toLowerCase() === title.toLowerCase()
            );

            if (isMlRelated && isNew) {
              const alreadyAdded = found.some(f => f.name === title);
              if (!alreadyAdded) {
                found.push({
                  id: title.toLowerCase().replace(/\s+/g, "-"),
                  name: title,
                  category: "Emerging & Specialized",
                  definition: snippet,
                  useCases: ["To be researched"],
                  examples: ["To be researched"],
                  links: [
                    {
                      label: "Wikipedia",
                      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
                        title
                      )}`
                    }
                  ],
                  isNew: true
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Update check failed for query:", query, err);
      }
    }

    return found;
  }
};