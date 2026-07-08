export function renderStateUiHtml(payload, { title = "Code Agent UI State" } = {}) {
  const hero = payload.hero || {};
  const cards = payload.cards || [];
  const sections = payload.sections || [];
  const governance = payload.governance || {};
  const recommendations = payload.recommendations || {};
  const latestWorkflow = payload.latestWorkflow || {};
  const strategyMode = payload.toolPolicy?.strategyMode || "balanced";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --bg:#f3efe4; --ink:#1d252b; --muted:#5d6972; --card:#fffaf2; --line:#d7cbb0; --accent:#b04d28; --accent2:#2f6762; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Palatino Linotype", serif;
      background:
        radial-gradient(circle at top left, rgba(176,77,40,0.14), transparent 26rem),
        radial-gradient(circle at bottom right, rgba(47,103,98,0.14), transparent 30rem),
        var(--bg);
      color: var(--ink);
    }
    main { max-width: 1100px; margin: 0 auto; padding: 28px 18px 50px; }
    .hero { border: 1px solid var(--line); background: rgba(255,250,242,0.96); padding: 22px; margin-bottom: 18px; }
    .eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); margin-bottom: 8px; }
    h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 44px); line-height: 1.03; }
    .sub { color: var(--muted); margin-bottom: 14px; }
    .badge { display: inline-block; border: 1px solid var(--ink); padding: 6px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .grid, .sections { display: grid; gap: 14px; }
    .grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 22px; }
    .sections { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 22px; }
    .card, .panel { border: 1px solid var(--line); background: var(--card); padding: 16px; }
    .card-title { font-size: 12px; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); margin-bottom: 10px; }
    .card-value { font-size: 30px; color: var(--accent); margin-bottom: 8px; }
    .card-detail, .panel ul { color: var(--muted); font-size: 14px; line-height: 1.4; }
    .panel h2 { margin: 0 0 10px; font-size: 18px; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">code-agent-ui-state.v1</div>
      <h1>${escapeHtml(hero.goal || "(none)")}</h1>
      <div class="sub">Workflow: ${escapeHtml(hero.workflowStatus || "(none)")}</div>
      <div class="badge">${escapeHtml(hero.governanceLabel || "clear")}</div>
      <div class="sub">Strategy: ${escapeHtml(strategyMode)}</div>
    </section>
    <section class="grid">${cards.map(renderCard).join("\n")}</section>
    <section class="sections">${sections.map((section) => renderSection(section, cards)).join("\n")}</section>
    <section class="panel"><h2>Governance</h2><pre>${escapeHtml(JSON.stringify(governance, null, 2))}</pre></section>
    <section class="panel"><h2>Recommendations</h2><pre>${escapeHtml(JSON.stringify(recommendations, null, 2))}</pre></section>
    <section class="panel"><h2>Latest Workflow</h2><pre>${escapeHtml(JSON.stringify(latestWorkflow, null, 2))}</pre></section>
  </main>
</body>
</html>`;
}

function renderCard(card) {
  return `<article class="card"><div class="card-title">${escapeHtml(card.title || card.id || "Card")}</div><div class="card-value">${escapeHtml(card.value || "")}</div><div class="card-detail">${escapeHtml(card.detail || "")}</div></article>`;
}

function renderSection(section, cards) {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const items = (section.cardIds || []).map((id) => {
    const card = cardMap.get(id);
    return card ? `${card.title}: ${card.value} (${card.detail})` : id;
  });
  if (section.reasonCodes?.length) {
    items.push(`Reason codes: ${section.reasonCodes.join(", ")}`);
  }
  if (section.nextReadLabels?.length) {
    items.push(`Next reads: ${section.nextReadLabels.join(", ")}`);
  }
  if (section.recommendedActions?.length) {
    items.push(`Recommended actions: ${section.recommendedActions.map((item) => item.command ? `${item.label} [${item.command}]` : item.label).join(", ")}`);
  }
  return `<section class="panel"><h2>${escapeHtml(section.title || section.id || "Section")}</h2><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
