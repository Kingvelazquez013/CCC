import { NextResponse } from "next/server";
import {
  readGovernance,
  scanProtocols,
  scanTemplates,
  readGovernanceFromSupabase,
  scanProtocolsFromSupabase,
  scanTemplatesFromSupabase,
} from "@/lib/scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.USE_SUPABASE_FILES) {
    return NextResponse.json({
      governance: await readGovernanceFromSupabase(),
      protocols: await scanProtocolsFromSupabase(),
      templates: await scanTemplatesFromSupabase(),
    });
  }
  return NextResponse.json({
    governance: readGovernance(),
    protocols: scanProtocols(),
    templates: scanTemplates(),
  });
}
