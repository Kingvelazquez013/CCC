import { NextResponse } from "next/server";
import { exec } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

export const dynamic = "force-dynamic";

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,        // rm -rf /
  /mkfs/,                  // format disk
  /dd\s+if=/,             // raw disk write
  /:()\s*\{.*\|.*&\s*\}/,  // fork bomb
  />\s*\/dev\/sd/,         // write to disk device
];

/**
 * POST /api/terminal/exec
 *
 * HTTP fallback for terminal commands when WebSocket PTY is unavailable.
 * Tracks working directory across commands via `cwd` parameter.
 */
export async function POST(request: Request) {
  try {
    const { command, cwd } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const trimmed = command.trim();

    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(trimmed)) {
        return NextResponse.json(
          { error: "Command blocked for safety" },
          { status: 403 }
        );
      }
    }

    // Resolve working directory — use client-provided cwd or fall back to project root
    let workDir = process.cwd();
    if (cwd && typeof cwd === "string" && cwd !== "~") {
      const resolved = resolve(cwd);
      if (existsSync(resolved)) {
        workDir = resolved;
      }
    }

    // Handle `cd` — resolve new directory and return it without executing
    if (/^cd\s/.test(trimmed) || trimmed === "cd") {
      const target = trimmed.replace(/^cd\s*/, "").trim() || process.env.HOME || "/";
      const newDir = resolve(workDir, target.replace(/^~/, process.env.HOME || "/home"));
      if (existsSync(newDir)) {
        return NextResponse.json({ output: "", cwd: newDir });
      } else {
        return NextResponse.json({
          output: `cd: no such file or directory: ${target}`,
          cwd: workDir,
        });
      }
    }

    // Execute with timeout
    const result = await new Promise<{ output: string; exitCwd: string }>((resolveP, reject) => {
      // Wrap command to also report the final working directory
      const wrapped = `${trimmed} && pwd`;
      exec(
        wrapped,
        {
          timeout: 30000,
          maxBuffer: 1024 * 1024, // 1MB
          cwd: workDir,
          shell: process.env.SHELL || "/bin/bash",
          env: { ...process.env, TERM: "xterm-256color" },
        },
        (error, stdout, stderr) => {
          if (error && !stdout && !stderr) {
            reject(new Error(error.message));
            return;
          }
          const lines = (stdout || "").split("\n");

          // The last non-empty line from `&& pwd` is the cwd
          let exitCwd = workDir;
          const lastLine = lines.filter((l) => l.trim()).pop();
          if (lastLine && existsSync(lastLine.trim())) {
            exitCwd = lastLine.trim();
            lines.pop(); // Remove the pwd output
          }

          const output = lines.join("\n") + (stderr ? stderr : "");
          resolveP({ output: output || "", exitCwd });
        }
      );
    });

    return NextResponse.json({ output: result.output, cwd: result.exitCwd });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Execution failed" },
      { status: 500 }
    );
  }
}
