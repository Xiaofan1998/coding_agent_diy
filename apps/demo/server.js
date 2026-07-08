#!/usr/bin/env node

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../../packages/shared/config.js";
import {
  EXTERNAL_ARTIFACT_ROOT_PREFIX,
  getArtifactDir,
  getArtifactRoutePrefix
} from "../../packages/shared/artifact-paths.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..", "..");
const config = loadConfig(projectRoot);
const port = Number(process.argv[2] || process.env.CODE_AGENT_DEMO_PORT || 4173);
const host = process.env.CODE_AGENT_DEMO_HOST || "127.0.0.1";
const artifactRoutes = {
  state: getArtifactRoutePrefix(config, "agent-state"),
  approvals: getArtifactRoutePrefix(config, "agent-approvals"),
  workflows: getArtifactRoutePrefix(config, "agent-workflows"),
  dashboard: getArtifactRoutePrefix(config, "agent-dashboard"),
  bundles: getArtifactRoutePrefix(config, "agent-bundles")
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    const requestPath = decodeURIComponent(url.pathname);
    if (requestPath === "/preview-state.json") {
      const model = await buildPreviewState(url.searchParams.get("state") || "");
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      });
      res.end(JSON.stringify(model, null, 2));
      return;
    }
    if (requestPath === "/") {
      await sendHomePage(res, url.searchParams.get("state") || "");
      return;
    }
    const targetPath = resolvePath(requestPath);
    const stat = await fs.stat(targetPath);

    if (stat.isDirectory()) {
      const indexPath = path.join(targetPath, "index.html");
      const indexStat = await tryStat(indexPath);
      if (indexStat?.isFile()) {
        await sendFile(indexPath, res);
        return;
      }
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("Directory listing is disabled.");
      return;
    }

    await sendFile(targetPath, res);
  } catch (error) {
    const statusCode = error && typeof error === "object" && error.code === "ENOENT" ? 404 : 500;
    res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
    res.end(statusCode === 404 ? "Not found." : `Server error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Code Agent demo server listening at http://${host}:${port}/\n`);
});

function resolvePath(requestPath) {
  const normalized = requestPath;
  if (normalized === `/${EXTERNAL_ARTIFACT_ROOT_PREFIX}` || normalized.startsWith(`/${EXTERNAL_ARTIFACT_ROOT_PREFIX}/`)) {
    const relative = normalized
      .slice(`/${EXTERNAL_ARTIFACT_ROOT_PREFIX}`.length)
      .replace(/^\/+/, "");
    const absolute = path.resolve(config.artifactRootDir, relative);
    if (!absolute.startsWith(path.resolve(config.artifactRootDir))) {
      throw new Error(`Path escapes artifact root: ${requestPath}`);
    }
    return absolute;
  }
  const absolute = path.resolve(projectRoot, `.${normalized}`);
  if (!absolute.startsWith(projectRoot)) {
    throw new Error(`Path escapes project root: ${requestPath}`);
  }
  return absolute;
}

async function sendHomePage(res, activeStateFilter) {
  const stateRoot = getArtifactDir(config, "agent-state");
  const stateFiles = await listRecentFiles(stateRoot, 20);
  const htmlStateFiles = stateFiles.filter((file) => file.name.endsWith(".html"));
  const jsonStateFiles = stateFiles.filter((file) => file.name.endsWith(".json"));
  const latestMachineState = await loadLatestMachineState(stateRoot);
  const latestUiState = await loadLatestUiState(stateRoot);
  const approvalFiles = await listRecentFiles(getArtifactDir(config, "agent-approvals"), 6);
  const workflowFiles = await listRecentFiles(getArtifactDir(config, "agent-workflows"), 6);
  const dashboardFiles = await listRecentFiles(getArtifactDir(config, "agent-dashboard"), 6);
  const attentionItems = [
    latestCard("Pending approval artifact", approvalFiles[0], artifactRoutes.approvals),
    latestCard("Workflow needing attention", workflowFiles[0], artifactRoutes.workflows)
  ].filter(Boolean);
  const latestCards = [
    latestCard("Latest Snapshot", jsonStateFiles.find((file) => file.name.includes("machine-state"))),
    latestCard("Latest UI State", jsonStateFiles.find((file) => file.name.includes("ui-state"))),
    latestCard("Latest Approval Artifact", approvalFiles[0], artifactRoutes.approvals),
    latestCard("Latest Workflow Artifact", workflowFiles[0], artifactRoutes.workflows)
  ].filter(Boolean);
  const filteredCards = filterCardsByState(latestCards, activeStateFilter);
  const filteredAttentionItems = filterAttentionItems(attentionItems, activeStateFilter);
  const filteredHtmlStateFiles = filterStateFilesByState(htmlStateFiles, activeStateFilter);
  const filteredJsonStateFiles = filterStateFilesByState(jsonStateFiles, activeStateFilter);
  const filterChips = renderStateFilterChips(activeStateFilter);
  const primaryEntryPoints = filterPrimaryEntryPoints(activeStateFilter);
  const auditSurfaces = filterAuditSurfaces(activeStateFilter);
  const recommendedActions = buildRecommendedActions(activeStateFilter, latestMachineState);
  const labels = buildStateLabels(activeStateFilter);
  const latestAuditCards = [
    latestCard("Latest Approval Audit", approvalFiles[0], artifactRoutes.approvals),
    latestCard("Latest Workflow Audit", workflowFiles[0], artifactRoutes.workflows),
    latestCard("Latest Dashboard Audit", dashboardFiles[0], artifactRoutes.dashboard)
  ].filter(Boolean);
  const filteredAuditCards = filterAuditCardsByState(latestAuditCards, activeStateFilter);
  const recentEvents = buildRecentEvents({
    activeStateFilter,
    latestMachineState,
    latestUiState,
    approvalFiles,
    workflowFiles,
    dashboardFiles,
    jsonStateFiles
  });
  const stateView = describeStateView(activeStateFilter, {
    latestMachineState,
    filteredCards,
    filteredAttentionItems,
    filteredAuditCards
  });
  const orderedSections = orderHomeSections(activeStateFilter, {
    uiState: renderLatestUiStateBlock(latestUiState, activeStateFilter),
    latestCards: `<section class="card-grid">${filteredCards.map(renderLatestCard).join("")}</section>`,
    stateSummary: `<section class="panel"><h2>${escapeHtml(labels.stateSummaryTitle)}</h2>${renderStateSummaryBlock(latestMachineState)}</section>`,
    attention: `<section class="panel"><h2>${escapeHtml(labels.attentionTitle)}</h2><ul>${filteredAttentionItems.length > 0
      ? filteredAttentionItems.map((item) => `<li><a href="${item.href}"><strong>${escapeHtml(item.label)}</strong></a>: <code>${escapeHtml(item.name)}</code></li>`).join("")
      : "<li>(none)</li>"}</ul></section>`,
    recentEvents: `<section class="panel"><h2>${escapeHtml(labels.recentEventsTitle)}</h2><ul>${recentEvents.length > 0
      ? recentEvents.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>(none)</li>"}</ul></section>`,
    recommendedActions: `<section class="panel"><h2>${escapeHtml(labels.recommendedActionsTitle)}</h2><div class="link-card-grid">${recommendedActions.map(renderLinkCard).join("")}</div></section>`,
    auditCards: `<section class="panel"><h2>${escapeHtml(labels.auditCardsTitle)}</h2><div class="link-card-grid">${filteredAuditCards.map(renderLinkCard).join("")}</div></section>`,
    lowerGrid: `<section class="grid">
      <section class="panel">
        <h2>${escapeHtml(labels.entryPointsTitle)}</h2>
        <div class="link-card-grid">
          ${primaryEntryPoints.map(renderLinkCard).join("")}
        </div>
      </section>
      <section class="panel">
        <h2>Recent HTML Views</h2>
        <ul>
          ${filteredHtmlStateFiles.length > 0
            ? filteredHtmlStateFiles.map((file) => `<li><a href="${artifactRoutes.state}${encodeURIComponent(file.name)}"><code>${escapeHtml(file.name)}</code></a></li>`).join("")
            : "<li>(none)</li>"}
        </ul>
      </section>
      <section class="panel">
        <h2>Recent JSON State Artifacts</h2>
        <ul>
          ${filteredJsonStateFiles.length > 0
            ? filteredJsonStateFiles.map((file) => `<li><a href="${artifactRoutes.state}${encodeURIComponent(file.name)}"><code>${escapeHtml(file.name)}</code></a></li>`).join("")
            : "<li>(none)</li>"}
        </ul>
      </section>
      <section class="panel">
        <h2>${escapeHtml(labels.auditSurfacesTitle)}</h2>
        <div class="link-card-grid">
          ${auditSurfaces.map(renderLinkCard).join("")}
        </div>
      </section>
    </section>`
  });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Code Agent Preview</title>
  <style>
    :root { --bg:#f5f0e6; --ink:#182126; --muted:#5d6972; --line:#d8c8ab; --card:#fffaf2; --accent:#b14d2c; --accent2:#2f6864; }
    body.state-approval-pending { --accent:#9c4c1c; --accent2:#7b5a12; }
    body.state-governance-hold { --accent:#8f2e2e; --accent2:#5c3f12; }
    body.state-clear { --accent:#2f6864; --accent2:#24504d; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Palatino Linotype", serif; color: var(--ink); background: var(--bg); }
    main { max-width: 1100px; margin: 0 auto; padding: 28px 18px 56px; }
    .hero, .panel, .card, .hero-card { border: 1px solid var(--line); background: var(--card); padding: 18px; margin-bottom: 16px; }
    .eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); margin-bottom: 8px; }
    h1, h2 { margin: 0 0 10px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 18px; }
    .section-card-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .link-card-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card h2 { font-size: 16px; margin-bottom: 8px; }
    .meta { color: var(--muted); font-size: 13px; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
    .chip { border: 1px solid var(--line); padding: 6px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
    .chip.active { border-color: var(--accent2); background: rgba(47,104,100,0.12); color: var(--ink); }
    .hero-card h2 { font-size: 26px; margin-bottom: 8px; }
    .hero-sub { color: var(--muted); margin-bottom: 10px; }
    code { font-family: "SFMono-Regular", Menlo, monospace; font-size: 12px; }
  </style>
</head>
<body class="state-${escapeHtml(activeStateFilter || "all")}">
  <main>
    <section class="hero">
      <div class="eyebrow">${escapeHtml(labels.heroEyebrow)}</div>
      <h1>Code Agent Preview Home</h1>
      <p>${stateView.heroText}</p>
    </section>
    <section class="panel">
      <h2>Status Filter</h2>
      <div class="chip-row">${filterChips}</div>
      <p>${renderFilterDescription(activeStateFilter)}</p>
      <p><strong>Visible cards:</strong> ${filteredCards.length} | <strong>Visible audits:</strong> ${filteredAuditCards.length} | <strong>Attention items:</strong> ${filteredAttentionItems.length}</p>
      <p><strong>Strategy mode:</strong> ${escapeHtml(latestMachineState?.toolPolicy?.strategyMode || "balanced")}</p>
      <p>${stateView.summaryText}</p>
    </section>
    ${orderedSections.join("\n")}
  </main>
</body>
</html>`;

  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(html);
}

async function buildPreviewState(activeStateFilter) {
  const stateRoot = getArtifactDir(config, "agent-state");
  const stateFiles = await listRecentFiles(stateRoot, 20);
  const htmlStateFiles = stateFiles.filter((file) => file.name.endsWith(".html"));
  const jsonStateFiles = stateFiles.filter((file) => file.name.endsWith(".json"));
  const latestMachineState = await loadLatestMachineState(stateRoot);
  const latestUiState = await loadLatestUiState(stateRoot);
  const approvalFiles = await listRecentFiles(getArtifactDir(config, "agent-approvals"), 6);
  const workflowFiles = await listRecentFiles(getArtifactDir(config, "agent-workflows"), 6);
  const dashboardFiles = await listRecentFiles(getArtifactDir(config, "agent-dashboard"), 6);

  const latestCards = [
    latestCard("Latest Snapshot", jsonStateFiles.find((file) => file.name.includes("machine-state"))),
    latestCard("Latest UI State", jsonStateFiles.find((file) => file.name.includes("ui-state"))),
    latestCard("Latest Approval Artifact", approvalFiles[0], artifactRoutes.approvals),
    latestCard("Latest Workflow Artifact", workflowFiles[0], artifactRoutes.workflows)
  ].filter(Boolean);
  const latestAuditCards = [
    latestCard("Latest Approval Audit", approvalFiles[0], artifactRoutes.approvals),
    latestCard("Latest Workflow Audit", workflowFiles[0], artifactRoutes.workflows),
    latestCard("Latest Dashboard Audit", dashboardFiles[0], artifactRoutes.dashboard)
  ].filter(Boolean);
  const attentionItems = [
    latestCard("Pending approval artifact", approvalFiles[0], artifactRoutes.approvals),
    latestCard("Workflow needing attention", workflowFiles[0], artifactRoutes.workflows)
  ].filter(Boolean);

  return {
    schemaVersion: "code-agent-preview-home.v1",
    generatedAt: new Date().toISOString(),
    stateFilter: activeStateFilter || "",
    labels: buildStateLabels(activeStateFilter),
    latestMachineState,
    latestUiState,
    latestCards: filterCardsByState(latestCards, activeStateFilter),
    latestAuditCards: filterAuditCardsByState(latestAuditCards, activeStateFilter),
    attentionItems: filterAttentionItems(attentionItems, activeStateFilter),
    primaryEntryPoints: filterPrimaryEntryPoints(activeStateFilter),
    auditSurfaces: filterAuditSurfaces(activeStateFilter),
    recommendedActions: buildRecommendedActions(activeStateFilter, latestMachineState),
    recentEvents: buildRecentEvents({
      activeStateFilter,
      latestMachineState,
      latestUiState,
      approvalFiles,
      workflowFiles,
      dashboardFiles,
      jsonStateFiles
    }),
    htmlArtifacts: filterStateFilesByState(htmlStateFiles, activeStateFilter),
    jsonArtifacts: filterStateFilesByState(jsonStateFiles, activeStateFilter)
  };
}

async function sendFile(filePath, res) {
  const body = await fs.readFile(filePath);
  res.writeHead(200, {
    "content-type": getContentType(filePath),
    "cache-control": "no-store"
  });
  res.end(body);
}

async function listRecentFiles(directory, limit) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const absolutePath = path.join(directory, entry.name);
      const stat = await fs.stat(absolutePath);
      files.push({
        name: entry.name,
        mtimeMs: stat.mtimeMs
      });
    }
    return files
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadLatestMachineState(stateRoot) {
  const files = await listRecentFiles(stateRoot, 20);
  const latest = files.find((file) => file.name.includes("machine-state") && file.name.endsWith(".json"));
  if (!latest) {
    return null;
  }
  const absolutePath = path.join(stateRoot, latest.name);
  const content = await fs.readFile(absolutePath, "utf8");
  return JSON.parse(content);
}

async function loadLatestUiState(stateRoot) {
  const files = await listRecentFiles(stateRoot, 20);
  const latest = files.find((file) => file.name.includes("ui-state") && file.name.endsWith(".json"));
  if (!latest) {
    return null;
  }
  const absolutePath = path.join(stateRoot, latest.name);
  const content = await fs.readFile(absolutePath, "utf8");
  return JSON.parse(content);
}

async function tryStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }
  if (extension === ".md") {
    return "text/markdown; charset=utf-8";
  }
  return "application/octet-stream";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function latestCard(label, file, basePath = artifactRoutes.state) {
  if (!file) {
    return null;
  }
  return {
    label,
    href: `${basePath}${encodeURIComponent(file.name)}`,
    name: file.name
  };
}

function renderLatestCard(card) {
  return `<article class="card">
    <div class="eyebrow">latest artifact</div>
    <h2>${escapeHtml(card.label)}</h2>
    <div class="meta"><a href="${card.href}"><code>${escapeHtml(card.name)}</code></a></div>
  </article>`;
}

function renderLinkCard(item) {
  return `<article class="card">
    <div class="eyebrow">entry point</div>
    <h2><a href="${item.href}">${escapeHtml(item.label)}</a></h2>
    <div class="meta"><code>${escapeHtml(item.href)}</code></div>
  </article>`;
}

function renderStateFilterChips(active) {
  const options = [
    { value: "", label: "all" },
    { value: "clear", label: "clear" },
    { value: "approval-pending", label: "approval-pending" },
    { value: "governance-hold", label: "governance-hold" },
    { value: "goal-blocked", label: "goal-blocked" }
  ];
  return options.map((option) => {
    const isActive = option.value === active || (!active && option.value === "");
    const href = option.value ? `/?state=${encodeURIComponent(option.value)}` : "/";
    return `<a class="chip${isActive ? " active" : ""}" href="${href}">${escapeHtml(option.label)}</a>`;
  }).join("");
}

function renderFilterDescription(active) {
  if (!active) {
    return "Showing all latest artifacts and attention items.";
  }
  if (active === "clear") {
    return "Showing calmer entry points and state views.";
  }
  return `Filtering the homepage for <strong>${escapeHtml(active)}</strong> governance conditions.`;
}

function describeStateView(active, { latestMachineState, filteredCards, filteredAttentionItems, filteredAuditCards }) {
  const governance = latestMachineState?.governance || {};
  if (active === "approval-pending") {
    return {
      heroText: "This filtered homepage prioritizes pending approvals, workflow blockers, and the audit surfaces needed to clear them.",
      summaryText: `Open approvals: ${governance.openApprovalCount ?? 0}. Approval-focused cards: ${filteredCards.length}. Approval/workflow audits: ${filteredAuditCards.length}.`
    };
  }
  if (active === "governance-hold") {
    return {
      heroText: "This filtered homepage emphasizes governance holds, blocked workflow execution, and the artifacts that explain why autonomy paused.",
      summaryText: `Governance-hold active: ${governance.governanceHoldActive ? "yes" : "no"}. Relevant cards: ${filteredCards.length}. Attention entries: ${filteredAttentionItems.length}.`
    };
  }
  if (active === "goal-blocked") {
    return {
      heroText: "This filtered homepage prioritizes goals that the runtime has formally marked blocked, along with the blocker evidence and recovery surfaces needed to resume progress.",
      summaryText: `Blocked goal active: ${governance.goalBlockedActive ? "yes" : "no"}. Blocker: ${governance.blockedGoalLastBlockerCode || "(none)"}. Recovery cards: ${filteredCards.length}.`
    };
  }
  if (active === "clear") {
    return {
      heroText: "This filtered homepage emphasizes calmer state snapshots, UI views, and baseline integration surfaces when no urgent governance action is active.",
      summaryText: `Open approvals: ${governance.openApprovalCount ?? 0}. Clear-state cards: ${filteredCards.length}. Audit highlights: ${filteredAuditCards.length}.`
    };
  }
  return {
    heroText: "Use this page as the starting point for docs, the demo app, and recent exported machine-state artifacts.",
    summaryText: `Current open approvals: ${governance.openApprovalCount ?? 0}. Total latest cards: ${filteredCards.length}.`
  };
}

function buildStateLabels(active) {
  if (active === "approval-pending") {
    return {
      heroEyebrow: "approval-pending view",
      stateSummaryTitle: "Approval State Summary",
      attentionTitle: "Approval Actions",
      recentEventsTitle: "Approval Events",
      recommendedActionsTitle: "Approval Next Actions",
      auditCardsTitle: "Approval-Focused Audit Artifacts",
      entryPointsTitle: "Approval Entry Points",
      auditSurfacesTitle: "Approval Audit Surfaces"
    };
  }
  if (active === "governance-hold") {
    return {
      heroEyebrow: "governance-hold view",
      stateSummaryTitle: "Governance Hold Summary",
      attentionTitle: "Blocked Actions",
      recentEventsTitle: "Governance Events",
      recommendedActionsTitle: "Governance Next Actions",
      auditCardsTitle: "Governance Audit Artifacts",
      entryPointsTitle: "Governance Entry Points",
      auditSurfacesTitle: "Governance Audit Surfaces"
    };
  }
  if (active === "goal-blocked") {
    return {
      heroEyebrow: "goal-blocked view",
      stateSummaryTitle: "Blocked Goal Summary",
      attentionTitle: "Blocked Goal Actions",
      recentEventsTitle: "Blocked Goal Events",
      recommendedActionsTitle: "Goal Recovery Actions",
      auditCardsTitle: "Blocked Goal Audit Artifacts",
      entryPointsTitle: "Goal Recovery Entry Points",
      auditSurfacesTitle: "Goal Recovery Surfaces"
    };
  }
  if (active === "clear") {
    return {
      heroEyebrow: "clear view",
      stateSummaryTitle: "Clear State Summary",
      attentionTitle: "No Immediate Actions",
      recentEventsTitle: "Recent State Events",
      recommendedActionsTitle: "Suggested Next Actions",
      auditCardsTitle: "Latest Audit Artifacts",
      entryPointsTitle: "Primary Entry Points",
      auditSurfacesTitle: "Audit Surfaces"
    };
  }
  return {
    heroEyebrow: "preview server",
    stateSummaryTitle: "Current State Summary",
    attentionTitle: "Attention Needed",
    recentEventsTitle: "Recent Events",
    recommendedActionsTitle: "Recommended Actions",
    auditCardsTitle: "Latest Audit Artifacts",
    entryPointsTitle: "Primary Entry Points",
    auditSurfacesTitle: "Audit Surfaces"
  };
}

function orderHomeSections(active, sections) {
  if (active === "approval-pending") {
    return [
      sections.attention,
      sections.recommendedActions,
      sections.auditCards,
      sections.uiState,
      sections.stateSummary,
      sections.recentEvents,
      sections.latestCards,
      sections.lowerGrid
    ];
  }
  if (active === "governance-hold") {
    return [
      sections.attention,
      sections.stateSummary,
      sections.auditCards,
      sections.recommendedActions,
      sections.uiState,
      sections.recentEvents,
      sections.latestCards,
      sections.lowerGrid
    ];
  }
  if (active === "goal-blocked") {
    return [
      sections.attention,
      sections.recommendedActions,
      sections.stateSummary,
      sections.auditCards,
      sections.uiState,
      sections.recentEvents,
      sections.latestCards,
      sections.lowerGrid
    ];
  }
  if (active === "clear") {
    return [
      sections.uiState,
      sections.latestCards,
      sections.recommendedActions,
      sections.stateSummary,
      sections.recentEvents,
      sections.auditCards,
      sections.lowerGrid
    ];
  }
  return [
    sections.uiState,
    sections.latestCards,
    sections.stateSummary,
    sections.attention,
    sections.recentEvents,
    sections.recommendedActions,
    sections.auditCards,
    sections.lowerGrid
  ];
}

function filterCardsByState(cards, active) {
  if (active === "goal-blocked") {
    return cards.filter((card) => card.label.includes("Snapshot") || card.label.includes("Workflow") || card.label.includes("Approval"));
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return cards.filter((card) => card.label.includes("Approval") || card.label.includes("Workflow"));
  }
  if (active === "clear") {
    return cards.filter((card) => card.label.includes("Snapshot") || card.label.includes("UI State"));
  }
  return cards;
}

function filterAttentionItems(items, active) {
  if (active === "goal-blocked") {
    return items;
  }
  if (active === "clear") {
    return [];
  }
  return items;
}

function filterPrimaryEntryPoints(active) {
  if (active === "goal-blocked") {
    return [
      { href: "/apps/demo/index.html", label: "Demo App" },
      { href: "/docs/machine-state-api.md", label: "Machine-State API Contract" },
      { href: artifactRoutes.approvals, label: "Approval Artifacts" },
      { href: artifactRoutes.workflows, label: "Workflow Artifacts" }
    ];
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return [
      { href: artifactRoutes.approvals, label: "Approval Artifacts" },
      { href: artifactRoutes.workflows, label: "Workflow Artifacts" },
      { href: "/docs/machine-state-api.md", label: "Machine-State API Contract" },
      { href: "/apps/demo/index.html", label: "Demo App" }
    ];
  }

  if (active === "clear") {
    return [
      { href: "/apps/demo/index.html", label: "Demo App" },
      { href: "/docs/integration-guide.md", label: "Integration Guide" },
      { href: "/docs/machine-state-api.md", label: "Machine-State API Contract" },
      { href: "/docs/README.md", label: "Docs Index" }
    ];
  }

  return [
    { href: "/apps/demo/index.html", label: "Demo App" },
    { href: "/docs/README.md", label: "Docs Index" },
    { href: "/docs/integration-guide.md", label: "Integration Guide" },
    { href: "/docs/machine-state-api.md", label: "Machine-State API Contract" }
  ];
}

function filterAuditSurfaces(active) {
  if (active === "goal-blocked") {
    return [
      { href: artifactRoutes.approvals, label: "Approval Artifacts" },
      { href: artifactRoutes.workflows, label: "Workflow Artifacts" },
      { href: artifactRoutes.dashboard, label: "Dashboard Artifacts" },
      { href: artifactRoutes.bundles, label: "Bundle Index Artifacts" }
    ];
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return [
      { href: artifactRoutes.approvals, label: "Approval Artifacts" },
      { href: artifactRoutes.workflows, label: "Workflow Artifacts" },
      { href: artifactRoutes.dashboard, label: "Dashboard Artifacts" }
    ];
  }

  if (active === "clear") {
    return [
      { href: artifactRoutes.dashboard, label: "Dashboard Artifacts" },
      { href: artifactRoutes.bundles, label: "Bundle Index Artifacts" },
      { href: artifactRoutes.workflows, label: "Workflow Artifacts" }
    ];
  }

  return [
    { href: artifactRoutes.approvals, label: "Approval Artifacts" },
    { href: artifactRoutes.workflows, label: "Workflow Artifacts" },
    { href: artifactRoutes.dashboard, label: "Dashboard Artifacts" },
    { href: artifactRoutes.bundles, label: "Bundle Index Artifacts" }
  ];
}

function filterAuditCardsByState(cards, active) {
  if (active === "goal-blocked") {
    return cards;
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return cards.filter((card) => card.label.includes("Approval") || card.label.includes("Workflow"));
  }
  if (active === "clear") {
    return cards.filter((card) => card.label.includes("Dashboard") || card.label.includes("Workflow"));
  }
  return cards;
}

function buildRecommendedActions(active, latestMachineState = null) {
  const machineActions = (latestMachineState?.recommendations?.recommendedActions || []).map((item) => ({
    href: "/apps/demo/index.html",
    label: item.command ? `${item.label} [${item.command}]` : item.label
  }));
  if (machineActions.length > 0) {
    return machineActions;
  }
  if (active === "goal-blocked") {
    return [
      { href: artifactRoutes.approvals, label: "Review Blocking Approvals" },
      { href: artifactRoutes.workflows, label: "Inspect Workflow Hold Evidence" },
      { href: "/docs/machine-state-api.md", label: "Review Machine-State API" }
    ];
  }
  if (active === "approval-pending") {
    return [
      { href: artifactRoutes.approvals, label: "Review Approval Artifacts" },
      { href: "/docs/machine-state-api.md", label: "Open Machine-State API Contract" },
      { href: "/apps/demo/index.html", label: "Inspect Demo App Payloads" }
    ];
  }
  if (active === "governance-hold") {
    return [
      { href: artifactRoutes.workflows, label: "Inspect Governed Workflow Artifacts" },
      { href: artifactRoutes.approvals, label: "Inspect Pending Approval Evidence" },
      { href: "/docs/integration-guide.md", label: "Review Integration Guide" }
    ];
  }
  if (active === "clear") {
    return [
      { href: "/apps/demo/index.html", label: "Open Demo App" },
      { href: "/docs/machine-state-api.md", label: "Review Machine-State API" },
      { href: "/docs/integration-guide.md", label: "Walk Through Integration Guide" }
    ];
  }
  return [
    { href: "/apps/demo/index.html", label: "Open Demo App" },
    { href: "/docs/README.md", label: "Browse Docs Index" },
    { href: "/docs/machine-state-api.md", label: "Review Machine-State API" }
  ];
}

function buildRecentEvents({ activeStateFilter, latestMachineState, latestUiState, approvalFiles, workflowFiles, dashboardFiles, jsonStateFiles }) {
  const governance = latestMachineState?.governance || {};
  const latestWorkflow = latestMachineState?.latestWorkflow || {};
  const events = [];

  if (activeStateFilter === "approval-pending" || (!activeStateFilter && governance.approvalPendingActive)) {
    events.push(`Pending approvals detected: ${(governance.openApprovalIds || []).join(", ") || "(none)"}.`);
  }
  if (activeStateFilter === "governance-hold" || (!activeStateFilter && governance.governanceHoldActive)) {
    events.push(`Governance hold active for workflow ${latestWorkflow.id || "(none)"}.`);
  }
  if (activeStateFilter === "goal-blocked" || (!activeStateFilter && governance.goalBlockedActive)) {
    events.push(`Goal blocked due to ${governance.blockedGoalLastBlockerCode || "(unknown blocker)"}: ${governance.blockedGoalLastBlockerMessage || "(none)"}.`);
  }
  if (latestUiState?.hero?.goal) {
    events.push(`Latest ui-state goal: ${latestUiState.hero.goal}.`);
  }
  if (approvalFiles[0]) {
    events.push(`Latest approval artifact: ${approvalFiles[0].name}.`);
  }
  if (workflowFiles[0]) {
    events.push(`Latest workflow artifact: ${workflowFiles[0].name}.`);
  }
  if (dashboardFiles[0]) {
    events.push(`Latest dashboard artifact: ${dashboardFiles[0].name}.`);
  }
  if (jsonStateFiles[0]) {
    events.push(`Latest state JSON: ${jsonStateFiles[0].name}.`);
  }
  return filterRecentEvents(events, activeStateFilter).slice(0, 6);
}

function filterRecentEvents(events, active) {
  if (active === "goal-blocked") {
    const filtered = events.filter((event) => {
      return event.includes("Goal blocked") || event.includes("approval") || event.includes("workflow");
    });
    return filtered.length > 0 ? filtered : events;
  }
  if (active === "approval-pending" || active === "governance-hold") {
    const filtered = events.filter((event) => {
      return event.includes("approval") || event.includes("workflow") || event.includes("Governance");
    });
    return filtered.length > 0 ? filtered : events;
  }
  if (active === "clear") {
    const filtered = events.filter((event) => {
      return event.includes("ui-state") || event.includes("state JSON") || event.includes("dashboard artifact");
    });
    return filtered.length > 0 ? filtered : events;
  }
  return events;
}

function filterStateFilesByState(files, active) {
  if (active === "goal-blocked") {
    return files.filter((file) => {
      return file.name.includes("machine-state") || file.name.includes("ui-state") || file.name.includes("workflow") || file.name.includes("approval");
    });
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return files.filter((file) => {
      return file.name.includes("approval") || file.name.includes("workflow");
    });
  }
  if (active === "clear") {
    return files.filter((file) => {
      return file.name.includes("machine-state") || file.name.includes("ui-state") || file.name.includes("state-index");
    });
  }
  return files;
}

function renderStateSummaryBlock(snapshot) {
  if (!snapshot) {
    return "<p>(no machine-state snapshot found)</p>";
  }
  const governance = snapshot.governance || {};
  const latestWorkflow = snapshot.latestWorkflow || {};
  const stateLabel = governance.goalBlockedActive
    ? "goal-blocked"
    : governance.governanceHoldActive
    ? "governance-hold"
    : (governance.approvalPendingActive ? "approval-pending" : "clear");
  const chips = ["clear", "approval-pending", "governance-hold", "goal-blocked"]
    .map((label) => `<span class="chip${label === stateLabel ? " active" : ""}">${escapeHtml(label)}</span>`)
    .join("");
  return `
    <div class="eyebrow">latest machine-state</div>
    <div class="chip-row">${chips}</div>
    <p><strong>Label:</strong> ${escapeHtml(stateLabel)}</p>
    <p><strong>Strategy mode:</strong> ${escapeHtml(snapshot.toolPolicy?.strategyMode || "balanced")}</p>
    <p><strong>Open approvals:</strong> ${escapeHtml(String(governance.openApprovalCount ?? 0))}</p>
    <p><strong>Goal blocked:</strong> ${escapeHtml(governance.goalBlockedActive ? "yes" : "no")}</p>
    <p><strong>Goal blocker:</strong> ${escapeHtml(governance.blockedGoalLastBlockerCode || "(none)")}</p>
    <p><strong>Latest workflow:</strong> ${escapeHtml(latestWorkflow.id || "(none)")} (${escapeHtml(latestWorkflow.status || "(none)")})</p>
    <p><strong>Reason codes:</strong> ${escapeHtml((governance.latestWorkflowReasonCodes || []).join(", ") || "(none)")}</p>
  `;
}

function renderLatestUiStateBlock(uiState, activeStateFilter) {
  if (!uiState) {
    return "";
  }
  const hero = uiState.hero || {};
  const allCards = uiState.cards || [];
  const cards = filterUiCards((uiState.cards || []).slice(0, 4), activeStateFilter);
  const sections = filterUiSections(uiState.sections || [], activeStateFilter);
  return `
    <section class="hero-card">
      <div class="eyebrow">latest ui-state</div>
      <h2>${escapeHtml(hero.goal || "(none)")}</h2>
      <div class="hero-sub">Workflow: ${escapeHtml(hero.workflowStatus || "(none)")} | Governance: ${escapeHtml(hero.governanceLabel || "clear")} | Strategy: ${escapeHtml(uiState.toolPolicy?.strategyMode || "balanced")}</div>
      <div class="card-grid">
        ${cards.map((card) => `<article class="card"><div class="eyebrow">${escapeHtml(card.title || card.id || "Card")}</div><h2>${escapeHtml(card.value || "")}</h2><div class="meta">${escapeHtml(card.detail || "")}</div></article>`).join("")}
      </div>
      <div class="grid">
        ${sections.map((section) => `<section class="panel"><h2>${escapeHtml(section.title || section.id || "Section")}</h2><div class="section-card-grid">${renderSectionCards(section, allCards)}</div></section>`).join("")}
      </div>
    </section>
  `;
}

function filterUiCards(cards, active) {
  if (active === "goal-blocked") {
    return cards.filter((card) => card.id === "goal-status" || card.id === "goal-recovery" || card.id === "workflow");
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return cards.filter((card) => card.id === "approvals" || card.id === "workflow");
  }
  if (active === "clear") {
    return cards.filter((card) => card.id === "plan" || card.id === "recommendations");
  }
  return cards;
}

function filterUiSections(sections, active) {
  if (active === "goal-blocked") {
    return sections.filter((section) => section.id === "governance" || section.id === "recommendations");
  }
  if (active === "approval-pending" || active === "governance-hold") {
    return sections.filter((section) => section.id === "governance" || section.id === "recommendations");
  }
  if (active === "clear") {
    return sections.filter((section) => section.id === "overview" || section.id === "recommendations");
  }
  return sections;
}

function renderSectionCards(section, cards) {
  const cardMap = new Map((cards || []).map((card) => [card.id, card]));
  const blocks = [];
  if (section.cardIds?.length) {
    blocks.push(...section.cardIds.map((id) => {
      const card = cardMap.get(id);
      if (!card) {
        return `<article class="card"><div class="eyebrow">Card</div><h2>${escapeHtml(id)}</h2></article>`;
      }
      return `<article class="card"><div class="eyebrow">${escapeHtml(card.title || card.id || "Card")}</div><h2>${escapeHtml(card.value || "")}</h2><div class="meta">${escapeHtml(card.detail || "")}</div></article>`;
    }));
  }
  if (section.reasonCodes?.length) {
    blocks.push(`<article class="card"><div class="eyebrow">Reason Codes</div><div class="meta">${escapeHtml(section.reasonCodes.join(", "))}</div></article>`);
  }
  if (section.nextReadLabels?.length) {
    blocks.push(`<article class="card"><div class="eyebrow">Next Reads</div><div class="meta">${escapeHtml(section.nextReadLabels.join(", "))}</div></article>`);
  }
  return blocks.join("");
}
