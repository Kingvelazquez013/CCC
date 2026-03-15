import { NextResponse } from "next/server";
import { scanBusinesses, scanBusinessesFromSupabase } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.USE_SUPABASE_FILES) {
    return NextResponse.json(await scanBusinessesFromSupabase());
  }
  return NextResponse.json(scanBusinesses());
}
