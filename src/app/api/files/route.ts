import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { path, content } = body as { path: string; content: string };

  if (!path || content === undefined) {
    return NextResponse.json(
      { error: "path and content required" },
      { status: 400 }
    );
  }

  const { error } = await getClient()
    .from("claude_files")
    .upsert(
      { path, content, updated_at: new Date().toISOString(), source: "dashboard" },
      { onConflict: "path" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
