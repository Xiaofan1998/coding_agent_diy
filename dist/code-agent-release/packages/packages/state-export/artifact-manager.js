import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { buildStateSnapshot, buildStateSummary, buildStateUiPayload } from "./snapshot.js";
import { buildStateSnapshotSchema } from "./schema.js";
import { renderStateUiHtml } from "./html-render.js";
import { renderStateDemoHtml } from "./demo-render.js";
import { renderStateUiDemoHtml } from "./ui-demo-render.js";
import { buildArtifactLocation, getArtifactDir, resolveArtifactRecordPath } from "../shared/artifact-paths.js";

export class StateSnapshotArtifactManager {
  constructor({ config, stateStore }) {
    this.config = config;
    this.stateStore = stateStore;
    this.artifactDir = getArtifactDir(config, "agent-state");
  }

  async getSnapshot() {
    return buildStateSnapshot({
      config: this.config,
      stateStore: this.stateStore
    });
  }

  async getSchema() {
    return buildStateSnapshotSchema();
  }

  async getSummary() {
    return buildStateSummary({
      config: this.config,
      stateStore: this.stateStore
    });
  }

  async getUiPayload() {
    return buildStateUiPayload({
      config: this.config,
      stateStore: this.stateStore
    });
  }

  async exportSnapshot({ title = "" } = {}) {
    const generatedAt = new Date().toISOString();
    const snapshot = await buildStateSnapshot({
      config: this.config,
      stateStore: this.stateStore,
      generatedAt
    });
    const safeTitle = slugify(title || "state-snapshot").slice(0, 80) || "state-snapshot";
    const timestamp = generatedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-state", `${timestamp}-${safeTitle}.json`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, JSON.stringify(snapshot, null, 2), "utf8");

    const record = {
      id: `statesnapshot_${crypto.randomUUID()}`,
      createdAt: generatedAt,
      title: title || "state snapshot",
      kind: "snapshot",
      path: storedPath,
      schemaVersion: snapshot.schemaVersion,
      governanceSummary: snapshot.governance,
      latestWorkflow: snapshot.latestWorkflow
    };

    await this.stateStore.saveStateSnapshotArtifact(record);
    return record;
  }

  async exportUiPayload({ title = "" } = {}) {
    const generatedAt = new Date().toISOString();
    const payload = await buildStateUiPayload({
      config: this.config,
      stateStore: this.stateStore,
      generatedAt
    });
    const safeTitle = slugify(title || "ui-state").slice(0, 80) || "ui-state";
    const timestamp = generatedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-state", `${timestamp}-${safeTitle}.json`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, JSON.stringify(payload, null, 2), "utf8");

    const record = {
      id: `statesnapshot_${crypto.randomUUID()}`,
      createdAt: generatedAt,
      title: title || "ui state",
      path: storedPath,
      kind: "ui",
      schemaVersion: payload.schemaVersion,
      governanceSummary: payload.governance,
      latestWorkflow: payload.latestWorkflow
    };

    await this.stateStore.saveStateSnapshotArtifact(record);
    return record;
  }

  async exportUiHtml({ title = "" } = {}) {
    const generatedAt = new Date().toISOString();
    const payload = await buildStateUiPayload({
      config: this.config,
      stateStore: this.stateStore,
      generatedAt
    });
    const safeTitle = slugify(title || "ui-state-html").slice(0, 80) || "ui-state-html";
    const timestamp = generatedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-state", `${timestamp}-${safeTitle}.html`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, renderStateUiHtml(payload, { title: title || "Code Agent UI State" }), "utf8");

    const record = {
      id: `statesnapshot_${crypto.randomUUID()}`,
      createdAt: generatedAt,
      title: title || "ui state html",
      path: storedPath,
      kind: "ui-html",
      schemaVersion: payload.schemaVersion,
      governanceSummary: payload.governance,
      latestWorkflow: payload.latestWorkflow
    };

    await this.stateStore.saveStateSnapshotArtifact(record);
    return record;
  }

  async exportUiDemo({ title = "" } = {}) {
    const generatedAt = new Date().toISOString();
    const uiPayload = await buildStateUiPayload({
      config: this.config,
      stateStore: this.stateStore,
      generatedAt
    });
    const stateIndex = await this.getArtifactIndex();
    const safeTitle = slugify(title || "ui-demo").slice(0, 80) || "ui-demo";
    const timestamp = generatedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-state", `${timestamp}-${safeTitle}.html`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, renderStateUiDemoHtml({ uiPayload, stateIndex, title: title || "Code Agent UI Demo" }), "utf8");

    const record = {
      id: `statesnapshot_${crypto.randomUUID()}`,
      createdAt: generatedAt,
      title: title || "ui demo overview",
      path: storedPath,
      kind: "ui-demo-html",
      schemaVersion: uiPayload.schemaVersion,
      governanceSummary: uiPayload.governance,
      latestWorkflow: uiPayload.latestWorkflow
    };

    await this.stateStore.saveStateSnapshotArtifact(record);
    return record;
  }

  async exportArtifactIndex({ title = "" } = {}) {
    const generatedAt = new Date().toISOString();
    const index = await this.getArtifactIndex();
    const safeTitle = slugify(title || "state-index").slice(0, 80) || "state-index";
    const timestamp = generatedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-state", `${timestamp}-${safeTitle}.json`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, JSON.stringify(index, null, 2), "utf8");

    const record = {
      id: `statesnapshot_${crypto.randomUUID()}`,
      createdAt: generatedAt,
      title: title || "state artifact index",
      kind: "index",
      path: storedPath,
      schemaVersion: index.schemaVersion
    };

    await this.stateStore.saveStateSnapshotArtifact(record);
    return record;
  }

  async exportDemoOverview({ title = "" } = {}) {
    const generatedAt = new Date().toISOString();
    const stateIndex = await this.getArtifactIndex();
    const docsIndexMarkdown = await fs.readFile(path.join(this.config.projectRoot, "docs", "README.md"), "utf8");
    const safeTitle = slugify(title || "state-demo").slice(0, 80) || "state-demo";
    const timestamp = generatedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-state", `${timestamp}-${safeTitle}.html`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, renderStateDemoHtml({ docsIndexMarkdown, stateIndex, title: title || "Code Agent Integration Demo" }), "utf8");

    const record = {
      id: `statesnapshot_${crypto.randomUUID()}`,
      createdAt: generatedAt,
      title: title || "state demo overview",
      kind: "demo-html",
      path: storedPath,
      schemaVersion: stateIndex.schemaVersion
    };

    await this.stateStore.saveStateSnapshotArtifact(record);
    return record;
  }

  async diffSnapshots({ fromId = "", toId = "" } = {}) {
    const fromSnapshot = fromId
      ? await this.readSnapshotArtifactPayload(fromId)
      : await this.readLatestSnapshotArtifactPayload();
    const toSnapshot = toId
      ? await this.readSnapshotArtifactPayload(toId)
      : await this.getSnapshot();

    if (!fromSnapshot) {
      throw new Error("No baseline machine-state snapshot artifact is available for diffing.");
    }

    return buildSnapshotDiff(fromSnapshot, toSnapshot);
  }

  async getArtifactIndex() {
    const artifacts = await this.stateStore.listStateSnapshotArtifacts();
    const items = artifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind || "snapshot",
      title: artifact.title,
      path: artifact.path,
      schemaVersion: artifact.schemaVersion || "(unknown)",
      governanceSummary: artifact.governanceSummary || null,
      latestWorkflow: artifact.latestWorkflow || null
    }));
    return {
      schemaVersion: "code-agent-state-artifact-index.v1",
      generatedAt: new Date().toISOString(),
      countsByKind: countArtifactsByKind(items),
      latestByKind: buildLatestByKind(items),
      items
    };
  }

  async readLatestSnapshotArtifactPayload() {
    const latest = (await this.stateStore.listStateSnapshotArtifacts())[0] || null;
    if (!latest) {
      return null;
    }
    return this.readSnapshotArtifactPayload(latest.id);
  }

  async readSnapshotArtifactPayload(id) {
    const record = await this.stateStore.getStateSnapshotArtifact(id);
    if (!record) {
      return null;
    }
    const absolutePath = resolveArtifactRecordPath(this.config, record.path);
    const content = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(content);
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSnapshotDiff(fromSnapshot, toSnapshot) {
  const changes = [];

  compareField(changes, "governance.openApprovalCount", fromSnapshot.governance?.openApprovalCount, toSnapshot.governance?.openApprovalCount);
  compareField(changes, "governance.latestWorkflowStatus", fromSnapshot.governance?.latestWorkflowStatus, toSnapshot.governance?.latestWorkflowStatus);
  compareField(changes, "governance.latestWorkflowReasonCodes", fromSnapshot.governance?.latestWorkflowReasonCodes || [], toSnapshot.governance?.latestWorkflowReasonCodes || []);
  compareField(changes, "plan.completed", fromSnapshot.plan?.completed, toSnapshot.plan?.completed);
  compareField(changes, "counts.reviews", fromSnapshot.counts?.reviews, toSnapshot.counts?.reviews);
  compareField(changes, "counts.approvalRequests", fromSnapshot.counts?.approvalRequests, toSnapshot.counts?.approvalRequests);
  compareField(changes, "recommendations.suggestedFirstTools", fromSnapshot.recommendations?.suggestedFirstTools || [], toSnapshot.recommendations?.suggestedFirstTools || []);
  compareField(changes, "recommendations.suggestedNextReadLabels", fromSnapshot.recommendations?.suggestedNextReadLabels || [], toSnapshot.recommendations?.suggestedNextReadLabels || []);
  compareField(changes, "artifactCoverage.missing", fromSnapshot.artifactCoverage?.missing || [], toSnapshot.artifactCoverage?.missing || []);

  return {
    schemaVersion: "code-agent-state-diff.v1",
    from: {
      generatedAt: fromSnapshot.generatedAt,
      schemaVersion: fromSnapshot.schemaVersion
    },
    to: {
      generatedAt: toSnapshot.generatedAt,
      schemaVersion: toSnapshot.schemaVersion
    },
    changed: changes.length > 0,
    summary: buildDiffSummary(changes),
    changes
  };
}

function compareField(changes, field, fromValue, toValue) {
  const left = JSON.stringify(fromValue);
  const right = JSON.stringify(toValue);
  if (left !== right) {
    changes.push({
      field,
      from: fromValue,
      to: toValue
    });
  }
}

function buildDiffSummary(changes) {
  if (changes.length === 0) {
    return {
      changedFields: 0,
      highlights: ["No tracked state fields changed."],
      categories: [],
      byCategory: {}
    };
  }

  const highlights = [];
  const categories = new Set();
  const byCategory = {};

  for (const change of changes) {
    const category = change.field.split(".")[0];
    categories.add(category);
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(change.field);

    if (change.field === "governance.openApprovalCount") {
      highlights.push(`Open approvals changed from ${change.from} to ${change.to}.`);
      continue;
    }
    if (change.field === "governance.latestWorkflowStatus") {
      highlights.push(`Latest workflow status changed from ${stringOrNone(change.from)} to ${stringOrNone(change.to)}.`);
      continue;
    }
    if (change.field === "governance.latestWorkflowReasonCodes") {
      highlights.push(`Latest workflow reason codes changed to ${(change.to || []).join(", ") || "(none)"}.`);
      continue;
    }
    if (change.field === "plan.completed") {
      highlights.push(`Completed plan items changed from ${change.from} to ${change.to}.`);
      continue;
    }
    if (change.field === "counts.approvalRequests") {
      highlights.push(`Approval request count changed from ${change.from} to ${change.to}.`);
      continue;
    }
    if (change.field === "recommendations.suggestedFirstTools") {
      highlights.push(`Suggested first tools changed to ${(change.to || []).join(", ") || "(none)"}.`);
      continue;
    }
    if (change.field === "artifactCoverage.missing") {
      highlights.push(`Missing artifacts changed to ${(change.to || []).join(", ") || "(none)"}.`);
      continue;
    }
  }

  if (highlights.length === 0) {
    highlights.push(`${changes.length} tracked state field(s) changed.`);
  }

  return {
    changedFields: changes.length,
    highlights,
    categories: [...categories],
    byCategory
  };
}

function stringOrNone(value) {
  return value === null || value === undefined || value === "" ? "(none)" : String(value);
}

function countArtifactsByKind(items) {
  const counts = {};
  for (const item of items) {
    counts[item.kind] = (counts[item.kind] || 0) + 1;
  }
  return counts;
}

function buildLatestByKind(items) {
  const latest = {};
  for (const item of items) {
    if (!latest[item.kind]) {
      latest[item.kind] = item;
    }
  }
  return latest;
}
