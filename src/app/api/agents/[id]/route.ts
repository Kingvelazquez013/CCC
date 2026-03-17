import { NextResponse } from "next/server";
import {
  getAgentById,
  updateAgent,
  deleteAgent,
  getExecutionsByAgent,
} from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const includeExecutions = url.searchParams.get("executions") === "true";

  const agent = await getAgentById(params.id);
  if (!agent) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (includeExecutions) {
    const executions = await getExecutionsByAgent(params.id);
    return NextResponse.json({ ...agent, executions });
  }

  return NextResponse.json(agent);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const agent = await updateAgent(params.id, body);
  if (!agent) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(agent);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ok = await deleteAgent(params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
