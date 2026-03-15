import path from "path";

const CLAUDE_DIR = path.join(process.env.HOME || "/Users/velazquez", ".claude");

export interface FeedEvent {
  id: string;
  type: "file_added" | "file_changed" | "file_removed" | "dir_added";
  path: string;
  business: string | null;
  department: string | null;
  timestamp: Date;
}

let eventBuffer: FeedEvent[] = [];
let watcher: ReturnType<typeof import("chokidar").watch> | null = null;

function parsePath(filePath: string): {
  business: string | null;
  department: string | null;
} {
  const rel = path.relative(CLAUDE_DIR, filePath);
  const parts = rel.split(path.sep);
  if (parts[0] === "businesses" && parts.length >= 2) {
    return {
      business: parts[1],
      department: parts.length >= 3 ? parts[2] : null,
    };
  }
  return { business: null, department: null };
}

function createEvent(
  type: FeedEvent["type"],
  filePath: string
): FeedEvent {
  const { business, department } = parsePath(filePath);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    path: path.relative(CLAUDE_DIR, filePath),
    business,
    department,
    timestamp: new Date(),
  };
}

export async function startWatcher(): Promise<void> {
  if (watcher) return;

  const chokidar = await import("chokidar");
  watcher = chokidar.watch(CLAUDE_DIR, {
    ignored: /(^|[/\\])\.|node_modules/,
    persistent: true,
    ignoreInitial: true,
    depth: 5,
  });

  watcher
    .on("add", (p: string) => {
      eventBuffer.push(createEvent("file_added", p));
      if (eventBuffer.length > 200) eventBuffer = eventBuffer.slice(-100);
    })
    .on("change", (p: string) => {
      eventBuffer.push(createEvent("file_changed", p));
      if (eventBuffer.length > 200) eventBuffer = eventBuffer.slice(-100);
    })
    .on("unlink", (p: string) => {
      eventBuffer.push(createEvent("file_removed", p));
      if (eventBuffer.length > 200) eventBuffer = eventBuffer.slice(-100);
    })
    .on("addDir", (p: string) => {
      if (p !== CLAUDE_DIR) {
        eventBuffer.push(createEvent("dir_added", p));
        if (eventBuffer.length > 200) eventBuffer = eventBuffer.slice(-100);
      }
    });
}

export function getEvents(since?: number): FeedEvent[] {
  if (!since) return eventBuffer.slice(-50);
  return eventBuffer.filter((e) => e.timestamp.getTime() > since);
}
