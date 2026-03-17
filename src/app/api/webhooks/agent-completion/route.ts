import { NextResponse } from "next/server";
import { handleAgentCompletion } from "@/lib/workflow";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * POST /api/webhooks/agent-completion
 *
 * Called by agents (or external systems) when a task is complete.
 * Validates HMAC signature if WEBHOOK_SECRET is set.
 *
 * Body:
 *   { "task_id": "uuid", "status": "success"|"failed", "summary": "..." }
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // Validate HMAC signature if secret is configured
  if (WEBHOOK_SECRET) {
    const signature = request.headers.get("x-webhook-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 }
      );
    }

    const expected = createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
  }

  let body: {
    task_id?: string;
    status?: string;
    summary?: string;
    agent_id?: string;
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.task_id) {
    return NextResponse.json(
      { error: "task_id is required" },
      { status: 400 }
    );
  }

  try {
    const result = await handleAgentCompletion(body.task_id, {
      success: body.status !== "failed",
      summary: body.summary || "Completed",
      agentId: body.agent_id,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      task_id: result.id,
      stage: result.stage,
      message: "Task updated successfully",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
