import { spawn } from "child_process";
import { type Agent } from "../agents";
import { type Task } from "../db";
import { type TaskExecutor, type ExecutionResult } from "./index";

const CCC_URL = process.env.CCC_URL || "http://localhost:4000";

/**
 * Claude CLI executor — wraps `claude --model X -p "prompt"`.
 * Replaces the bash orchestrator (tick.sh) with a Node.js implementation.
 */
export class ClaudeCliExecutor implements TaskExecutor {
  async execute(
    task: Task,
    agent: Agent,
    prompt: string
  ): Promise<ExecutionResult> {
    const models = [agent.model, agent.fallback_model].filter(Boolean) as string[];
    let lastError = "";

    for (const model of models) {
      const startTime = Date.now();

      try {
        const result = await this.runClaude(model, prompt);
        const duration = Date.now() - startTime;

        if (result.includes("AGENT_FAILED:")) {
          lastError = result;
          continue;
        }

        return {
          success: true,
          output: result,
          duration_ms: duration,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    return {
      success: false,
      output: "",
      duration_ms: 0,
      error: `All models failed. Last error: ${lastError.slice(0, 500)}`,
    };
  }

  private runClaude(model: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn("claude", [
        "--model", model,
        "-p", prompt,
        "--dangerously-skip-permissions",
      ]);

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0 && !stdout) {
          reject(new Error(stderr || `claude exited with code ${code}`));
        } else {
          resolve(stdout);
        }
      });

      proc.on("error", (err) => {
        reject(err);
      });

      // 10 minute timeout
      setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error("Execution timed out after 10 minutes"));
      }, 600_000);
    });
  }

  /**
   * Build the work prompt for an agent executing a task.
   */
  static buildPrompt(task: Task, agent: Agent): string {
    const systemContext = agent.system_prompt
      ? `\n\nAgent Identity:\n${agent.system_prompt}\n`
      : "";

    return `You are an autonomous agent completing a task from the Claude Command Center.
${systemContext}
TASK ID: ${task.id}
TITLE: ${task.title}
DESCRIPTION: ${task.description}
BUSINESS: ${task.business}
DEPARTMENT: ${task.department}
PRIORITY: ${task.priority}
CCC API: ${CCC_URL}

Instructions:
1. Immediately mark the task as working:
   curl -s -X PATCH '${CCC_URL}/api/tasks/${task.id}' -H 'Content-Type: application/json' -d '{"stage":"working"}'
2. Complete the task fully and autonomously using all tools available to you.
3. When done, update with your result:
   curl -s -X PATCH '${CCC_URL}/api/tasks/${task.id}' -H 'Content-Type: application/json' -d '{"stage":"done","description":"RESULT: <your summary>"}'
4. If you cannot complete the task, output exactly: AGENT_FAILED: <reason>
   Do NOT update the stage yourself on failure.`;
  }
}
