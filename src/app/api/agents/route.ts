import { NextResponse } from "next/server";
import { getAllAgents, createAgent } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await getAllAgents();
    return NextResponse.json(agents);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name || !body.role || !body.model) {
    return NextResponse.json(
      { error: "name, role, and model are required" },
      { status: 400 }
    );
  }

  try {
    const agent = await createAgent(body);
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
