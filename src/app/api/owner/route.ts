import { NextResponse } from "next/server";
import { scanOwnerFiles, scanOwnerFilesFromSupabase } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.USE_SUPABASE_FILES) {
    return NextResponse.json(await scanOwnerFilesFromSupabase());
  }
  return NextResponse.json(scanOwnerFiles());
}
