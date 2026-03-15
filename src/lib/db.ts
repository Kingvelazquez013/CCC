import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "ccc.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    business TEXT NOT NULL,
    department TEXT DEFAULT '',
    assigned_agent TEXT DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    action TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT,
    detail TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

export type Stage =
  | "backlog"
  | "assigned"
  | "working"
  | "review"
  | "approved"
  | "done";

export type Priority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string;
  business: string;
  department: string;
  assigned_agent: string;
  stage: Stage;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface TaskLog {
  id: number;
  task_id: string;
  action: string;
  from_stage: string | null;
  to_stage: string | null;
  detail: string;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  business: string;
  department?: string;
  assigned_agent?: string;
  stage?: Stage;
  priority?: Priority;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  business?: string;
  department?: string;
  assigned_agent?: string;
  stage?: Stage;
  priority?: Priority;
}

const stmtGetAll = db.prepare(
  "SELECT * FROM tasks ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, updated_at DESC"
);

const stmtGetById = db.prepare("SELECT * FROM tasks WHERE id = ?");

const stmtInsert = db.prepare(`
  INSERT INTO tasks (id, title, description, business, department, assigned_agent, stage, priority)
  VALUES (@id, @title, @description, @business, @department, @assigned_agent, @stage, @priority)
`);

const stmtDelete = db.prepare("DELETE FROM tasks WHERE id = ?");

const stmtInsertLog = db.prepare(`
  INSERT INTO task_log (task_id, action, from_stage, to_stage, detail)
  VALUES (@task_id, @action, @from_stage, @to_stage, @detail)
`);

const stmtGetLogs = db.prepare(
  "SELECT * FROM task_log ORDER BY created_at DESC LIMIT 50"
);

export function getAllTasks(): Task[] {
  return stmtGetAll.all() as Task[];
}

export function getTaskById(id: string): Task | undefined {
  return stmtGetById.get(id) as Task | undefined;
}

export function createTask(input: CreateTaskInput): Task {
  const id = uuid();
  const task = {
    id,
    title: input.title,
    description: input.description || "",
    business: input.business,
    department: input.department || "",
    assigned_agent: input.assigned_agent || "",
    stage: input.stage || "backlog",
    priority: input.priority || "medium",
  };

  stmtInsert.run(task);

  stmtInsertLog.run({
    task_id: id,
    action: "created",
    from_stage: null,
    to_stage: task.stage,
    detail: `Task "${task.title}" created for ${task.business}`,
  });

  return getTaskById(id) as Task;
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const existing = getTaskById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: Record<string, string> = { id };

  if (input.title !== undefined) {
    fields.push("title = @title");
    values.title = input.title;
  }
  if (input.description !== undefined) {
    fields.push("description = @description");
    values.description = input.description;
  }
  if (input.business !== undefined) {
    fields.push("business = @business");
    values.business = input.business;
  }
  if (input.department !== undefined) {
    fields.push("department = @department");
    values.department = input.department;
  }
  if (input.assigned_agent !== undefined) {
    fields.push("assigned_agent = @assigned_agent");
    values.assigned_agent = input.assigned_agent;
  }
  if (input.stage !== undefined) {
    fields.push("stage = @stage");
    values.stage = input.stage;
  }
  if (input.priority !== undefined) {
    fields.push("priority = @priority");
    values.priority = input.priority;
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = @id`).run(
    values
  );

  if (input.stage && input.stage !== existing.stage) {
    stmtInsertLog.run({
      task_id: id,
      action: "stage_changed",
      from_stage: existing.stage,
      to_stage: input.stage,
      detail: `"${existing.title}" moved from ${existing.stage} to ${input.stage}`,
    });
  }

  if (
    input.assigned_agent &&
    input.assigned_agent !== existing.assigned_agent
  ) {
    stmtInsertLog.run({
      task_id: id,
      action: "assigned",
      from_stage: null,
      to_stage: null,
      detail: `"${existing.title}" assigned to ${input.assigned_agent}`,
    });
  }

  return getTaskById(id) as Task;
}

export function deleteTask(id: string): boolean {
  const existing = getTaskById(id);
  if (!existing) return false;

  stmtInsertLog.run({
    task_id: id,
    action: "deleted",
    from_stage: existing.stage,
    to_stage: null,
    detail: `"${existing.title}" deleted`,
  });

  stmtDelete.run(id);
  return true;
}

export function getTaskLogs(): TaskLog[] {
  return stmtGetLogs.all() as TaskLog[];
}
