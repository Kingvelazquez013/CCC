import { updateTask, getTaskById, type Task, type Stage } from "./db";
import { selectAgentByRole } from "./routing";
import { setAgentStatus } from "./agents";

/**
 * State machine transitions for the task pipeline.
 *
 * planning  → assigned (after planning finalized)
 * assigned  → working  (agent starts)
 * working   → review   (agent completes) or working (agent fails, retry)
 * review    → approved (reviewer approves) or working (reviewer rejects)
 * approved  → done     (auto-release)
 */
const TRANSITIONS: Record<string, Record<string, Stage>> = {
  backlog: { claim: "assigned", plan: "planning" },
  planning: { finalize: "assigned" },
  assigned: { start: "working" },
  working: { complete: "review", fail: "working" },
  review: { approve: "approved", reject: "working" },
  approved: { release: "done" },
};

/**
 * Auto-advance rules: when a task enters a stage, check if it should
 * automatically move to the next stage.
 */
const AUTO_ADVANCE: Array<{
  stage: Stage;
  nextStage: Stage;
  condition: (task: Task) => boolean;
}> = [
  // Low-priority tasks skip review
  {
    stage: "review" as Stage,
    nextStage: "done" as Stage,
    condition: (t) => t.priority === "low",
  },
  // Approved tasks auto-release to done
  {
    stage: "approved" as Stage,
    nextStage: "done" as Stage,
    condition: () => true,
  },
];

/**
 * Transition a task to the next stage via a named action.
 * Returns the updated task or null if the transition is invalid.
 */
export async function transitionTask(
  taskId: string,
  action: string
): Promise<Task | null> {
  const task = await getTaskById(taskId);
  if (!task) return null;

  const allowed = TRANSITIONS[task.stage];
  if (!allowed || !allowed[action]) return null;

  const nextStage = allowed[action];
  const updated = await updateTask(taskId, { stage: nextStage });
  if (!updated) return null;

  // Check auto-advance rules
  await checkAutoAdvance(updated);

  // Auto-dispatch reviewer when task hits review
  if (nextStage === "review") {
    await autoDispatchReviewer(updated);
  }

  return updated;
}

/**
 * Check if a task should auto-advance based on rules.
 */
async function checkAutoAdvance(task: Task): Promise<void> {
  for (const rule of AUTO_ADVANCE) {
    if (task.stage === rule.stage && rule.condition(task)) {
      await updateTask(task.id, { stage: rule.nextStage });
      break;
    }
  }
}

/**
 * When a task enters review, auto-assign a reviewer agent if available.
 */
async function autoDispatchReviewer(task: Task): Promise<void> {
  const reviewer = await selectAgentByRole("reviewer");
  if (!reviewer) return;

  await updateTask(task.id, {
    assigned_agent: `${reviewer.name} (reviewing)`,
  });
  await setAgentStatus(reviewer.id, "working");
}

/**
 * Handle agent completion — called by the webhook or executor.
 */
export async function handleAgentCompletion(
  taskId: string,
  result: {
    success: boolean;
    summary: string;
    agentId?: string;
  }
): Promise<Task | null> {
  const task = await getTaskById(taskId);
  if (!task) return null;

  // Reset agent status
  if (result.agentId) {
    await setAgentStatus(result.agentId, "standby");
  }

  if (result.success) {
    // Append summary to description
    const updatedDesc = task.description
      ? `${task.description}\n\n---\nResult: ${result.summary}`
      : `Result: ${result.summary}`;

    await updateTask(taskId, { description: updatedDesc });
    return transitionTask(taskId, "complete");
  } else {
    // On failure, task stays in working (retry logic in executor)
    const updatedDesc = task.description
      ? `${task.description}\n\n---\nFailed: ${result.summary}`
      : `Failed: ${result.summary}`;
    await updateTask(taskId, { description: updatedDesc });
    return task;
  }
}

/**
 * Get valid actions for a task's current stage.
 */
export function getValidActions(stage: string): string[] {
  return Object.keys(TRANSITIONS[stage] || {});
}
