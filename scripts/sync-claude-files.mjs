#!/usr/bin/env node
/**
 * Bidirectional sync between ~/.claude/ and Supabase claude_files table.
 *
 * Usage:
 *   node scripts/sync-claude-files.mjs push  — local ~/.claude/ files → Supabase
 *   node scripts/sync-claude-files.mjs pull  — Supabase dashboard edits → local files
 *
 * Conflict rule: push skips files where source='dashboard' (pending pull).
 *                pull resets source to 'local' after writing.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  return fs
    .readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .reduce((acc, line) => {
      const idx = line.indexOf("=");
      acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      return acc;
    }, {});
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CLAUDE_DIR = path.join(process.env.HOME || "/Users/velazquez", ".claude");

// ── Helpers ───────────────────────────────────────────────────────────────────
function walkMd(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...walkMd(full, base));
    } else if (entry.endsWith(".md")) {
      results.push(path.relative(base, full));
    }
  }
  return results;
}

const toKey = (filePath) => filePath.replace(/\.md$/, "").replace(/\\/g, "/");
const toFilePath = (key) => key + ".md";

// ── Push: local → Supabase ────────────────────────────────────────────────────
async function push() {
  const tracked = [];

  // Root GOVERNANCE.md
  const govPath = path.join(CLAUDE_DIR, "GOVERNANCE.md");
  if (fs.existsSync(govPath)) tracked.push({ localPath: govPath, key: "GOVERNANCE" });

  // Subdirectories
  for (const dir of ["_owner", "_shared"]) {
    for (const rel of walkMd(path.join(CLAUDE_DIR, dir), CLAUDE_DIR)) {
      tracked.push({ localPath: path.join(CLAUDE_DIR, rel), key: toKey(rel) });
    }
  }

  // Businesses: push .md files AND directory stubs for empty dirs
  const bizRoot = path.join(CLAUDE_DIR, "businesses");
  if (fs.existsSync(bizRoot)) {
    for (const slug of fs.readdirSync(bizRoot).filter(e => !e.startsWith("."))) {
      const bizPath = path.join(bizRoot, slug);
      if (!fs.statSync(bizPath).isDirectory()) continue;
      // Push business-level stub so it appears even with no files
      tracked.push({ localPath: null, key: `businesses/${slug}`, content: "" });
      const mdFiles = walkMd(bizPath, CLAUDE_DIR);
      if (mdFiles.length > 0) {
        for (const rel of mdFiles) {
          tracked.push({ localPath: path.join(CLAUDE_DIR, rel), key: toKey(rel) });
        }
      } else {
        // Push dept stubs for empty departments
        for (const dept of fs.readdirSync(bizPath).filter(e => !e.startsWith("."))) {
          const deptPath = path.join(bizPath, dept);
          if (fs.statSync(deptPath).isDirectory()) {
            tracked.push({ localPath: null, key: `businesses/${slug}/${dept}`, content: "" });
          }
        }
      }
    }
  }

  // Skip files pending dashboard write-back
  const { data: pending } = await supabase
    .from("claude_files")
    .select("path")
    .eq("source", "dashboard");
  const pendingSet = new Set((pending || []).map((r) => r.path));

  let pushed = 0;
  for (const { localPath, key, content: stubContent } of tracked) {
    if (pendingSet.has(key)) {
      console.log(`  skip (pending pull): ${key}`);
      continue;
    }
    const content = localPath ? fs.readFileSync(localPath, "utf-8") : (stubContent ?? "");
    const { error } = await supabase.from("claude_files").upsert(
      { path: key, content, updated_at: new Date().toISOString(), source: "local" },
      { onConflict: "path" }
    );
    if (error) {
      console.error(`  error: ${key} — ${error.message}`);
    } else {
      console.log(`  ↑ ${key}`);
      pushed++;
    }
  }
  console.log(`\nPush done. ${pushed}/${tracked.length} files synced.`);
}

// ── Pull: Supabase dashboard edits → local ────────────────────────────────────
async function pull() {
  const { data, error } = await supabase
    .from("claude_files")
    .select("path, content")
    .eq("source", "dashboard");

  if (error) {
    console.error("Fetch error:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log("No pending dashboard edits.");
    return;
  }

  for (const { path: key, content } of data) {
    const localPath = path.join(CLAUDE_DIR, toFilePath(key));
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, content, "utf-8");
    console.log(`  ↓ ${localPath}`);
    await supabase.from("claude_files").update({ source: "local" }).eq("path", key);
  }
  console.log(`\nPull done. ${data.length} files written to disk.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const direction = process.argv[2];
if (direction === "push") {
  console.log(`Pushing ~/.claude/ → Supabase...\n`);
  push().catch(console.error);
} else if (direction === "pull") {
  console.log(`Pulling Supabase dashboard edits → ~/.claude/...\n`);
  pull().catch(console.error);
} else {
  console.error("Usage: node scripts/sync-claude-files.mjs push|pull");
  process.exit(1);
}
