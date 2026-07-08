import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureDir, hashString, readJson } from "../shared/fs-utils.js";

export class SqliteStateStore {
  constructor(config) {
    this.config = config;
    this.sessionId = hashString(config.projectRoot);
    this.dbFile = path.join(config.stateDir, "state.db");
    this.legacyJsonFile = path.join(config.stateDir, "state.json");
    this.db = null;
  }

  static async create(config) {
    const store = new SqliteStateStore(config);
    await ensureDir(config.stateDir);
    store.open();
    store.bootstrapSchema();
    await store.migrateLegacyJsonIfPresent();
    store.ensureSession();
    return store;
  }

  open() {
    this.db = new DatabaseSync(this.dbFile);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
  }

  bootstrapSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_root TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS runtime_settings (
        session_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        role TEXT NOT NULL,
        user_message TEXT NOT NULL,
        response TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS plan_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        objective TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        turn_count INTEGER NOT NULL DEFAULT 0,
        block_count INTEGER NOT NULL DEFAULT 0,
        completion_criteria TEXT,
        last_blocker_code TEXT,
        last_blocker_message TEXT
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        scope TEXT NOT NULL,
        content TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS subagents (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plan_runs (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        findings_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS plan_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        path TEXT NOT NULL,
        item_count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        review_id TEXT NOT NULL,
        review_kind TEXT NOT NULL,
        review_status TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspace_snapshots (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        label TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        path TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trace_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        trace_count INTEGER NOT NULL,
        trace_ids_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboard_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS bundle_index_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS approval_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        approval_id TEXT,
        workflow_id TEXT,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS state_snapshot_artifacts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );
    `);

    ensureColumn(this.db, "review_artifacts", "workflow_id", "TEXT");
    ensureColumn(this.db, "trace_artifacts", "workflow_id", "TEXT");
    ensureColumn(this.db, "plan_artifacts", "workflow_id", "TEXT");
    ensureColumn(this.db, "goals", "last_blocker_code", "TEXT");
    ensureColumn(this.db, "goals", "last_blocker_message", "TEXT");
  }

  ensureSession() {
    this.db
      .prepare(`
        INSERT INTO sessions (id, project_root, summary)
        VALUES (?, ?, '')
        ON CONFLICT(id) DO NOTHING
      `)
      .run(this.sessionId, this.config.projectRoot);
  }

  async migrateLegacyJsonIfPresent() {
    const legacy = await readJson(this.legacyJsonFile, null);
    if (!legacy) {
      return;
    }

    const hasExistingData = this.db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count > 0;
    if (hasExistingData) {
      return;
    }

    this.db.exec("BEGIN");
    try {
      for (const session of Object.values(legacy.sessions || {})) {
        this.db
          .prepare("INSERT OR REPLACE INTO sessions (id, project_root, summary) VALUES (?, ?, ?)")
          .run(session.id, session.projectRoot, session.summary || "");

        (session.turns || []).forEach((turn) => {
          this.db
            .prepare(`
              INSERT INTO turns (session_id, created_at, role, user_message, response)
              VALUES (?, ?, ?, ?, ?)
            `)
            .run(
              session.id,
              turn.createdAt || new Date().toISOString(),
              turn.role || "user",
              turn.userMessage || "",
              turn.response || ""
            );
        });

        (session.activePlanItems || []).forEach((item, index) => {
          this.db
            .prepare(`
              INSERT INTO plan_items (session_id, sort_order, content, status)
              VALUES (?, ?, ?, ?)
            `)
            .run(session.id, index, item.content, item.status);
        });
      }

      for (const goal of legacy.goals || []) {
        this.db
          .prepare(`
            INSERT OR REPLACE INTO goals
            (id, objective, status, created_at, updated_at, turn_count, block_count, completion_criteria, last_blocker_code, last_blocker_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            goal.id,
            goal.objective,
            goal.status,
            goal.createdAt,
            goal.updatedAt,
            goal.turnCount || 0,
            goal.blockCount || 0,
            goal.completionCriteria || null,
            goal.lastBlockerCode || null,
            goal.lastBlockerMessage || null
          );
      }

      for (const memory of legacy.memories || []) {
        this.db
          .prepare(`
            INSERT OR REPLACE INTO memories (id, created_at, scope, content, tags_json)
            VALUES (?, ?, ?, ?, ?)
          `)
          .run(
            memory.id,
            memory.createdAt,
            memory.scope,
            memory.content,
            JSON.stringify(memory.tags || [])
          );
      }

      for (const record of Object.values(legacy.subagents || {})) {
        this.db
          .prepare(`
            INSERT OR REPLACE INTO subagents (id, created_at, payload_json)
            VALUES (?, ?, ?)
          `)
          .run(record.id, record.createdAt || new Date().toISOString(), JSON.stringify(record));
      }

      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async getSession() {
    const session = this.db
      .prepare("SELECT id, project_root, summary FROM sessions WHERE id = ?")
      .get(this.sessionId);

    const turns = await this.listTurns(30, "asc");

    const activePlanItems = await this.getPlanItems();

    return {
      id: session.id,
      projectRoot: session.project_root,
      turns,
      summary: session.summary || "",
      activePlanItems
    };
  }

  async appendTurn(turn) {
    this.db
      .prepare(`
        INSERT INTO turns (session_id, created_at, role, user_message, response)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        this.sessionId,
        turn.createdAt,
        turn.role || "user",
        turn.userMessage,
        turn.response
      );

    const ids = this.db
      .prepare(`
        SELECT id FROM turns
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT -1 OFFSET 30
      `)
      .all(this.sessionId)
      .map((row) => row.id);

    if (ids.length > 0) {
      this.db.prepare(`DELETE FROM turns WHERE id IN (${ids.map(() => "?").join(",")})`).run(...ids);
    }

    return this.getSession();
  }

  async listTurns(limit = 10, order = "desc") {
    const normalizedOrder = order === "asc" ? "ASC" : "DESC";
    const turns = this.db
      .prepare(`
        SELECT created_at, role, user_message, response
        FROM turns
        WHERE session_id = ?
        ORDER BY id ${normalizedOrder}
        LIMIT ?
      `)
      .all(this.sessionId, limit)
      .map((row) => ({
        createdAt: row.created_at,
        role: row.role,
        userMessage: row.user_message,
        response: row.response
      }));

    return normalizedOrder === "DESC" ? turns : turns;
  }

  async saveSummary(summary) {
    this.db.prepare("UPDATE sessions SET summary = ? WHERE id = ?").run(summary, this.sessionId);
    return summary;
  }

  async getRuntimeSettings() {
    const row = this.db
      .prepare(`
        SELECT payload_json
        FROM runtime_settings
        WHERE session_id = ?
      `)
      .get(this.sessionId);

    return row ? JSON.parse(row.payload_json) : {};
  }

  async saveRuntimeSettings(settings) {
    const current = await this.getRuntimeSettings();
    const next = {
      ...current,
      ...settings
    };

    this.db
      .prepare(`
        INSERT OR REPLACE INTO runtime_settings (session_id, payload_json)
        VALUES (?, ?)
      `)
      .run(this.sessionId, JSON.stringify(next));

    return next;
  }

  async getPlanItems() {
    return this.db
      .prepare(`
        SELECT content, status
        FROM plan_items
        WHERE session_id = ?
        ORDER BY sort_order ASC, id ASC
      `)
      .all(this.sessionId)
      .map((row) => ({
        content: row.content,
        status: row.status
      }));
  }

  async updatePlan(items) {
    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM plan_items WHERE session_id = ?").run(this.sessionId);
      items.forEach((item, index) => {
        this.db
          .prepare(`
            INSERT INTO plan_items (session_id, sort_order, content, status)
            VALUES (?, ?, ?, ?)
          `)
          .run(this.sessionId, index, item.content, item.status);
      });
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getPlanItems();
  }

  async updatePlanItemStatus(index, status) {
    const items = await this.getPlanItems();
    const resolvedIndex = Number(index);
    if (!Number.isInteger(resolvedIndex) || resolvedIndex < 1 || resolvedIndex > items.length) {
      throw new Error(`Plan item index out of range: ${index}`);
    }

    const nextItems = items.map((item, itemIndex) => {
      if ((itemIndex + 1) !== resolvedIndex) {
        return item;
      }
      return {
        ...item,
        status
      };
    });

    await this.updatePlan(nextItems);
    return nextItems[resolvedIndex - 1];
  }

  async resetBlockedPlanItems() {
    const items = await this.getPlanItems();
    const nextItems = items.map((item) => {
      return item.status === "blocked"
        ? { ...item, status: "pending" }
        : item;
    });

    await this.updatePlan(nextItems);
    return nextItems;
  }

  async createGoal(objective) {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE goals
        SET status = 'cancelled', updated_at = ?
        WHERE status = 'active'
      `)
      .run(now);

    const goal = {
      id: `goal_${Date.now()}`,
      objective,
      status: "active",
      createdAt: now,
      updatedAt: now,
      turnCount: 0,
      blockCount: 0,
      lastBlockerCode: null,
      lastBlockerMessage: null
    };

    this.db
      .prepare(`
        INSERT INTO goals (id, objective, status, created_at, updated_at, turn_count, block_count, completion_criteria, last_blocker_code, last_blocker_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(goal.id, goal.objective, goal.status, goal.createdAt, goal.updatedAt, 0, 0, null, null, null);

    return goal;
  }

  async getGoal(id) {
    const row = this.db
      .prepare(`
        SELECT id, objective, status, created_at, updated_at, turn_count, block_count, completion_criteria
             , last_blocker_code, last_blocker_message
        FROM goals
        WHERE id = ?
        LIMIT 1
      `)
      .get(id);

    return row ? mapGoal(row) : null;
  }

  async getActiveGoal() {
    const row = this.db
      .prepare(`
        SELECT id, objective, status, created_at, updated_at, turn_count, block_count, completion_criteria
             , last_blocker_code, last_blocker_message
        FROM goals
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get();

    return row ? mapGoal(row) : null;
  }

  async listGoals(limit = 20) {
    return this.db
      .prepare(`
        SELECT id, objective, status, created_at, updated_at, turn_count, block_count, completion_criteria
             , last_blocker_code, last_blocker_message
        FROM goals
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(limit)
      .map(mapGoal);
  }

  async updateGoalStatus(status, id = "") {
    const goal = id ? await this.getGoal(id) : await this.getActiveGoal();
    if (!goal) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare("UPDATE goals SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, updatedAt, goal.id);

    return {
      ...goal,
      status,
      updatedAt
    };
  }

  async resumeGoal(id) {
    const goal = await this.getGoal(id);
    if (!goal) {
      return null;
    }

    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE goals
        SET status = 'cancelled', updated_at = ?
        WHERE status = 'active' AND id <> ?
      `)
      .run(now, id);
    this.db
      .prepare(`
        UPDATE goals
        SET status = 'active', updated_at = ?, block_count = 0, last_blocker_code = NULL, last_blocker_message = NULL
        WHERE id = ?
      `)
      .run(now, id);

    return {
      ...goal,
      status: "active",
      updatedAt: now,
      blockCount: 0,
      lastBlockerCode: null,
      lastBlockerMessage: null
    };
  }

  async recordGoalBlocker({ code, message }) {
    const goal = await this.getActiveGoal();
    if (!goal) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    const nextCount = goal.lastBlockerCode === code ? (goal.blockCount || 0) + 1 : 1;
    const nextStatus = nextCount >= 3 ? "blocked" : goal.status;

    this.db
      .prepare(`
        UPDATE goals
        SET block_count = ?, last_blocker_code = ?, last_blocker_message = ?, status = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(nextCount, code, message || null, nextStatus, updatedAt, goal.id);

    return {
      ...goal,
      blockCount: nextCount,
      lastBlockerCode: code,
      lastBlockerMessage: message || null,
      status: nextStatus,
      updatedAt
    };
  }

  async clearGoalBlocker(id = "") {
    const goal = id ? await this.getGoal(id) : await this.getActiveGoal();
    if (!goal) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE goals
        SET block_count = 0, last_blocker_code = NULL, last_blocker_message = NULL, updated_at = ?
        WHERE id = ?
      `)
      .run(updatedAt, goal.id);

    return {
      ...goal,
      blockCount: 0,
      lastBlockerCode: null,
      lastBlockerMessage: null,
      updatedAt
    };
  }

  async incrementGoalTurn() {
    const goal = await this.getActiveGoal();
    if (!goal) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE goals
        SET turn_count = turn_count + 1, updated_at = ?
        WHERE id = ?
      `)
      .run(updatedAt, goal.id);

    return {
      ...goal,
      turnCount: goal.turnCount + 1,
      updatedAt
    };
  }

  async saveMemory(memory) {
    const record = {
      id: `memory_${Date.now()}`,
      createdAt: new Date().toISOString(),
      scope: memory.scope,
      content: memory.content,
      tags: memory.tags || []
    };

    this.db
      .prepare(`
        INSERT INTO memories (id, created_at, scope, content, tags_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.scope, record.content, JSON.stringify(record.tags));

    return record;
  }

  async searchMemories(query) {
    const lowered = query.toLowerCase();
    return this.db
      .prepare(`
        SELECT id, created_at, scope, content, tags_json
        FROM memories
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        scope: row.scope,
        content: row.content,
        tags: JSON.parse(row.tags_json || "[]")
      }))
      .filter((memory) => JSON.stringify(memory).toLowerCase().includes(lowered));
  }

  async saveSubagentRecord(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO subagents (id, created_at, payload_json)
        VALUES (?, ?, ?)
      `)
      .run(record.id, record.createdAt || new Date().toISOString(), JSON.stringify(record));

    return record;
  }

  async savePlanRun(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO plan_runs (id, created_at, payload_json)
        VALUES (?, ?, ?)
      `)
      .run(record.id, record.createdAt || new Date().toISOString(), JSON.stringify(record));

    return record;
  }

  async listPlanRuns() {
    return this.db
      .prepare(`
        SELECT id, created_at, payload_json
        FROM plan_runs
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        ...JSON.parse(row.payload_json)
      }));
  }

  async listPlanRunsByWorkflow(workflowId) {
    return (await this.listPlanRuns()).filter((record) => record.workflowId === workflowId);
  }

  async getPlanRun(recordId) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, payload_json
        FROM plan_runs
        WHERE id = ?
      `)
      .get(recordId);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      ...JSON.parse(row.payload_json)
    };
  }

  async getPlanRunBundle(recordId) {
    const planRun = await this.getPlanRun(recordId);
    if (!planRun) {
      return null;
    }

    const workflow = planRun.workflowId ? await this.getWorkflowRun(planRun.workflowId) : null;
    const workflowBundle = workflow ? await this.getWorkflowBundle(workflow.id) : null;
    const linkedSubagents = await Promise.all(
      (planRun.results || [])
        .map((item) => item.recordId)
        .filter(Boolean)
        .map((recordId) => this.getSubagentRecord(recordId))
    );

    return {
      ...planRun,
      workflow,
      workflowBundle,
      linkedSubagents: linkedSubagents.filter(Boolean)
    };
  }

  async getCurrentPlanSummary() {
    const [planItems, latestPlanRun] = await Promise.all([
      this.getPlanItems(),
      this.listPlanRuns().then((items) => items[0] || null)
    ]);

    const items = [];
    for (let index = 0; index < planItems.length; index += 1) {
      const planItem = planItems[index];
      const latestResult = latestPlanRun?.results?.[index] || null;
      const linkedSubagent = latestResult?.recordId
        ? await this.getSubagentRecord(latestResult.recordId)
        : null;

      items.push({
        index: index + 1,
        content: planItem.content,
        status: planItem.status,
        latestExecutionStatus: latestResult?.status || null,
        latestExecutionSummary: latestResult?.summary || null,
        latestSubagentRecordId: latestResult?.recordId || null,
        latestSubagentReviewStatus: linkedSubagent?.reviewStatus || null
      });
    }

    return {
      planItemCount: planItems.length,
      completedPlanItemCount: planItems.filter((item) => item.status === "completed" || item.status === "skipped").length,
      pendingSubagentReviewCount: items.filter((item) => {
        return item.latestSubagentRecordId && (!item.latestSubagentReviewStatus || item.latestSubagentReviewStatus === "pending");
      }).length,
      latestPlanRunId: latestPlanRun?.id || null,
      latestPlanRunMode: latestPlanRun?.mode || null,
      latestPlanRunCreatedAt: latestPlanRun?.createdAt || null,
      items
    };
  }

  async listSubagentRecords() {
    return this.db
      .prepare(`
        SELECT id, created_at, payload_json
        FROM subagents
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        ...JSON.parse(row.payload_json)
      }));
  }

  async getSubagentRecord(recordId) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, payload_json
        FROM subagents
        WHERE id = ?
      `)
      .get(recordId);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      ...JSON.parse(row.payload_json)
    };
  }

  async updateSubagentReviewStatus(recordId, reviewStatus, reviewNote = "") {
    const record = await this.getSubagentRecord(recordId);
    if (!record) {
      return null;
    }

    const updatedRecord = {
      ...record,
      reviewStatus,
      reviewNote: reviewNote || "",
      reviewedAt: new Date().toISOString()
    };
    await this.saveSubagentRecord(updatedRecord);
    return updatedRecord;
  }

  async getSubagentSummary(limit = 5) {
    const records = await this.listSubagentRecords();
    const items = records.slice(0, limit);
    const countsByStatus = {};
    const countsByReviewStatus = {};
    for (const record of records) {
      const status = record.result?.status || record.status || "unknown";
      countsByStatus[status] = (countsByStatus[status] || 0) + 1;
      const reviewStatus = record.reviewStatus || "unreviewed";
      countsByReviewStatus[reviewStatus] = (countsByReviewStatus[reviewStatus] || 0) + 1;
    }

    return {
      totalCount: records.length,
      governanceHoldCount: records.filter((record) => record.governanceHold).length,
      countsByStatus,
      countsByReviewStatus,
      recent: items.map((record) => ({
        id: record.id,
        createdAt: record.createdAt,
        objective: record.objective,
        governanceHold: Boolean(record.governanceHold),
        requestedTools: record.requestedTools || [],
        allowedTools: record.allowedTools || [],
        resultStatus: record.result?.status || record.status || "unknown",
        reviewStatus: record.reviewStatus || "unreviewed",
        reviewNote: record.reviewNote || "",
        summary: record.result?.message || record.result?.summary || ""
      }))
    };
  }

  async savePlanArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO plan_artifacts (id, created_at, title, objective, path, item_count, workflow_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.title, record.objective, record.path, record.itemCount, record.workflowId || null);

    return record;
  }

  async listPlanArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, title, objective, path, item_count, workflow_id
        FROM plan_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        title: row.title,
        objective: row.objective,
        path: row.path,
        itemCount: row.item_count,
        workflowId: row.workflow_id || null
      }));
  }

  async listPlanArtifactsByWorkflow(workflowId) {
    return (await this.listPlanArtifacts()).filter((record) => record.workflowId === workflowId);
  }

  async getPlanArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, title, objective, path, item_count, workflow_id
        FROM plan_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      objective: row.objective,
      path: row.path,
      itemCount: row.item_count,
      workflowId: row.workflow_id || null
    };
  }

  async getPlanArtifactBundle(id) {
    const planArtifact = await this.getPlanArtifact(id);
    if (!planArtifact) {
      return null;
    }

    const workflow = planArtifact.workflowId ? await this.getWorkflowRun(planArtifact.workflowId) : null;
    const workflowBundle = workflow ? await this.getWorkflowBundle(workflow.id) : null;

    return {
      ...planArtifact,
      workflow,
      workflowBundle
    };
  }

  async saveReviewArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO review_artifacts (id, created_at, review_id, review_kind, review_status, title, path, workflow_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.reviewId, record.reviewKind, record.reviewStatus, record.title, record.path, record.workflowId || null);

    return record;
  }

  async listReviewArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, review_id, review_kind, review_status, title, path, workflow_id
        FROM review_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        reviewId: row.review_id,
        reviewKind: row.review_kind,
        reviewStatus: row.review_status,
        title: row.title,
        path: row.path,
        workflowId: row.workflow_id || null
      }));
  }

  async listReviewArtifactsByWorkflow(workflowId) {
    return (await this.listReviewArtifacts()).filter((artifact) => artifact.workflowId === workflowId);
  }

  async getReviewArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, review_id, review_kind, review_status, title, path, workflow_id
        FROM review_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      reviewId: row.review_id,
      reviewKind: row.review_kind,
      reviewStatus: row.review_status,
      title: row.title,
      path: row.path,
      workflowId: row.workflow_id || null
    };
  }

  async getReviewArtifactBundle(id) {
    const reviewArtifact = await this.getReviewArtifact(id);
    if (!reviewArtifact) {
      return null;
    }

    const reviewBundle = await this.getReviewBundle(reviewArtifact.reviewId);
    const workflow = reviewArtifact.workflowId ? await this.getWorkflowRun(reviewArtifact.workflowId) : null;
    const workflowBundle = workflow ? await this.getWorkflowBundle(workflow.id) : null;

    return {
      ...reviewArtifact,
      reviewBundle,
      workflow,
      workflowBundle
    };
  }

  async saveWorkspaceSnapshot(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO workspace_snapshots (id, created_at, label, file_count, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.label, record.fileCount, JSON.stringify(record));

    return record;
  }

  async listWorkspaceSnapshots() {
    return this.db
      .prepare(`
        SELECT id, created_at, label, file_count, payload_json
        FROM workspace_snapshots
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => JSON.parse(row.payload_json));
  }

  async getWorkspaceSnapshot(id) {
    const row = this.db
      .prepare(`
        SELECT payload_json
        FROM workspace_snapshots
        WHERE id = ?
      `)
      .get(id);

    return row ? JSON.parse(row.payload_json) : null;
  }

  async saveWorkflowRun(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO workflow_runs (id, created_at, payload_json)
        VALUES (?, ?, ?)
      `)
      .run(record.id, record.createdAt, JSON.stringify(record));

    return record;
  }

  async listWorkflowRuns() {
    return this.db
      .prepare(`
        SELECT payload_json
        FROM workflow_runs
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => JSON.parse(row.payload_json));
  }

  async getWorkflowRun(id) {
    const row = this.db
      .prepare(`
        SELECT payload_json
        FROM workflow_runs
        WHERE id = ?
      `)
      .get(id);

    return row ? JSON.parse(row.payload_json) : null;
  }

  async getWorkflowBundle(id) {
    const workflow = await this.getWorkflowRun(id);
    if (!workflow) {
      return null;
    }

    const [planRun, planArtifact, reviews, reviewArtifacts, traces, traceArtifacts, approvalRequests] = await Promise.all([
      this.getPlanRun(workflow.planRunId),
      this.getPlanArtifact(workflow.planArtifactId),
      Promise.all((workflow.reviewIds || []).map((reviewId) => this.getReview(reviewId))),
      this.listReviewArtifactsByWorkflow(workflow.id),
      this.listTracesByWorkflow(workflow.id, 200),
      this.listTraceArtifactsByWorkflow(workflow.id),
      Promise.all((workflow.approvalRequestIds || []).map((approvalId) => this.getApprovalRequest(approvalId)))
    ]);

    return {
      ...workflow,
      planRun,
      planArtifact,
      reviews: reviews.filter(Boolean),
      reviewArtifacts,
      traces,
      traceArtifacts,
      approvalRequests: approvalRequests.filter(Boolean)
    };
  }

  async listWorkflowBundles(limit = 10) {
    const runs = (await this.listWorkflowRuns()).slice(0, limit);
    const bundles = [];
    for (const run of runs) {
      const bundle = await this.getWorkflowBundle(run.id);
      if (bundle) {
        bundles.push(bundle);
      }
    }
    return bundles;
  }

  async saveWorkflowArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO workflow_artifacts (id, created_at, workflow_id, title, status, path)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.workflowId, record.title, record.status, record.path);

    return record;
  }

  async listWorkflowArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, workflow_id, title, status, path
        FROM workflow_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        workflowId: row.workflow_id,
        title: row.title,
        status: row.status,
        path: row.path
      }));
  }

  async listWorkflowArtifactsByWorkflow(workflowId) {
    return (await this.listWorkflowArtifacts()).filter((artifact) => artifact.workflowId === workflowId);
  }

  async getWorkflowArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, workflow_id, title, status, path
        FROM workflow_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      workflowId: row.workflow_id,
      title: row.title,
      status: row.status,
      path: row.path
    };
  }

  async saveDashboardArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO dashboard_artifacts (id, created_at, title, path, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.title, record.path, JSON.stringify(record));

    return record;
  }

  async saveBundleIndexArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO bundle_index_artifacts (id, created_at, title, path, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.title, record.path, JSON.stringify(record));

    return record;
  }

  async listBundleIndexArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, title, path, payload_json
        FROM bundle_index_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        title: row.title,
        path: row.path,
        ...(JSON.parse(row.payload_json || "{}"))
      }));
  }

  async listBundleIndexArtifactsByWorkflow(workflowId) {
    return (await this.listBundleIndexArtifacts()).filter((artifact) => artifact.workflowId === workflowId);
  }

  async getBundleIndexArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, title, path, payload_json
        FROM bundle_index_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      path: row.path,
      ...(JSON.parse(row.payload_json || "{}"))
    };
  }

  async getBundleIndexArtifactBundle(id) {
    const artifact = await this.getBundleIndexArtifact(id);
    if (!artifact) {
      return null;
    }

    const dashboardArtifact = (await this.listDashboardArtifacts()).find((item) => {
      return item.workflowId && artifact.workflowId && item.workflowId === artifact.workflowId;
    }) || null;
    const workflowArtifacts = artifact.workflowId ? await this.listWorkflowArtifactsByWorkflow(artifact.workflowId) : [];
    const reviewArtifacts = artifact.workflowId ? await this.listReviewArtifactsByWorkflow(artifact.workflowId) : [];
    const traceArtifacts = artifact.workflowId ? await this.listTraceArtifactsByWorkflow(artifact.workflowId) : [];

    return {
      ...artifact,
      bundleIndex: artifact.bundleIndex || null,
      workflowBundle: artifact.workflowId ? await this.getWorkflowBundle(artifact.workflowId) : null,
      dashboardArtifact,
      workflowArtifacts,
      reviewArtifacts,
      traceArtifacts
    };
  }

  async listDashboardArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, title, path, payload_json
        FROM dashboard_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        title: row.title,
        path: row.path,
        ...(JSON.parse(row.payload_json || "{}"))
      }));
  }

  async listDashboardArtifactsByWorkflow(workflowId) {
    return (await this.listDashboardArtifacts()).filter((artifact) => artifact.workflowId === workflowId);
  }

  async getDashboardArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, title, path, payload_json
        FROM dashboard_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      path: row.path,
      ...(JSON.parse(row.payload_json || "{}"))
    };
  }

  async getDashboardArtifactBundle(id) {
    const artifact = await this.getDashboardArtifact(id);
    if (!artifact) {
      return null;
    }

    const workflowArtifacts = artifact.workflowId ? await this.listWorkflowArtifactsByWorkflow(artifact.workflowId) : [];
    const bundleIndexArtifacts = artifact.workflowId ? await this.listBundleIndexArtifactsByWorkflow(artifact.workflowId) : [];

    return {
      ...artifact,
      dashboardSummary: artifact.dashboardSummary || null,
      workflowBundle: artifact.workflowId ? await this.getWorkflowBundle(artifact.workflowId) : null,
      workflowArtifacts,
      bundleIndexArtifacts
    };
  }

  async getWorkflowArtifactBundle(id) {
    const workflowArtifact = await this.getWorkflowArtifact(id);
    if (!workflowArtifact) {
      return null;
    }

    const workflowBundle = await this.getWorkflowBundle(workflowArtifact.workflowId);
    const dashboardArtifacts = await this.listDashboardArtifactsByWorkflow(workflowArtifact.workflowId);
    const bundleIndexArtifacts = await this.listBundleIndexArtifactsByWorkflow(workflowArtifact.workflowId);
    return {
      ...workflowArtifact,
      workflowBundle,
      dashboardArtifacts,
      bundleIndexArtifacts
    };
  }

  async saveReview(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO reviews (id, created_at, kind, target, status, summary, findings_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        record.id,
        record.createdAt || new Date().toISOString(),
        record.kind,
        record.target,
        record.status,
        record.summary,
        JSON.stringify(record.findings || [])
      );

    return record;
  }

  async listReviews() {
    return this.db
      .prepare(`
        SELECT id, created_at, kind, target, status, summary, findings_json
        FROM reviews
        ORDER BY created_at DESC
      `)
      .all()
      .map(mapReviewRow);
  }

  async getReview(reviewId) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, kind, target, status, summary, findings_json
        FROM reviews
        WHERE id = ?
      `)
      .get(reviewId);

    return row ? mapReviewRow(row) : null;
  }

  async getReviewBundle(reviewId) {
    const review = await this.getReview(reviewId);
    if (!review) {
      return null;
    }

    const workflow = (await this.listWorkflowRuns()).find((item) => {
      return (item.reviewIds || []).includes(reviewId);
    }) || null;

    const reviewArtifacts = (await this.listReviewArtifacts()).filter((artifact) => {
      return artifact.reviewId === reviewId;
    });

    const workflowBundle = workflow ? await this.getWorkflowBundle(workflow.id) : null;

    return {
      ...review,
      workflow,
      workflowBundle,
      reviewArtifacts
    };
  }

  async listReviewBundles(limit = 10) {
    const reviews = (await this.listReviews()).slice(0, limit);
    const bundles = [];
    for (const review of reviews) {
      const bundle = await this.getReviewBundle(review.id);
      if (bundle) {
        bundles.push(bundle);
      }
    }
    return bundles;
  }

  async saveTrace(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO traces (id, created_at, kind, payload_json)
        VALUES (?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.kind, JSON.stringify(record));

    return record;
  }

  async saveApprovalRequest(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO approval_requests
        (id, created_at, updated_at, status, kind, title, summary, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        record.id,
        record.createdAt,
        record.updatedAt || record.createdAt,
        record.status,
        record.kind,
        record.title,
        record.summary,
        JSON.stringify(record)
      );

    return record;
  }

  async listApprovalRequests() {
    return this.db
      .prepare(`
        SELECT payload_json
        FROM approval_requests
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => JSON.parse(row.payload_json));
  }

  async listOpenApprovalRequests() {
    return (await this.listApprovalRequests()).filter((item) => item.status === "pending");
  }

  async getApprovalRequest(id) {
    const row = this.db
      .prepare(`
        SELECT payload_json
        FROM approval_requests
        WHERE id = ?
      `)
      .get(id);

    return row ? JSON.parse(row.payload_json) : null;
  }

  async saveApprovalArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO approval_artifacts
        (id, created_at, approval_id, workflow_id, title, path, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        record.id,
        record.createdAt,
        record.approvalId || null,
        record.workflowId || null,
        record.title,
        record.path,
        JSON.stringify(record)
      );

    return record;
  }

  async saveStateSnapshotArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO state_snapshot_artifacts
        (id, created_at, title, path, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.title, record.path, JSON.stringify(record));

    return record;
  }

  async listStateSnapshotArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, title, path, payload_json
        FROM state_snapshot_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        title: row.title,
        path: row.path,
        ...(JSON.parse(row.payload_json || "{}"))
      }));
  }

  async getStateSnapshotArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, title, path, payload_json
        FROM state_snapshot_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      path: row.path,
      ...(JSON.parse(row.payload_json || "{}"))
    };
  }

  async getStateSnapshotArtifactBundle(id) {
    const artifact = await this.getStateSnapshotArtifact(id);
    if (!artifact) {
      return null;
    }

    return {
      ...artifact
    };
  }

  async listApprovalArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, approval_id, workflow_id, title, path, payload_json
        FROM approval_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        approvalId: row.approval_id || null,
        workflowId: row.workflow_id || null,
        title: row.title,
        path: row.path,
        ...(JSON.parse(row.payload_json || "{}"))
      }));
  }

  async listApprovalArtifactsByWorkflow(workflowId) {
    return (await this.listApprovalArtifacts()).filter((artifact) => artifact.workflowId === workflowId);
  }

  async getApprovalArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, approval_id, workflow_id, title, path, payload_json
        FROM approval_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      approvalId: row.approval_id || null,
      workflowId: row.workflow_id || null,
      title: row.title,
      path: row.path,
      ...(JSON.parse(row.payload_json || "{}"))
    };
  }

  async getApprovalArtifactBundle(id) {
    const artifact = await this.getApprovalArtifact(id);
    if (!artifact) {
      return null;
    }

    const approval = artifact.approvalId ? await this.getApprovalRequest(artifact.approvalId) : null;
    const workflowBundle = artifact.workflowId ? await this.getWorkflowBundle(artifact.workflowId) : null;
    const traces = artifact.workflowId ? await this.listTracesByWorkflow(artifact.workflowId, 200) : [];

    return {
      ...artifact,
      approval,
      workflowBundle,
      traces
    };
  }

  async resolveApprovalRequest(id, resolution) {
    const current = await this.getApprovalRequest(id);
    if (!current) {
      return null;
    }

    const resolvedAt = resolution.resolvedAt || new Date().toISOString();
    const next = {
      ...current,
      status: resolution.status,
      resolutionNote: resolution.note || "",
      resolvedAt,
      updatedAt: resolvedAt
    };

    await this.saveApprovalRequest(next);
    return next;
  }

  async listTraces(limit = 50) {
    return this.db
      .prepare(`
        SELECT payload_json
        FROM traces
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(limit)
      .map((row) => JSON.parse(row.payload_json));
  }

  async listTracesByWorkflow(workflowId, limit = 50) {
    return (await this.listTraces(Math.max(limit, 200))).filter((trace) => {
      return trace.workflowId === workflowId || trace.workflowRunId === workflowId;
    }).slice(0, limit);
  }

  async getTrace(id) {
    const row = this.db
      .prepare(`
        SELECT payload_json
        FROM traces
        WHERE id = ?
      `)
      .get(id);

    return row ? JSON.parse(row.payload_json) : null;
  }

  async getTraceBundle(id) {
    const trace = await this.getTrace(id);
    if (!trace) {
      return null;
    }

    const workflowId = trace.workflowId || trace.workflowRunId || null;
    const workflow = workflowId
      ? await this.getWorkflowRun(workflowId)
      : (await this.listWorkflowRuns()).find((item) => (item.traceIds || []).includes(id)) || null;

    const traceArtifacts = (await this.listTraceArtifacts()).filter((artifact) => {
      return (artifact.traceIds || []).includes(id);
    });

    const workflowBundle = workflow ? await this.getWorkflowBundle(workflow.id) : null;

    return {
      ...trace,
      workflow,
      workflowBundle,
      traceArtifacts
    };
  }

  async listTraceBundles(limit = 10) {
    const traces = (await this.listTraces(limit)).slice(0, limit);
    const bundles = [];
    for (const trace of traces) {
      const bundle = await this.getTraceBundle(trace.id);
      if (bundle) {
        bundles.push(bundle);
      }
    }
    return bundles;
  }

  async saveTraceArtifact(record) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO trace_artifacts (id, created_at, title, path, trace_count, trace_ids_json, workflow_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(record.id, record.createdAt, record.title, record.path, record.traceCount, JSON.stringify(record.traceIds), record.workflowId || null);

    return record;
  }

  async listTraceArtifacts() {
    return this.db
      .prepare(`
        SELECT id, created_at, title, path, trace_count, trace_ids_json, workflow_id
        FROM trace_artifacts
        ORDER BY created_at DESC
      `)
      .all()
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        title: row.title,
        path: row.path,
        traceCount: row.trace_count,
        traceIds: JSON.parse(row.trace_ids_json || "[]"),
        workflowId: row.workflow_id || null
      }));
  }

  async listTraceArtifactsByWorkflow(workflowId) {
    return (await this.listTraceArtifacts()).filter((artifact) => artifact.workflowId === workflowId);
  }

  async getTraceArtifact(id) {
    const row = this.db
      .prepare(`
        SELECT id, created_at, title, path, trace_count, trace_ids_json, workflow_id
        FROM trace_artifacts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      path: row.path,
      traceCount: row.trace_count,
      traceIds: JSON.parse(row.trace_ids_json || "[]"),
      workflowId: row.workflow_id || null
    };
  }

  async getTraceArtifactBundle(id) {
    const traceArtifact = await this.getTraceArtifact(id);
    if (!traceArtifact) {
      return null;
    }

    const traces = await Promise.all((traceArtifact.traceIds || []).map((traceId) => this.getTrace(traceId)));
    const workflow = traceArtifact.workflowId ? await this.getWorkflowRun(traceArtifact.workflowId) : null;
    const workflowBundle = workflow ? await this.getWorkflowBundle(workflow.id) : null;

    return {
      ...traceArtifact,
      traces: traces.filter(Boolean),
      workflow,
      workflowBundle
    };
  }

  async getDashboardSummary() {
    const [
      activeGoal,
      planItems,
      currentPlanSummary,
      reviews,
      planArtifacts,
      reviewArtifacts,
      dashboardArtifacts,
      bundleIndexArtifacts,
      approvalArtifacts,
      snapshots,
      workflows,
      workflowArtifacts,
      traces,
      traceArtifacts,
      approvals,
      workflowBundles,
      reviewBundles,
      traceBundles
    ] = await Promise.all([
      this.getActiveGoal(),
      this.getPlanItems(),
      this.getCurrentPlanSummary(),
      this.listReviews(),
      this.listPlanArtifacts(),
      this.listReviewArtifacts(),
      this.listDashboardArtifacts(),
      this.listBundleIndexArtifacts(),
      this.listApprovalArtifacts(),
      this.listWorkspaceSnapshots(),
      this.listWorkflowRuns(),
      this.listWorkflowArtifacts(),
      this.listTraces(200),
      this.listTraceArtifacts(),
      this.listApprovalRequests(),
      this.listWorkflowBundles(3),
      this.listReviewBundles(3),
      this.listTraceBundles(3)
    ]);

    return {
      activeGoal,
      strategyMode: this.config.runtime.strategyMode || "balanced",
      planItemCount: planItems.length,
      completedPlanItemCount: planItems.filter((item) => item.status === "completed" || item.status === "skipped").length,
      currentPlanSummary,
      linkedSubagentCount: (currentPlanSummary?.items || []).filter((item) => item.latestSubagentRecordId).length,
      pendingSubagentReviewCount: (currentPlanSummary?.items || []).filter((item) => {
        return item.latestSubagentRecordId && (!item.latestSubagentReviewStatus || item.latestSubagentReviewStatus === "pending");
      }).length,
      reviewCount: reviews.length,
      approvalRequestCount: approvals.length,
      openApprovalRequestCount: approvals.filter((item) => item.status === "pending").length,
      planArtifactCount: planArtifacts.length,
      reviewArtifactCount: reviewArtifacts.length,
      dashboardArtifactCount: dashboardArtifacts.length,
      bundleIndexArtifactCount: bundleIndexArtifacts.length,
      approvalArtifactCount: approvalArtifacts.length,
      workspaceSnapshotCount: snapshots.length,
      workflowRunCount: workflows.length,
      workflowArtifactCount: workflowArtifacts.length,
      traceCount: traces.length,
      traceArtifactCount: traceArtifacts.length,
      latestWorkflowBundle: workflowBundles[0]
        ? {
            id: workflowBundles[0].id,
            status: workflowBundles[0].status,
            statusReasons: workflowBundles[0].statusReasons || [],
            statusReasonCodes: (workflowBundles[0].statusReasons || []).map((item) => item.code).filter(Boolean),
            reviewCount: (workflowBundles[0].reviews || []).length,
            traceCount: (workflowBundles[0].traces || []).length
          }
        : null,
      recentPlanArtifacts: planArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        path: item.path
      })),
      recentReviewArtifacts: reviewArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        kind: item.reviewKind,
        path: item.path
      })),
      recentApprovalRequests: approvals.slice(0, 3).map((item) => ({
        id: item.id,
        status: item.status,
        kind: item.kind,
        title: item.title,
        changeSummary: item.changeSummary || ""
      })),
      recentApprovalArtifacts: approvalArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        path: item.path,
        title: item.title,
        approvalId: item.approvalId || null
      })),
      recentDashboardArtifacts: dashboardArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        path: item.path
      })),
      recentBundleIndexArtifacts: bundleIndexArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        path: item.path
      })),
      recentWorkflowRuns: workflows.slice(0, 3).map((item) => ({
        id: item.id,
        status: item.status
      })),
      recentWorkflowArtifacts: workflowArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        path: item.path,
        status: item.status
      })),
      recentReviewBundles: reviewBundles.map((item) => ({
        id: item.id,
        kind: item.kind,
        status: item.status
      })),
      recentTraceBundles: traceBundles.map((item) => ({
        id: item.id,
        kind: item.kind
      })),
      recentTraceArtifacts: traceArtifacts.slice(0, 3).map((item) => ({
        id: item.id,
        path: item.path,
        traceCount: item.traceCount
      })),
      recentTraceKinds: traces.slice(0, 5).map((item) => item.kind),
      firstToolStrategySummary: summarizeFirstToolStrategy(traces),
      governanceSummary: buildGovernanceSummary({
        activeGoal,
        approvals,
        workflowBundle: workflowBundles[0] || null
      }),
      artifactCoverage: summarizeArtifactCoverage({
        planArtifacts,
        reviewArtifacts,
        workflowArtifacts,
        traceArtifacts,
        dashboardArtifacts,
        bundleIndexArtifacts,
        approvalArtifacts
      }),
      suggestedNextReads: buildSuggestedNextReads({
        planArtifacts,
        reviewArtifacts,
        workflowRuns: workflows,
        workflowArtifacts,
        traceArtifacts,
        dashboardArtifacts,
        bundleIndexArtifacts,
        approvalArtifacts,
        approvals,
        workflowBundles
      }),
      suggestedNextReadLabels: buildSuggestedNextReads({
        planArtifacts,
        reviewArtifacts,
        workflowRuns: workflows,
        workflowArtifacts,
        traceArtifacts,
        dashboardArtifacts,
        bundleIndexArtifacts,
        approvalArtifacts,
        approvals,
        workflowBundles
      }).map((item) => `${item.kind}:${item.id}`),
      suggestedFirstTools: buildSuggestedFirstTools({
        activeGoal,
        planItems,
        workflows,
        workflowArtifacts,
        traces,
        approvals,
        approvalArtifacts,
        workflowBundles
      }),
      recommendedActions: buildRecommendedActions({
        activeGoal,
        currentPlanSummary,
        approvals,
        workflowBundle: workflowBundles[0] || null,
        governanceSummary: buildGovernanceSummary({
          activeGoal,
          approvals,
          workflowBundle: workflowBundles[0] || null
        })
      })
    };
  }

  async getBundleIndexSummary() {
    const [dashboard, workflowBundles, reviewBundles, traceBundles] = await Promise.all([
      this.getDashboardSummary(),
      this.listWorkflowBundles(3),
      this.listReviewBundles(3),
      this.listTraceBundles(3)
    ]);

    return {
      dashboard,
      workflowBundles: workflowBundles.map((item) => ({
        id: item.id,
        status: item.status,
        statusReasons: item.statusReasons || [],
        statusReasonCodes: (item.statusReasons || []).map((reason) => reason.code).filter(Boolean),
        reviewCount: (item.reviews || []).length,
        traceCount: (item.traces || []).length
      })),
      reviewBundles: reviewBundles.map((item) => ({
        id: item.id,
        kind: item.kind,
        status: item.status,
        workflowId: item.workflow?.id || null
      })),
      traceBundles: traceBundles.map((item) => ({
        id: item.id,
        kind: item.kind,
        workflowId: item.workflow?.id || null
      }))
    };
  }
}

function buildSuggestedFirstTools({ activeGoal, planItems, workflows, workflowArtifacts, traces, approvals = [], approvalArtifacts = [], workflowBundles = [] }) {
  const suggestions = [];
  const hasPendingApprovals = approvals.some((item) => item.status === "pending");
  const latestWorkflowCodes = new Set((workflowBundles[0]?.statusReasons || []).map((item) => item.code).filter(Boolean));
  const hasLinkedSubagentResults = planItems.some((item) => item.status === "completed" || item.status === "blocked" || item.status === "skipped");

  if (hasPendingApprovals || latestWorkflowCodes.has("approval_pending")) {
    suggestions.push("list_approval_requests");
    suggestions.push("read_approval_request");
    if (approvalArtifacts.length > 0) {
      suggestions.push("read_approval_artifact");
    }
    suggestions.push("get_dashboard_summary");
  }

  if (activeGoal || planItems.length > 0) {
    suggestions.push("get_dashboard_summary");
    suggestions.push("get_plan_summary");
  }

  if (hasLinkedSubagentResults) {
    suggestions.push("get_plan_summary");
    suggestions.push("list_subagents");
    suggestions.push("read_subagent");
  }

  if (workflows.length > 0) {
    suggestions.push("list_workflow_bundles");
    suggestions.push("read_workflow_run");
  }

  if (workflowArtifacts.length > 0) {
    suggestions.push("read_workflow_artifact");
  }

  if (traces.length > 0) {
    suggestions.push("list_traces");
  }

  if (suggestions.length === 0) {
    suggestions.push("get_dashboard_summary");
    suggestions.push("list_skills");
    suggestions.push("list_files");
  }

  return [...new Set(suggestions)].slice(0, 5);
}

function buildSuggestedNextReads({
  planArtifacts,
  reviewArtifacts,
  workflowRuns,
  workflowArtifacts,
  traceArtifacts,
  dashboardArtifacts = [],
  bundleIndexArtifacts = [],
  approvalArtifacts = [],
  approvals = [],
  workflowBundles = []
}) {
  const suggestions = [];
  const hasPendingApprovals = approvals.some((item) => item.status === "pending");
  const latestWorkflowCodes = new Set((workflowBundles[0]?.statusReasons || []).map((item) => item.code).filter(Boolean));

  if (hasPendingApprovals || latestWorkflowCodes.has("approval_pending")) {
    if (approvalArtifacts[0]) {
      suggestions.push({ kind: "approvalArtifact", id: approvalArtifacts[0].id });
    }
    if (approvals[0]) {
      suggestions.push({ kind: "approvalRequest", id: approvals[0].id });
    }
  }

  if (workflowArtifacts[0]) {
    suggestions.push({ kind: "workflowArtifact", id: workflowArtifacts[0].id });
  }
  if (dashboardArtifacts[0]) {
    suggestions.push({ kind: "dashboardArtifact", id: dashboardArtifacts[0].id });
  }
  if (bundleIndexArtifacts[0]) {
    suggestions.push({ kind: "bundleIndexArtifact", id: bundleIndexArtifacts[0].id });
  }
  if (approvalArtifacts[0]) {
    suggestions.push({ kind: "approvalArtifact", id: approvalArtifacts[0].id });
  }
  if (workflowRuns[0]) {
    suggestions.push({ kind: "workflowRun", id: workflowRuns[0].id });
  }
  if (planArtifacts[0]) {
    suggestions.push({ kind: "planArtifact", id: planArtifacts[0].id });
  }
  if (reviewArtifacts[0]) {
    suggestions.push({ kind: "reviewArtifact", id: reviewArtifacts[0].id });
  }
  if (traceArtifacts[0]) {
    suggestions.push({ kind: "traceArtifact", id: traceArtifacts[0].id });
  }

  return suggestions;
}

function summarizeFirstToolStrategy(traces) {
  const checks = traces.filter((trace) => trace.kind === "first_tool_strategy");
  const redirects = traces.filter((trace) => trace.kind === "first_tool_strategy_redirect");
  if (checks.length === 0) {
    return null;
  }

  const matchedCount = checks.filter((trace) => trace.matchedRecommendation).length;
  return {
    total: checks.length,
    matched: matchedCount,
    mismatched: checks.length - matchedCount,
    redirects: redirects.length,
    latestChosenTool: checks[0]?.chosenTool || null
  };
}

function summarizeArtifactCoverage({
  planArtifacts,
  reviewArtifacts,
  workflowArtifacts,
  traceArtifacts,
  dashboardArtifacts,
  bundleIndexArtifacts,
  approvalArtifacts = []
}) {
  const missing = [];
  if ((planArtifacts || []).length === 0) {
    missing.push("planArtifact");
  }
  if ((reviewArtifacts || []).length === 0) {
    missing.push("reviewArtifact");
  }
  if ((workflowArtifacts || []).length === 0) {
    missing.push("workflowArtifact");
  }
  if ((traceArtifacts || []).length === 0) {
    missing.push("traceArtifact");
  }
  if ((dashboardArtifacts || []).length === 0) {
    missing.push("dashboardArtifact");
  }
  if ((bundleIndexArtifacts || []).length === 0) {
    missing.push("bundleIndexArtifact");
  }
  if ((approvalArtifacts || []).length === 0) {
    missing.push("approvalArtifact");
  }

  return {
    missing,
    complete: missing.length === 0
  };
}

function buildGovernanceSummary({ activeGoal, approvals, workflowBundle }) {
  const openApprovals = (approvals || []).filter((item) => item.status === "pending");
  const latestWorkflowReasonCodes = (workflowBundle?.statusReasons || []).map((item) => item.code).filter(Boolean);
  const goalBlockedActive = activeGoal?.status === "blocked";
  return {
    openApprovalCount: openApprovals.length,
    openApprovalIds: openApprovals.slice(0, 5).map((item) => item.id),
    latestWorkflowStatus: workflowBundle?.status || null,
    latestWorkflowReasonCodes,
    governanceHoldActive: latestWorkflowReasonCodes.includes("governance_hold"),
    approvalPendingActive: latestWorkflowReasonCodes.includes("approval_pending"),
    goalBlockedActive,
    blockedGoalId: goalBlockedActive ? activeGoal.id : null,
    blockedGoalObjective: goalBlockedActive ? activeGoal.objective : null,
    blockedGoalTurnCount: goalBlockedActive ? activeGoal.turnCount ?? 0 : 0,
    blockedGoalBlockCount: goalBlockedActive ? activeGoal.blockCount ?? 0 : 0,
    blockedGoalLastBlockerCode: goalBlockedActive ? activeGoal.lastBlockerCode || null : null,
    blockedGoalLastBlockerMessage: goalBlockedActive ? activeGoal.lastBlockerMessage || null : null,
    recoverySuggestions: buildGovernanceRecoverySuggestions({
      activeGoal,
      openApprovals,
      latestWorkflowReasonCodes
    })
  };
}

function buildGovernanceRecoverySuggestions({ activeGoal, openApprovals, latestWorkflowReasonCodes }) {
  const suggestions = [];
  if (activeGoal?.status === "blocked") {
    suggestions.push("goal show");
  }
  if ((openApprovals || []).length > 0 || latestWorkflowReasonCodes.includes("approval_pending")) {
    suggestions.push("approvals list");
    suggestions.push("approval-artifacts list");
  }
  if (latestWorkflowReasonCodes.includes("governance_hold")) {
    suggestions.push("workflow list");
    suggestions.push("workflow-artifacts list");
  }
  suggestions.push("machine-state show");
  return [...new Set(suggestions)].slice(0, 6);
}

function buildRecommendedActions({ activeGoal, currentPlanSummary, approvals, workflowBundle, governanceSummary }) {
  const actions = [];
  const openApprovals = (approvals || []).filter((item) => item.status === "pending");
  const reasonCodes = new Set((workflowBundle?.statusReasons || []).map((item) => item.code).filter(Boolean));
  const firstPendingPlanItem = (currentPlanSummary?.items || []).find((item) => {
    return item.status === "pending" || item.status === "in_progress" || item.status === "blocked";
  });

  if (openApprovals.length > 0) {
    actions.push({
      kind: "approval",
      label: "Resolve approvals",
      detail: openApprovals.map((item) => item.id).join(", "),
      command: "approvals list"
    });
  }

  if (governanceSummary?.goalBlockedActive) {
    actions.push({
      kind: "goal",
      label: "Diagnose blocked goal",
      detail: governanceSummary.blockedGoalLastBlockerCode || "(none)",
      command: "goal diagnose"
    });
  }

  if ((currentPlanSummary?.pendingSubagentReviewCount || 0) > 0) {
    actions.push({
      kind: "subagent",
      label: "Review subagent outputs",
      detail: `${currentPlanSummary.pendingSubagentReviewCount} pending review`,
      command: "subagents summary"
    });
  }

  if (firstPendingPlanItem) {
    actions.push({
      kind: "plan",
      label: `Focus plan item ${firstPendingPlanItem.index}`,
      detail: firstPendingPlanItem.content,
      command: "plan summary"
    });
  }

  if (reasonCodes.has("governance_hold")) {
    actions.push({
      kind: "workflow",
      label: "Inspect workflow hold",
      detail: workflowBundle?.id || "(none)",
      command: "workflow list"
    });
  }

  if (!activeGoal && !firstPendingPlanItem && openApprovals.length === 0) {
    actions.push({
      kind: "idle",
      label: "Inspect dashboard",
      detail: "No active goal or pending governance actions.",
      command: "dashboard show"
    });
  }

  return actions.slice(0, 6);
}

function mapGoal(row) {
  return {
    id: row.id,
    objective: row.objective,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    turnCount: row.turn_count,
    blockCount: row.block_count,
    completionCriteria: row.completion_criteria,
    lastBlockerCode: row.last_blocker_code || null,
    lastBlockerMessage: row.last_blocker_message || null
  };
}

function mapReviewRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    kind: row.kind,
    target: row.target,
    status: row.status,
    summary: row.summary,
    findings: JSON.parse(row.findings_json || "[]")
  };
}

function ensureColumn(db, tableName, columnName, columnType) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  }
}
