import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

export type AgentStatus = "standby" | "working" | "offline";
export type ExecutorType = "claude-cli" | "openclaw" | "http";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  status: AgentStatus;
  model: string;
  fallback_model: string | null;
  departments: string[];
  businesses: string[];
  priority_floor: string;
  system_prompt: string;
  executor: ExecutorType;
  executor_config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  description?: string;
  avatar_emoji?: string;
  model: string;
  fallback_model?: string;
  departments?: string[];
  businesses?: string[];
  priority_floor?: string;
  system_prompt?: string;
  executor?: ExecutorType;
  executor_config?: Record<string, unknown>;
}

export interface UpdateAgentInput {
  name?: string;
  role?: string;
  description?: string;
  avatar_emoji?: string;
  status?: AgentStatus;
  model?: string;
  fallback_model?: string;
  departments?: string[];
  businesses?: string[];
  priority_floor?: string;
  system_prompt?: string;
  executor?: ExecutorType;
  executor_config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface AgentExecution {
  id: string;
  agent_id: string;
  task_id: string;
  model_used: string;
  status: "running" | "success" | "failed" | "timeout";
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  tokens_used: number | null;
  created_at: string;
}

export async function getAllAgents(): Promise<Agent[]> {
  const { data, error } = await getClient()
    .from("agents")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data || []) as Agent[];
}

export async function getEnabledAgents(): Promise<Agent[]> {
  const { data, error } = await getClient()
    .from("agents")
    .select("*")
    .eq("enabled", true)
    .order("name");
  if (error) throw error;
  return (data || []) as Agent[];
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  const { data, error } = await getClient()
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return data as Agent;
}

export async function getAgentByName(name: string): Promise<Agent | undefined> {
  const { data, error } = await getClient()
    .from("agents")
    .select("*")
    .eq("name", name)
    .single();
  if (error) return undefined;
  return data as Agent;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const { data, error } = await getClient()
    .from("agents")
    .insert({
      name: input.name,
      role: input.role,
      description: input.description || "",
      avatar_emoji: input.avatar_emoji || "🤖",
      model: input.model,
      fallback_model: input.fallback_model || null,
      departments: input.departments || [],
      businesses: input.businesses || [],
      priority_floor: input.priority_floor || "low",
      system_prompt: input.system_prompt || "",
      executor: input.executor || "claude-cli",
      executor_config: input.executor_config || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Agent;
}

export async function updateAgent(
  id: string,
  input: UpdateAgentInput
): Promise<Agent | null> {
  const { data, error } = await getClient()
    .from("agents")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return data as Agent;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const { error } = await getClient().from("agents").delete().eq("id", id);
  return !error;
}

export async function setAgentStatus(
  id: string,
  status: AgentStatus
): Promise<void> {
  await getClient().from("agents").update({ status }).eq("id", id);
}

// ── Execution logging ────────────────────────────────────────────

export async function logExecution(input: {
  agent_id: string;
  task_id: string;
  model_used: string;
  status: "running" | "success" | "failed" | "timeout";
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  tokens_used?: number;
}): Promise<AgentExecution> {
  const { data, error } = await getClient()
    .from("agent_executions")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as AgentExecution;
}

export async function updateExecution(
  id: string,
  input: Partial<AgentExecution>
): Promise<void> {
  await getClient().from("agent_executions").update(input).eq("id", id);
}

export async function getRecentExecutions(
  limit = 50
): Promise<AgentExecution[]> {
  const { data, error } = await getClient()
    .from("agent_executions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AgentExecution[];
}

export async function getExecutionsByAgent(
  agentId: string,
  limit = 20
): Promise<AgentExecution[]> {
  const { data, error } = await getClient()
    .from("agent_executions")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AgentExecution[];
}
