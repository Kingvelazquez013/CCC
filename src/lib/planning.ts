import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { type Task } from "./db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

export interface PlanningMessage {
  id: number;
  task_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ── Message persistence ──────────────────────────────────────────

export async function getPlanningMessages(
  taskId: string
): Promise<PlanningMessage[]> {
  const { data, error } = await getClient()
    .from("task_planning_messages")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as PlanningMessage[];
}

export async function savePlanningMessage(
  taskId: string,
  role: "user" | "assistant",
  content: string
): Promise<PlanningMessage> {
  const { data, error } = await getClient()
    .from("task_planning_messages")
    .insert({ task_id: taskId, role, content })
    .select()
    .single();

  if (error) throw error;
  return data as PlanningMessage;
}

// ── AI question generation ──────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 500
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const body = await res.json();
  const content = body.content?.[0];
  return content?.type === "text" ? content.text : "";
}

/**
 * Generate 1-5 clarifying questions for a task.
 */
export async function generatePlanningQuestions(
  task: Task
): Promise<string> {
  const system = `You are a task clarification assistant. Given a task title, description, and business context, ask 1-5 focused clarifying questions to refine the task before work begins.

Rules:
- Ask only questions that would meaningfully change how the task is executed
- Be specific — avoid generic questions like "any other requirements?"
- Number your questions
- Keep each question under 2 sentences
- If the task is already very clear, ask fewer questions (1-2)
- Focus on: scope, acceptance criteria, constraints, dependencies, priority trade-offs`;

  const userMsg = `Task: ${task.title}
Description: ${task.description || "(none)"}
Business: ${task.business}
Department: ${task.department || "(general)"}
Priority: ${task.priority}`;

  return callClaude(system, userMsg);
}

/**
 * Generate a follow-up question or finalize based on conversation history.
 */
export async function generateFollowUp(
  task: Task,
  messages: PlanningMessage[]
): Promise<{ message: string; isFinal: boolean }> {
  const conversationText = messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");

  const questionCount = messages.filter((m) => m.role === "assistant").length;

  // After 3 rounds of Q&A, finalize
  if (questionCount >= 3) {
    return { message: "", isFinal: true };
  }

  const system = `You are a task clarification assistant continuing a conversation about a task.

Based on the user's answers, decide:
1. If the task is now clear enough → respond with exactly "PLANNING_COMPLETE"
2. If more clarification is needed → ask 1 focused follow-up question

Keep questions concise. Don't repeat questions already asked.`;

  const userMsg = `Task: ${task.title}
Description: ${task.description || "(none)"}
Business: ${task.business}

Conversation so far:
${conversationText}`;

  const response = await callClaude(system, userMsg);

  if (response.includes("PLANNING_COMPLETE")) {
    return { message: "", isFinal: true };
  }

  return { message: response, isFinal: false };
}

/**
 * Generate a summary of the planning conversation to append to the task.
 */
export async function generatePlanSummary(
  task: Task,
  messages: PlanningMessage[]
): Promise<string> {
  if (messages.length === 0) return "";

  const conversationText = messages
    .map((m) => `${m.role === "assistant" ? "Q" : "A"}: ${m.content}`)
    .join("\n");

  const system = `Summarize the key clarifications from this task planning conversation into 2-4 bullet points. Be concise. Start each bullet with "- ". No preamble.`;

  const userMsg = `Task: ${task.title}
Original description: ${task.description || "(none)"}

Planning conversation:
${conversationText}`;

  return callClaude(system, userMsg, 300);
}
