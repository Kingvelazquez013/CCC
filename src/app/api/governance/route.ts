import { NextResponse } from "next/server";
import { readGovernance, scanProtocols, scanTemplates } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    governance: readGovernance(),
    protocols: scanProtocols(),
    templates: scanTemplates(),
  });
}
