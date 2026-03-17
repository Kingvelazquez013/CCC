import { type Agent } from "../agents";
import { type Task } from "../db";
import { type TaskExecutor, type ExecutionResult } from "./index";

/**
 * HTTP executor — POST task to an arbitrary endpoint.
 * Useful for custom agent servers, ollama, OpenAI-compatible endpoints.
 *
 * Agent executor_config should contain:
 *   { "endpoint": "https://...", "token": "...", "timeout": 60000 }
 */
export class HttpExecutor implements TaskExecutor {
  async execute(
    task: Task,
    agent: Agent,
    prompt: string
  ): Promise<ExecutionResult> {
    const config = agent.executor_config as {
      endpoint?: string;
      token?: string;
      timeout?: number;
    };

    if (!config.endpoint) {
      return {
        success: false,
        output: "",
        duration_ms: 0,
        error: "No endpoint configured in agent executor_config",
      };
    }

    const startTime = Date.now();
    const timeout = config.timeout || 120_000;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.token) {
        headers["Authorization"] = `Bearer ${config.token}`;
      }

      const res = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          task_id: task.id,
          title: task.title,
          description: task.description,
          business: task.business,
          department: task.department,
          priority: task.priority,
          prompt,
          agent_name: agent.name,
          model: agent.model,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const duration = Date.now() - startTime;

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          output: "",
          duration_ms: duration,
          error: `HTTP ${res.status}: ${text.slice(0, 500)}`,
        };
      }

      const body = await res.json();

      return {
        success: body.success !== false,
        output: body.output || body.result || body.summary || JSON.stringify(body),
        tokens_used: body.tokens_used,
        duration_ms: duration,
        error: body.error,
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        duration_ms: duration,
        error: message.includes("abort")
          ? `Request timed out after ${timeout}ms`
          : message,
      };
    }
  }
}
