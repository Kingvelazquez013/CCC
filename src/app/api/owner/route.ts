import { NextResponse } from "next/server";
import { scanOwnerFiles } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export function GET() {
  const files = scanOwnerFiles();
  return NextResponse.json(files);
}
