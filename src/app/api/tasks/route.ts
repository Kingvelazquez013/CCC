import { NextResponse } from "next/server";
import { getAllTasks, createTask, getTaskLogs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const logs = url.searchParams.get("logs");

  if (logs === "true") {
    return NextResponse.json(await getTaskLogs());
  }

  return NextResponse.json(await getAllTasks());
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.title || !body.business) {
    return NextResponse.json(
      { error: "title and business are required" },
      { status: 400 }
    );
  }

  const task = await createTask({
    title: body.title,
    description: body.description,
    business: body.business,
    department: body.department,
    assigned_agent: body.assigned_agent,
    stage: body.stage,
    priority: body.priority,
  });

  return NextResponse.json(task, { status: 201 });
}
