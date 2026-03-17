const Exporter = {
  toJSON(data, notes) {
    const exported = data.map(item => ({
      ...item,
      userNote: notes[item.id] || ""
    }));
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json"
    });
    this._download(blob, "ml-knowledge-base.json");
  },

  toMarkdown(data, notes) {
    let md = "# ML Knowledge Explorer — Knowledge Base\
\
";
    const categories = [...new Set(data.map(d => d.category))];

    categories.forEach(cat => {
      md += `## ${cat}\
\
`;
      data
        .filter(d => d.category === cat)
        .forEach(item => {
          md += `### ${item.name}\
`;
          md += `**Definition:** ${item.definition}\
\n`;
          md += `**Use Cases:** ${item.useCases.join(", ")}\
\n`;
          md += `**Examples:** ${item.examples.join(", ")}\
\
`;
          if (item.links.length > 0) {
            md += `**Links:**\
`;
            item.links.forEach(l => (md += `- [${l.label}](${l.url})\n`));
          }
          if (notes[item.id]) {
            md += `\n**My Notes:** ${notes[item.id]}\
`;
          }
          md += "\
---\
\n";
        });
    });

    const blob = new Blob([md], { type: "text/markdown" });
    this._download(blob, "ml-knowledge-base.md");
  },

  toPDF(data, notes) {
    const printWindow = window.open("", "_blank");
    let html = `
      <html>
      <head>
        <title>ML Knowledge Base</title>
        <style>
          body { font-family: Inter, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { color: #6c63ff; border-bottom: 2px solid #6c63ff; }
          h2 { color: #4a90d9; margin-top: 40px; }
          h3 { color: #333; margin-top: 20px; }
          .tag { background: #eee; border-radius: 4px; padding: 2px 8px; font-size: 12px; margin-right: 4px; }
          .note { background: #fff8e1; border-left: 4px solid #ffc107; padding: 8px 12px; margin-top: 8px; }
          hr { border: none; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <h1>ML Knowledge Explorer</h1>
        <p>Exported on ${new Date().toLocaleDateString()}</p>
    `;

    const categories = [...new Set(data.map(d => d.category))];
    categories.forEach(cat => {
      html += `<h2>${cat}</h2>`;
      data
        .filter(d => d.category === cat)
        .forEach(item => {
          html += `<h3>${item.name}</h3>`;
          html += `<p><strong>Definition:</strong> ${item.definition}</p>`;
          html += `<p><strong>Use Cases:</strong> ${item.useCases.join(" • ")}</p>`;
          html += `<p><strong>Examples:</strong> ${item.examples.map(e => `<span class='tag'>${e}</span>`).join(" ")}</p>`;
          if (notes[item.id]) {
            html += `<div class='note'>📝 <strong>My Note:</strong> ${notes[item.id]}</div>`;
          }
          html += `<hr/>`;
        });
    });

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  },

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};