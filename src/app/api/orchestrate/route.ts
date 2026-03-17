import { NextResponse } from "next/server";
import { claimNextTask, updateTask } from "@/lib/db";
import { setAgentStatus, logExecution, updateExecution } from "@/lib/agents";
import { selectAgent } from "@/lib/routing";
import { getExecutor } from "@/lib/executors";
import { ClaudeCliExecutor } from "@/lib/executors/claude-cli";

export const dynamic = "force-dynamic";

/**
 * POST /api/orchestrate
 *
 * Node.js replacement for tick.sh. Claims the next backlog task,
 * routes it to an agent, and dispatches execution.
 *
 * Call this from a cron job:
 *   curl -X POST http://localhost:4000/api/orchestrate
 */
export async function POST() {
  // 1. Claim next backlog task
  const task = await claimNextTask();
  if (!task) {
    return NextResponse.json({ status: "idle", message: "No tasks in backlog" });
  }

  // 2. Route to agent
  const agent = await selectAgent({
    department: task.department,
    business: task.business,
    priority: task.priority,
  });

  if (!agent) {
    return NextResponse.json({
      status: "no_agent",
      message: `No agent available for task "${task.title}"`,
      task_id: task.id,
    });
  }

  // 3. Assign agent to task
  await updateTask(task.id, {
    stage: "working",
    assigned_agent: agent.name,
  });
  await setAgentStatus(agent.id, "working");

  // 4. Log execution
  const execution = await logExecution({
    agent_id: agent.id,
    task_id: task.id,
    model_used: agent.model,
    status: "running",
  });

  // 5. Build prompt and dispatch
  const prompt = ClaudeCliExecutor.buildPrompt(task, agent);
  const executor = await getExecutor(agent.executor);

  // Fire and forget
  executor
    .execute(task, agent, prompt)
    .then(async (result) => {
      await updateExecution(execution.id, {
        status: result.success ? "success" : "failed",
        completed_at: new Date().toISOString(),
        duration_ms: result.duration_ms,
        error_message: result.error || null,
        tokens_used: result.tokens_used || null,
      });

      await setAgentStatus(agent.id, "standby");

      if (result.success) {
        await updateTask(task.id, { stage: "review" });
      } else {
        // Try fallback model if available
        if (agent.fallback_model && agent.fallback_model !== agent.model) {
          await updateExecution(execution.id, {
            status: "failed",
            error_message: `Primary model failed: ${result.error}. Attempting fallback.`,
          });

          // Retry with fallback (already handled by ClaudeCliExecutor's model chain)
          await updateTask(task.id, { stage: "review" });
        }
      }
    })
    .catch(async (err) => {
      await updateExecution(execution.id, {
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      });
      await setAgentStatus(agent.id, "standby");
      await updateTask(task.id, { stage: "review" });
    });

  return NextResponse.json({
    status: "dispatched",
    task_id: task.id,
    task_title: task.title,
    agent: agent.name,
    model: agent.model,
    execution_id: execution.id,
  });
}
