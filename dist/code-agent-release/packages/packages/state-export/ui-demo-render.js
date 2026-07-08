export function renderStateUiDemoHtml({ uiPayload, stateIndex, title = "Code Agent UI Demo" }) {
  const embedded = escapeScript(JSON.stringify({ uiPayload, stateIndex }));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f4efe5;
      --ink: #192126;
      --muted: #61707a;
      --line: #d9c6a8;
      --card: rgba(255,250,241,0.92);
      --accent: #b14d2c;
      --accent2: #2f6864;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Palatino Linotype", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(177,77,44,0.14), transparent 24rem),
        radial-gradient(circle at bottom right, rgba(47,104,100,0.14), transparent 28rem),
        var(--bg);
    }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 18px 56px; }
    .hero, .panel, .card {
      border: 1px solid var(--line);
      background: var(--card);
    }
    .hero { padding: 22px; margin-bottom: 18px; }
    .eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); margin-bottom: 8px; }
    h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 48px); line-height: 1.02; }
    .sub { color: var(--muted); margin-bottom: 14px; }
    .badge { display: inline-block; border: 1px solid var(--ink); padding: 6px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 20px; }
    .card { padding: 16px; min-height: 140px; }
    .card-title { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .12em; margin-bottom: 10px; }
    .card-value { font-size: 30px; color: var(--accent); margin-bottom: 8px; }
    .card-detail { font-size: 14px; line-height: 1.4; color: var(--muted); word-break: break-word; }
    .columns { display: grid; gap: 16px; grid-template-columns: 1.2fr .8fr; margin-bottom: 20px; }
    .panel { padding: 16px; }
    .panel h2 { margin: 0 0 10px; font-size: 18px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { font-size: 12px; text-transform: uppercase; color: var(--muted); letter-spacing: .08em; }
    code { font-family: "SFMono-Regular", Menlo, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main id="app"></main>
  <script type="application/json" id="demo-data">${embedded}</script>
  <script>
    const payload = JSON.parse(document.getElementById("demo-data").textContent);
    const ui = payload.uiPayload || {};
    const index = payload.stateIndex || {};
    const cards = new Map((ui.cards || []).map((card) => [card.id, card]));
    const latestByKind = index.latestByKind || {};

    document.getElementById("app").innerHTML = [
      renderHero(ui),
      renderCards(ui.cards || []),
      renderSections(ui.sections || [], cards),
      renderArtifactIndex(index),
      renderLatestByKind(latestByKind)
    ].join("");

    function renderHero(ui) {
      const hero = ui.hero || {};
      const strategyMode = (ui.toolPolicy && ui.toolPolicy.strategyMode) || "balanced";
      return \`<section class="hero">
        <div class="eyebrow">\${escapeHtml(ui.schemaVersion || "code-agent-ui-state.v1")}</div>
        <h1>\${escapeHtml(hero.goal || "(none)")}</h1>
        <div class="sub">Workflow: \${escapeHtml(hero.workflowStatus || "(none)")}</div>
        <div class="badge">\${escapeHtml(hero.governanceLabel || "clear")}</div>
        <div class="sub">Strategy: \${escapeHtml(strategyMode)}</div>
      </section>\`;
    }

    function renderCards(items) {
      return \`<section class="grid">\${items.map((card) => \`<article class="card"><div class="card-title">\${escapeHtml(card.title || card.id || "Card")}</div><div class="card-value">\${escapeHtml(card.value || "")}</div><div class="card-detail">\${escapeHtml(card.detail || "")}</div></article>\`).join("")}</section>\`;
    }

    function renderSections(sections, cards) {
      return \`<section class="columns">\${sections.map((section) => {
        const lines = (section.cardIds || []).map((id) => {
          const card = cards.get(id);
          return card ? \`\${card.title}: \${card.value} (\${card.detail})\` : id;
        });
        if (section.reasonCodes?.length) lines.push(\`Reason codes: \${section.reasonCodes.join(", ")}\`);
        if (section.nextReadLabels?.length) lines.push(\`Next reads: \${section.nextReadLabels.join(", ")}\`);
        if (section.recommendedActions?.length) lines.push(\`Recommended actions: \${section.recommendedActions.map((item) => item.command ? \`\${item.label} [\${item.command}]\` : item.label).join(", ")}\`);
        return \`<section class="panel"><h2>\${escapeHtml(section.title || section.id || "Section")}</h2><ul>\${lines.map((line) => \`<li>\${escapeHtml(line)}</li>\`).join("")}</ul></section>\`;
      }).join("")}</section>\`;
    }

    function renderArtifactIndex(index) {
      const items = index.items || [];
      const badges = Object.entries(index.countsByKind || {}).map(([kind, count]) => \`<span class="badge">\${escapeHtml(kind)}: \${escapeHtml(String(count))}</span>\`).join("");
      const rows = items.slice(0, 12).map((item) => \`<tr><td>\${escapeHtml(item.kind || "")}</td><td>\${escapeHtml(item.title || "")}</td><td><code>\${escapeHtml(item.path || "")}</code></td><td>\${escapeHtml(item.schemaVersion || "")}</td></tr>\`).join("");
      return \`<section class="panel"><h2>State Artifact Index</h2><div>\${badges}</div><table><thead><tr><th>Kind</th><th>Title</th><th>Path</th><th>Schema</th></tr></thead><tbody>\${rows}</tbody></table></section>\`;
    }

    function renderLatestByKind(latestByKind) {
      const items = Object.entries(latestByKind).map(([kind, item]) => \`<li><strong>\${escapeHtml(kind)}</strong>: <code>\${escapeHtml((item && item.path) || "(none)")}</code></li>\`).join("");
      return \`<section class="panel"><h2>Latest By Kind</h2><ul>\${items}</ul></section>\`;
    }

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  </script>
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

function escapeScript(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
