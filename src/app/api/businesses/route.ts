import { NextResponse } from "next/server";
import { scanBusinesses } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export function GET() {
  const businesses = scanBusinesses();
  return NextResponse.json(businesses);
}
