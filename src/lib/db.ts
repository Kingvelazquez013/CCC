import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

export type Stage =
  | "backlog"
  | "planning"
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

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await getClient().from("tasks").select("*");
  if (error) throw error;
  return (data as Task[]).sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const { data, error } = await getClient()
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return data as Task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = getClient();
  const { data, error } = await db
    .from("tasks")
    .insert({
      title: input.title,
      description: input.description || "",
      business: input.business,
      department: input.department || "",
      assigned_agent: input.assigned_agent || "",
      stage: input.stage || "backlog",
      priority: input.priority || "medium",
    })
    .select()
    .single();

  if (error) throw error;
  const created = data as Task;

  await db.from("task_log").insert({
    task_id: created.id,
    action: "created",
    from_stage: null,
    to_stage: created.stage,
    detail: `Task "${created.title}" created for ${created.business}`,
  });

  return created;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  const db = getClient();
  const existing = await getTaskById(id);
  if (!existing) return null;

  const { data, error } = await db
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  const updated = data as Task;

  if (input.stage && input.stage !== existing.stage) {
    await db.from("task_log").insert({
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
    await db.from("task_log").insert({
      task_id: id,
      action: "assigned",
      from_stage: null,
      to_stage: null,
      detail: `"${existing.title}" assigned to ${input.assigned_agent}`,
    });
  }
  return updated;
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = getClient();
  const existing = await getTaskById(id);
  if (!existing) return false;

  await db.from("task_log").insert({
    task_id: id,
    action: "deleted",
    from_stage: existing.stage,
    to_stage: null,
    detail: `"${existing.title}" deleted`,
  });

  const { error } = await db.from("tasks").delete().eq("id", id);
  return !error;
}

export async function getTaskLogs(): Promise<TaskLog[]> {
  const { data, error } = await getClient()
    .from("task_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as TaskLog[];
}

export async function claimNextTask(): Promise<Task | null> {
  const { data, error } = await getClient().rpc("claim_next_task");
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as Task;
}
