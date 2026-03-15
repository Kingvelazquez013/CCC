import { NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const task = await getTaskById(params.id);
  if (!task) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const task = await updateTask(params.id, body);
  if (!task) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ok = await deleteTask(params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
