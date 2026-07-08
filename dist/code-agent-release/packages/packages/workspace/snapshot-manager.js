import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export class WorkspaceSnapshotManager {
  constructor({ config, stateStore }) {
    this.config = config;
    this.stateStore = stateStore;
  }

  async captureSnapshot({ label = "" } = {}) {
    const files = [];
    for (const workspaceRoot of this.config.workspaceRoots || [this.config.projectRoot]) {
      await walkFiles(workspaceRoot, workspaceRoot, files, 400, this.config.projectRoot);
      if (files.length >= 400) {
        break;
      }
    }

    const entries = [];
    for (const fileRecord of files) {
      const absolutePath = fileRecord.absolutePath;
      const content = await fs.readFile(absolutePath);
      entries.push({
        path: fileRecord.snapshotPath,
        size: content.length,
        hash: crypto.createHash("sha1").update(content).digest("hex")
      });
    }

    const snapshot = {
      id: `snapshot_${Date.now()}`,
      createdAt: new Date().toISOString(),
      label: label || "workspace snapshot",
      fileCount: entries.length,
      entries
    };

    await this.stateStore.saveWorkspaceSnapshot(snapshot);
    return snapshot;
  }

  async diffSnapshots({ fromId = "", toId = "" } = {}) {
    const snapshots = await this.stateStore.listWorkspaceSnapshots();
    if (snapshots.length === 0) {
      return {
        ok: false,
        message: "No workspace snapshots exist."
      };
    }

    const toSnapshot = toId
      ? await this.stateStore.getWorkspaceSnapshot(toId)
      : snapshots[0];
    const fromSnapshot = fromId
      ? await this.stateStore.getWorkspaceSnapshot(fromId)
      : snapshots[1] || null;

    if (!toSnapshot) {
      return { ok: false, message: `Unknown target snapshot: ${toId}` };
    }

    if (!fromSnapshot) {
      return {
        ok: false,
        message: "Need at least two snapshots to compute a diff."
      };
    }

    const fromMap = new Map(fromSnapshot.entries.map((entry) => [entry.path, entry]));
    const toMap = new Map(toSnapshot.entries.map((entry) => [entry.path, entry]));

    const added = [];
    const modified = [];
    const removed = [];

    for (const [filePath, entry] of toMap) {
      const previous = fromMap.get(filePath);
      if (!previous) {
        added.push(filePath);
        continue;
      }
      if (previous.hash !== entry.hash || previous.size !== entry.size) {
        modified.push(filePath);
      }
    }

    for (const [filePath] of fromMap) {
      if (!toMap.has(filePath)) {
        removed.push(filePath);
      }
    }

    return {
      ok: true,
      from: {
        id: fromSnapshot.id,
        label: fromSnapshot.label,
        createdAt: fromSnapshot.createdAt
      },
      to: {
        id: toSnapshot.id,
        label: toSnapshot.label,
        createdAt: toSnapshot.createdAt
      },
      added,
      modified,
      removed
    };
  }
}

async function walkFiles(root, currentDir, output, limit, projectRoot) {
  if (output.length >= limit) {
    return;
  }

  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".coding-agent" || entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }

    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, absolute, output, limit, projectRoot);
      if (output.length >= limit) {
        return;
      }
      continue;
    }

    if (!/\.(js|ts|md|json)$/i.test(entry.name)) {
      continue;
    }

    output.push({
      absolutePath: absolute,
      snapshotPath: root === projectRoot
        ? path.relative(root, absolute)
        : `${path.basename(root)}/${path.relative(root, absolute)}`
    });
    if (output.length >= limit) {
      return;
    }
  }
}
