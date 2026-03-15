import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const CLAUDE_DIR = path.join(process.env.HOME || "/Users/velazquez", ".claude");
const BUSINESSES_DIR = path.join(CLAUDE_DIR, "businesses");
const OWNER_DIR = path.join(CLAUDE_DIR, "_owner");
const SHARED_DIR = path.join(CLAUDE_DIR, "_shared");

export interface DepartmentInfo {
  name: string;
  path: string;
  files: string[];
  hasSoul: boolean;
  hasGoals: boolean;
}

export interface BusinessInfo {
  name: string;
  slug: string;
  path: string;
  departments: DepartmentInfo[];
  fileCount: number;
  lastModified: Date | null;
}

export interface OwnerFile {
  name: string;
  path: string;
  content: string;
  lastModified: Date;
}

export interface ProtocolFile {
  name: string;
  path: string;
  content: string;
}

export interface TemplateFile {
  name: string;
  path: string;
}

function safeReadDir(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function safeStat(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function getLatestModified(dirPath: string): Date | null {
  let latest: Date | null = null;
  const entries = safeReadDir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = safeStat(fullPath);
    if (stat) {
      if (!latest || stat.mtime > latest) {
        latest = stat.mtime;
      }
      if (stat.isDirectory()) {
        const sub = getLatestModified(fullPath);
        if (sub && (!latest || sub > latest)) {
          latest = sub;
        }
      }
    }
  }
  return latest;
}

function countFiles(dirPath: string): number {
  let count = 0;
  const entries = safeReadDir(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = safeStat(fullPath);
    if (stat?.isFile()) count++;
    if (stat?.isDirectory()) count += countFiles(fullPath);
  }
  return count;
}

export function scanDepartment(deptPath: string, name: string): DepartmentInfo {
  const files = safeReadDir(deptPath).filter((f) => {
    const stat = safeStat(path.join(deptPath, f));
    return stat?.isFile();
  });

  return {
    name,
    path: deptPath,
    files,
    hasSoul: files.some((f) => f.toUpperCase().includes("SOUL")),
    hasGoals: files.some((f) => f.toUpperCase().includes("GOAL")),
  };
}

export function scanBusinesses(): BusinessInfo[] {
  const businessDirs = safeReadDir(BUSINESSES_DIR);
  const displayNames: Record<string, string> = {
    bookd: "book'd",
    lifeos: "LifeOS",
    "automotive-intelligence": "Automotive Intelligence",
    bizzycar: "BizzyCar",
  };

  return businessDirs
    .map((slug) => {
      const bizPath = path.join(BUSINESSES_DIR, slug);
      const stat = safeStat(bizPath);
      if (!stat?.isDirectory()) return null;

      const deptNames = safeReadDir(bizPath).filter((d) => {
        const s = safeStat(path.join(bizPath, d));
        return s?.isDirectory();
      });

      const departments = deptNames.map((d) =>
        scanDepartment(path.join(bizPath, d), d)
      );

      return {
        name: displayNames[slug] || slug,
        slug,
        path: bizPath,
        departments,
        fileCount: countFiles(bizPath),
        lastModified: getLatestModified(bizPath),
      };
    })
    .filter(Boolean) as BusinessInfo[];
}

export function scanOwnerFiles(): OwnerFile[] {
  const files = safeReadDir(OWNER_DIR).filter((f) => f.endsWith(".md"));
  return files.map((name) => {
    const filePath = path.join(OWNER_DIR, name);
    const stat = safeStat(filePath);
    return {
      name: name.replace(".md", ""),
      path: filePath,
      content: safeReadFile(filePath),
      lastModified: stat?.mtime || new Date(),
    };
  });
}

export function scanProtocols(): ProtocolFile[] {
  const protocolDir = path.join(SHARED_DIR, "protocols");
  const files = safeReadDir(protocolDir).filter((f) => f.endsWith(".md"));
  return files.map((name) => ({
    name: name.replace(".md", ""),
    path: path.join(protocolDir, name),
    content: safeReadFile(path.join(protocolDir, name)),
  }));
}

export function scanTemplates(): TemplateFile[] {
  const templateDir = path.join(SHARED_DIR, "templates");
  const files = safeReadDir(templateDir).filter((f) => f.endsWith(".md"));
  return files.map((name) => ({
    name: name.replace(".md", ""),
    path: path.join(templateDir, name),
  }));
}

export function readGovernance(): string {
  return safeReadFile(path.join(CLAUDE_DIR, "GOVERNANCE.md"));
}

// ── Supabase-backed versions (used in production on Vercel) ───────────────────

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}

export async function scanOwnerFilesFromSupabase(): Promise<OwnerFile[]> {
  const { data, error } = await getSupabaseClient()
    .from("claude_files")
    .select("path, content, updated_at")
    .like("path", "_owner/%");
  if (error || !data) return [];
  return data.map((row) => ({
    name: row.path.replace("_owner/", ""),
    path: row.path,
    content: row.content,
    lastModified: new Date(row.updated_at),
  }));
}

export async function readGovernanceFromSupabase(): Promise<string> {
  const { data } = await getSupabaseClient()
    .from("claude_files")
    .select("content")
    .eq("path", "GOVERNANCE")
    .single();
  return data?.content || "";
}

export async function scanProtocolsFromSupabase(): Promise<ProtocolFile[]> {
  const { data, error } = await getSupabaseClient()
    .from("claude_files")
    .select("path, content")
    .like("path", "_shared/protocols/%");
  if (error || !data) return [];
  return data.map((row) => ({
    name: row.path.replace("_shared/protocols/", ""),
    path: row.path,
    content: row.content,
  }));
}

export async function scanTemplatesFromSupabase(): Promise<TemplateFile[]> {
  const { data, error } = await getSupabaseClient()
    .from("claude_files")
    .select("path")
    .like("path", "_shared/templates/%");
  if (error || !data) return [];
  return data.map((row) => ({
    name: row.path.replace("_shared/templates/", ""),
    path: row.path,
  }));
}

export async function scanBusinessesFromSupabase(): Promise<BusinessInfo[]> {
  const { data, error } = await getSupabaseClient()
    .from("claude_files")
    .select("path, updated_at")
    .like("path", "businesses/%");
  if (error || !data) return [];

  const displayNames: Record<string, string> = {
    bookd: "book'd",
    lifeos: "LifeOS",
    "automotive-intelligence": "Automotive Intelligence",
    bizzycar: "BizzyCar",
  };

  type BizEntry = {
    slug: string;
    depts: Map<string, string[]>;
    latestMtime: Date | null;
  };
  const bizMap = new Map<string, BizEntry>();

  for (const row of data) {
    const parts = row.path.replace("businesses/", "").split("/");
    const slug = parts[0];
    const dept = parts[1];
    const file = parts[2];
    if (!bizMap.has(slug)) {
      bizMap.set(slug, { slug, depts: new Map(), latestMtime: null });
    }
    const biz = bizMap.get(slug)!;
    const mtime = new Date(row.updated_at);
    if (!biz.latestMtime || mtime > biz.latestMtime) biz.latestMtime = mtime;
    if (dept && file) {
      if (!biz.depts.has(dept)) biz.depts.set(dept, []);
      biz.depts.get(dept)!.push(file);
    }
  }

  return Array.from(bizMap.values()).map(({ slug, depts, latestMtime }) => {
    const departments: DepartmentInfo[] = Array.from(depts.entries()).map(
      ([name, files]) => ({
        name,
        path: `businesses/${slug}/${name}`,
        files,
        hasSoul: files.some((f) => f.toUpperCase().includes("SOUL")),
        hasGoals: files.some((f) => f.toUpperCase().includes("GOAL")),
      })
    );
    return {
      name: displayNames[slug] || slug,
      slug,
      path: `businesses/${slug}`,
      departments,
      fileCount: Array.from(depts.values()).reduce((s, f) => s + f.length, 0),
      lastModified: latestMtime,
    };
  });
}
