export function renderStateDemoHtml({ docsIndexMarkdown, stateIndex, title = "Code Agent Integration Demo" }) {
  const items = stateIndex.items || [];
  const latestByKind = stateIndex.latestByKind || {};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --bg:#f5f0e6; --ink:#182126; --muted:#5d6972; --line:#d8c8ab; --card:#fffaf2; --accent:#b14d2c; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Palatino Linotype", serif; color: var(--ink); background: var(--bg); }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 18px 56px; }
    .hero, .panel { border: 1px solid var(--line); background: var(--card); padding: 18px; margin-bottom: 16px; }
    .eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); margin-bottom: 8px; }
    h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 46px); }
    h2 { margin: 0 0 10px; font-size: 18px; }
    .grid { display: grid; gap: 14px; grid-template-columns: 1.2fr .8fr; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { font-size: 12px; text-transform: uppercase; color: var(--muted); letter-spacing: .08em; }
    .badge { display: inline-block; border: 1px solid var(--ink); padding: 6px 10px; font-size: 12px; margin: 0 8px 8px 0; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; color: var(--muted); }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">integration demo</div>
      <h1>${escapeHtml(title)}</h1>
      <div>Static overview linking docs and exported machine-state artifacts.</div>
    </section>

    <section class="grid">
      <section class="panel">
        <h2>Artifact Index</h2>
        <div>${Object.entries(stateIndex.countsByKind || {}).map(([kind, count]) => `<span class="badge">${escapeHtml(kind)}: ${escapeHtml(String(count))}</span>`).join("")}</div>
        <table>
          <thead><tr><th>Kind</th><th>Title</th><th>Path</th><th>Schema</th></tr></thead>
          <tbody>
            ${items.slice(0, 12).map((item) => `<tr><td>${escapeHtml(item.kind)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.path)}</td><td>${escapeHtml(item.schemaVersion)}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
      <section class="panel">
        <h2>Latest By Kind</h2>
        <ul>
          ${Object.entries(latestByKind).map(([kind, item]) => `<li><strong>${escapeHtml(kind)}</strong>: ${escapeHtml(item.path || "(none)")}</li>`).join("")}
        </ul>
      </section>
    </section>

    <section class="panel">
      <h2>Docs Index</h2>
      <pre>${escapeHtml(docsIndexMarkdown)}</pre>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
