import { NextResponse } from "next/server";
import { getTaskById, updateTask } from "@/lib/db";
import {
  getPlanningMessages,
  savePlanningMessage,
  generatePlanningQuestions,
  generateFollowUp,
  generatePlanSummary,
} from "@/lib/planning";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await getPlanningMessages(params.id);
    return NextResponse.json(messages);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { action, message } = body as {
    action: "generate_questions" | "submit_answer" | "finalize";
    message?: string;
  };

  const task = await getTaskById(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    if (action === "generate_questions") {
      const questions = await generatePlanningQuestions(task);
      const saved = await savePlanningMessage(params.id, "assistant", questions);
      return NextResponse.json({ message: questions, messageId: saved.id });
    }

    if (action === "submit_answer") {
      if (!message?.trim()) {
        return NextResponse.json(
          { error: "message is required" },
          { status: 400 }
        );
      }

      // Save user answer
      await savePlanningMessage(params.id, "user", message);

      // Get conversation history
      const messages = await getPlanningMessages(params.id);

      // Generate follow-up or finalize
      const followUp = await generateFollowUp(task, messages);

      if (followUp.isFinal) {
        // Generate summary and finalize
        const summary = await generatePlanSummary(task, messages);
        return NextResponse.json({
          message: null,
          isFinal: true,
          summary,
        });
      }

      // Save follow-up question
      await savePlanningMessage(params.id, "assistant", followUp.message);
      return NextResponse.json({
        message: followUp.message,
        isFinal: false,
      });
    }

    if (action === "finalize") {
      // Get messages and generate summary
      const messages = await getPlanningMessages(params.id);
      let summary = "";

      if (messages.length > 0) {
        summary = await generatePlanSummary(task, messages);
      }

      // Append summary to task description
      if (summary) {
        const newDesc = task.description
          ? `${task.description}\n\nPlanning notes:\n${summary}`
          : `Planning notes:\n${summary}`;
        await updateTask(params.id, { description: newDesc });
      }

      // Advance to assigned
      await updateTask(params.id, { stage: "assigned" });

      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Planning failed" },
      { status: 500 }
    );
  }
}
