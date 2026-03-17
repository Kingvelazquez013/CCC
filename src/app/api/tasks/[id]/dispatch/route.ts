import { NextResponse } from "next/server";
import { getTaskById, updateTask } from "@/lib/db";
import { setAgentStatus, logExecution, updateExecution } from "@/lib/agents";
import { selectAgent } from "@/lib/routing";
import { getExecutor } from "@/lib/executors";
import { ClaudeCliExecutor } from "@/lib/executors/claude-cli";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/[id]/dispatch
 *
 * Dispatch a task to its assigned agent. If no agent is assigned,
 * the routing engine selects one automatically.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const task = await getTaskById(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.stage === "done") {
    return NextResponse.json(
      { error: "Task is already done" },
      { status: 400 }
    );
  }

  try {
    // Select agent via routing engine
    const agent = await selectAgent({
      department: task.department,
      business: task.business,
      priority: task.priority,
    });

    if (!agent) {
      return NextResponse.json(
        { error: "No available agent matches this task" },
        { status: 404 }
      );
    }

    // Update task with agent assignment
    await updateTask(params.id, {
      stage: "working",
      assigned_agent: agent.name,
    });

    // Mark agent as working
    await setAgentStatus(agent.id, "working");

    // Log execution start
    const execution = await logExecution({
      agent_id: agent.id,
      task_id: task.id,
      model_used: agent.model,
      status: "running",
    });

    // Build prompt and execute (async — don't await for HTTP response)
    const prompt = ClaudeCliExecutor.buildPrompt(task, agent);
    const executor = await getExecutor(agent.executor);

    // Fire and forget — execution runs in background
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
          await updateTask(params.id, { stage: "review" });
        }
      })
      .catch(async (err) => {
        await updateExecution(execution.id, {
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : String(err),
        });
        await setAgentStatus(agent.id, "standby");
      });

    return NextResponse.json({
      dispatched: true,
      agent: {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        executor: agent.executor,
      },
      execution_id: execution.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dispatch failed" },
      { status: 500 }
    );
  }
}
