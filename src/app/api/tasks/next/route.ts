import { NextResponse } from "next/server";
import { claimNextTask } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const task = await claimNextTask();
  if (!task) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(task);
}
