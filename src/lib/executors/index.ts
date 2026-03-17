import { type Agent } from "../agents";
import { type Task } from "../db";

export interface ExecutionResult {
  success: boolean;
  output: string;
  tokens_used?: number;
  duration_ms: number;
  error?: string;
}

export interface TaskExecutor {
  execute(task: Task, agent: Agent, prompt: string): Promise<ExecutionResult>;
}

/**
 * Get the executor for an agent based on its executor type.
 */
export async function getExecutor(
  executorType: string
): Promise<TaskExecutor> {
  switch (executorType) {
    case "claude-cli": {
      const { ClaudeCliExecutor } = await import("./claude-cli");
      return new ClaudeCliExecutor();
    }
    case "http": {
      const { HttpExecutor } = await import("./http");
      return new HttpExecutor();
    }
    default:
      throw new Error(`Unknown executor type: ${executorType}`);
  }
}
