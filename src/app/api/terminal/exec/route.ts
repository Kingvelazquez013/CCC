import { NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

// Allowed commands whitelist (prefix match)
const ALLOWED_PREFIXES = [
  "ls", "cat", "head", "tail", "grep", "find", "pwd", "echo",
  "date", "whoami", "uname", "df", "du", "wc", "sort", "uniq",
  "git", "npm", "npx", "node", "curl", "docker", "docker-compose",
  "ps", "top", "free", "env", "printenv", "which", "file",
  "mkdir", "touch", "cp", "mv", "rm", "chmod", "chown",
  "cd", "tree", "less", "more", "diff", "tar", "gzip",
];

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,        // rm -rf /
  /mkfs/,                  // format disk
  /dd\s+if=/,             // raw disk write
  /:(){ :|:& };:/,        // fork bomb
  />\s*\/dev\/sd/,         // write to disk device
];

/**
 * POST /api/terminal/exec
 *
 * HTTP fallback for terminal commands when WebSocket PTY is unavailable.
 * Executes a single command and returns output.
 */
export async function POST(request: Request) {
  try {
    const { command } = await request.json();

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

    // Execute with timeout
    const output = await new Promise<string>((resolve, reject) => {
      exec(
        trimmed,
        {
          timeout: 30000,
          maxBuffer: 1024 * 1024, // 1MB
          cwd: process.cwd(),
          env: { ...process.env, TERM: "xterm-256color" },
        },
        (error, stdout, stderr) => {
          if (error && !stdout && !stderr) {
            reject(new Error(error.message));
            return;
          }
          const combined = (stdout || "") + (stderr ? `\n${stderr}` : "");
          resolve(combined || "(no output)");
        }
      );
    });

    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Execution failed" },
      { status: 500 }
    );
  }
}
