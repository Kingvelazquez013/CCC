"use client";

import { useEffect, useState, useRef } from "react";
import {
  FilePlus,
  FileEdit,
  FileX,
  FolderPlus,
  Radio,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedEvent {
  id: string;
  type: "file_added" | "file_changed" | "file_removed" | "dir_added";
  path: string;
  business: string | null;
  department: string | null;
  timestamp: string;
}

const EVENT_ICONS: Record<string, typeof FilePlus> = {
  file_added: FilePlus,
  file_changed: FileEdit,
  file_removed: FileX,
  dir_added: FolderPlus,
};

const EVENT_LABELS: Record<string, string> = {
  file_added: "Created",
  file_changed: "Modified",
  file_removed: "Removed",
  dir_added: "New folder",
};

export default function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/feed?mode=sse");

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (e) => {
      try {
        const newEvents: FeedEvent[] = JSON.parse(e.data);
        setEvents((prev) => [...prev, ...newEvents].slice(-100));
      } catch {
        // heartbeat or parse error — ignore
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Activity Feed</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          />
          <span className="text-zinc-500">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1"
        style={{ maxHeight: "calc(100vh - 14rem)" }}
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-700">
            <Radio className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-xs">Watching for changes...</p>
          </div>
        ) : (
          events.map((event) => {
            const Icon = EVENT_ICONS[event.type] || FileEdit;
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-zinc-400">
                      {EVENT_LABELS[event.type]}
                    </span>
                    {event.business && (
                      <span className="text-[10px] text-zinc-600 bg-surface-3 px-1.5 py-0.5 rounded">
                        {event.business}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono truncate mt-0.5">
                    {event.path}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-700 shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(event.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
