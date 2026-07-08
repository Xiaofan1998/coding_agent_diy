const uiFileInput = document.getElementById("ui-file");
const indexFileInput = document.getElementById("index-file");
const loadPreviewButton = document.getElementById("load-preview-btn");
const previewFilterSelect = document.getElementById("preview-filter");
const previewUrlInput = document.getElementById("preview-url");
const uiUrlInput = document.getElementById("ui-url");
const indexUrlInput = document.getElementById("index-url");
const fetchButton = document.getElementById("fetch-btn");

const statusEl = document.getElementById("status");
const summaryBarEl = document.getElementById("summary-bar");
const filterPillsEl = document.getElementById("filter-pills");
const heroEl = document.getElementById("hero");
const cardsEl = document.getElementById("cards");
const sectionsEl = document.getElementById("sections");
const latestByKindEl = document.getElementById("latest-by-kind");
const countsByKindEl = document.getElementById("counts-by-kind");
const governanceJsonEl = document.getElementById("governance-json");

const state = {
  previewMeta: null,
  uiPayload: null,
  stateIndex: null
};

uiFileInput.addEventListener("change", async (event) => {
  state.uiPayload = await readJsonFile(event.target.files?.[0]);
  render();
});

indexFileInput.addEventListener("change", async (event) => {
  state.stateIndex = await readJsonFile(event.target.files?.[0]);
  render();
});

previewFilterSelect.addEventListener("change", async () => {
  await refreshPreviewStateForCurrentFilter();
});

loadPreviewButton.addEventListener("click", async () => {
  try {
    await refreshPreviewStateForCurrentFilter();
  } catch (error) {
    setStatus(`Preview load failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});

fetchButton.addEventListener("click", async () => {
  try {
    if (previewUrlInput.value.trim()) {
      const preview = await fetchJson(previewUrlInput.value.trim());
      applyPreviewState(preview);
    }
    if (uiUrlInput.value.trim()) {
      state.uiPayload = await fetchJson(uiUrlInput.value.trim());
    }
    if (indexUrlInput.value.trim()) {
      state.stateIndex = await fetchJson(indexUrlInput.value.trim());
    }
    render();
  } catch (error) {
    setStatus(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});

render();
restoreFilterFromLocation();
autoLoadPreviewStateOnStartup();

function render() {
  if (!state.uiPayload && !state.stateIndex) {
    setStatus("Waiting for machine-state payloads.", false);
    hideData();
    return;
  }

  renderSummaryBar();
  renderFilterPills();

  const ui = state.uiPayload;
  const index = state.stateIndex;

  if (ui) {
    renderHero(ui);
    renderCards(ui.cards || []);
    renderSections(ui.sections || [], ui.cards || []);
    governanceJsonEl.textContent = JSON.stringify(ui.governance || {}, null, 2);
    heroEl.classList.remove("hidden");
    cardsEl.classList.remove("hidden");
    sectionsEl.classList.remove("hidden");
  } else {
    heroEl.classList.add("hidden");
    cardsEl.classList.add("hidden");
    sectionsEl.classList.add("hidden");
    governanceJsonEl.textContent = "{}";
  }

  if (index) {
    renderList(latestByKindEl, Object.entries(index.latestByKind || {}).map(([kind, item]) => `${kind}: ${item.path || "(none)"}`));
    renderList(countsByKindEl, Object.entries(index.countsByKind || {}).map(([kind, count]) => `${kind}: ${count}`));
  } else {
    renderList(latestByKindEl, []);
    renderList(countsByKindEl, []);
  }

  const uiVersion = ui?.schemaVersion || "(none)";
  const indexVersion = index?.schemaVersion || "(none)";
  const filter = state.previewMeta?.stateFilter || "(none)";
  setStatus(`Loaded ui-state ${uiVersion} and state-index ${indexVersion} (filter: ${filter}).`, false);
}

function applyPreviewState(preview) {
  state.previewMeta = {
    schemaVersion: preview.schemaVersion || "(none)",
    stateFilter: preview.stateFilter || "",
    htmlCount: (preview.htmlArtifacts || []).length,
    jsonCount: (preview.jsonArtifacts || []).length
  };
  state.uiPayload = preview.latestUiState || null;
  state.stateIndex = deriveStateIndexFromPreview(preview);
}

async function autoLoadPreviewStateOnStartup() {
  try {
    if (state.uiPayload || state.stateIndex) {
      return;
    }
    await refreshPreviewStateForCurrentFilter();
  } catch {
    // Ignore startup fetch failures and fall back to manual loading.
  }
}

async function refreshPreviewStateForCurrentFilter() {
  syncPreviewUrlWithFilter({ force: true });
  const preview = await fetchJson(resolvePreviewUrl());
  applyPreviewState(preview);
  render();
}

function resolvePreviewUrl() {
  if (previewUrlInput.value.trim()) {
    return previewUrlInput.value.trim();
  }
  const filter = previewFilterSelect.value;
  return filter ? `/preview-state.json?state=${encodeURIComponent(filter)}` : "/preview-state.json";
}

function syncPreviewUrlWithFilter({ force = false } = {}) {
  if (!force && previewUrlInput.value.trim()) {
    return;
  }
  const filter = previewFilterSelect.value;
  previewUrlInput.value = filter ? `/preview-state.json?state=${encodeURIComponent(filter)}` : "/preview-state.json";
  syncLocationWithFilter(filter);
}

function syncLocationWithFilter(filter) {
  const url = new URL(window.location.href);
  if (filter) {
    url.searchParams.set("state", filter);
  } else {
    url.searchParams.delete("state");
  }
  window.history.replaceState({}, "", url);
}

function restoreFilterFromLocation() {
  const url = new URL(window.location.href);
  const filter = url.searchParams.get("state") || "";
  if (filter) {
    previewFilterSelect.value = filter;
  }
}

function hideData() {
  summaryBarEl.classList.add("hidden");
  filterPillsEl.classList.add("hidden");
  heroEl.classList.add("hidden");
  cardsEl.classList.add("hidden");
  sectionsEl.classList.add("hidden");
  governanceJsonEl.textContent = "{}";
  renderList(latestByKindEl, []);
  renderList(countsByKindEl, []);
}

function renderSummaryBar() {
  const uiVersion = state.uiPayload?.schemaVersion || "(none)";
  const indexVersion = state.stateIndex?.schemaVersion || "(none)";
  const filter = state.previewMeta?.stateFilter || "(none)";
  const htmlCount = state.previewMeta?.htmlCount ?? 0;
  const jsonCount = state.previewMeta?.jsonCount ?? 0;
  const source = previewUrlInput.value.trim() || "/preview-state.json";

  summaryBarEl.innerHTML = [
    renderPill("Filter", filter),
    renderPill("Source", source),
    renderPill("UI Schema", uiVersion),
    renderPill("Index Schema", indexVersion),
    renderPill("HTML Artifacts", String(htmlCount)),
    renderPill("JSON Artifacts", String(jsonCount))
  ].join("");
  summaryBarEl.classList.remove("hidden");
}

function renderFilterPills() {
  const active = state.previewMeta?.stateFilter || "";
  const options = [
    { value: "", label: "all" },
    { value: "clear", label: "clear" },
    { value: "approval-pending", label: "approval-pending" },
    { value: "governance-hold", label: "governance-hold" },
    { value: "goal-blocked", label: "goal-blocked" }
  ];

  filterPillsEl.innerHTML = options.map((option) => {
    const isActive = option.value === active || (!active && option.value === "");
    return `<button type="button" class="pill filter-pill${isActive ? " active" : ""}" data-filter="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`;
  }).join("");
  filterPillsEl.classList.remove("hidden");

  for (const button of filterPillsEl.querySelectorAll("[data-filter]")) {
    button.addEventListener("click", async () => {
      previewFilterSelect.value = button.getAttribute("data-filter") || "";
      try {
        await refreshPreviewStateForCurrentFilter();
      } catch (error) {
        setStatus(`Preview load failed: ${error instanceof Error ? error.message : String(error)}`, true);
      }
    }, { once: true });
  }
}

function renderHero(ui) {
  const hero = ui.hero || {};
  heroEl.innerHTML = `
    <div class="eyebrow">${escapeHtml(ui.schemaVersion || "code-agent-ui-state.v1")}</div>
    <h2>${escapeHtml(hero.goal || "(none)")}</h2>
    <p class="sub">Workflow: ${escapeHtml(hero.workflowStatus || "(none)")}</p>
    <div class="badge">${escapeHtml(hero.governanceLabel || "clear")}</div>
  `;
}

function renderCards(cards) {
  cardsEl.innerHTML = cards.map((card) => `
    <article class="card">
      <div class="card-title">${escapeHtml(card.title || card.id || "Card")}</div>
      <div class="card-value">${escapeHtml(card.value || "")}</div>
      <div class="card-detail">${escapeHtml(card.detail || "")}</div>
    </article>
  `).join("");
}

function renderSections(sections, cards) {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  sectionsEl.innerHTML = sections.map((section) => {
    const items = (section.cardIds || []).map((id) => {
      const card = cardMap.get(id);
      if (!card) {
        return `<article class="card"><div class="card-title">${escapeHtml(id)}</div></article>`;
      }
      return `
        <article class="card">
          <div class="card-title">${escapeHtml(card.title || card.id || "Card")}</div>
          <div class="card-value">${escapeHtml(card.value || "")}</div>
          <div class="card-detail">${escapeHtml(card.detail || "")}</div>
        </article>
      `;
    });
    if (section.reasonCodes?.length) {
      items.push(`
        <article class="card">
          <div class="card-title">Reason Codes</div>
          <div class="card-detail">${escapeHtml(section.reasonCodes.join(", "))}</div>
        </article>
      `);
    }
    if (section.nextReadLabels?.length) {
      items.push(`
        <article class="card">
          <div class="card-title">Next Reads</div>
          <div class="card-detail">${escapeHtml(section.nextReadLabels.join(", "))}</div>
        </article>
      `);
    }
    if (section.recommendedActions?.length) {
      items.push(`
        <article class="card">
          <div class="card-title">Recommended Actions</div>
          <div class="card-detail">${escapeHtml(section.recommendedActions.map((item) => `${item.label}${item.command ? ` [${item.command}]` : ""}`).join(", "))}</div>
        </article>
      `);
    }
    return `
      <section class="panel">
        <h3>${escapeHtml(section.title || section.id || "Section")}</h3>
        <div class="section-card-grid">${items.join("")}</div>
      </section>
    `;
  }).join("");
}

function renderList(element, lines) {
  element.innerHTML = lines.length
    ? lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")
    : "<li>(none)</li>";
}

async function readJsonFile(file) {
  if (!file) {
    return null;
  }
  return JSON.parse(await file.text());
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function deriveStateIndexFromPreview(preview) {
  const htmlArtifacts = preview.htmlArtifacts || [];
  const jsonArtifacts = preview.jsonArtifacts || [];

  return {
    schemaVersion: "code-agent-preview-derived-index.v1",
    countsByKind: {
      html: htmlArtifacts.length,
      json: jsonArtifacts.length
    },
    latestByKind: {
      html: htmlArtifacts[0] ? { path: htmlArtifacts[0].name } : null,
      json: jsonArtifacts[0] ? { path: jsonArtifacts[0].name } : null
    }
  };
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", Boolean(isError));
}

function renderPill(label, value) {
  return `<span class="pill"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
