"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Terminal as TerminalIcon, X, Plus, Maximize2, Minimize2 } from "lucide-react";

interface TerminalTab {
  id: string;
  label: string;
  ws: WebSocket | null;
  buffer: string[];
}

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/terminal`
    : "";

export default function TerminalPanel() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const activeTerminal = tabs.find((t) => t.id === activeTab);

  const createTab = useCallback(() => {
    const id = `term-${Date.now()}`;
    const tab: TerminalTab = {
      id,
      label: `Shell ${tabs.length + 1}`,
      ws: null,
      buffer: [`\x1b[90m$ Connected to CCC terminal\x1b[0m\n`],
    };

    // Try WebSocket connection
    try {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setConnected(true);
        tab.buffer.push(`\x1b[32m✓ WebSocket connected\x1b[0m\n`);
        setTabs((prev) =>
          prev.map((t) => (t.id === id ? { ...t, buffer: [...t.buffer] } : t))
        );
      };
      ws.onmessage = (event) => {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, buffer: [...t.buffer, event.data] } : t
          )
        );
      };
      ws.onclose = () => {
        setConnected(false);
        setTabs((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, buffer: [...t.buffer, `\n\x1b[90m[disconnected]\x1b[0m\n`] }
              : t
          )
        );
      };
      ws.onerror = () => {
        // WebSocket not available — fall back to HTTP terminal
        setConnected(false);
        tab.buffer = [
          `\x1b[90m$ CCC Terminal (HTTP mode)\x1b[0m\n`,
          `\x1b[33mWebSocket not available — using HTTP fallback.\x1b[0m\n`,
          `\x1b[33mFor full PTY support, start the custom server:\x1b[0m\n`,
          `\x1b[90m  node server.js\x1b[0m\n\n`,
        ];
        setTabs((prev) =>
          prev.map((t) => (t.id === id ? { ...t, buffer: [...tab.buffer] } : t))
        );
      };
      tab.ws = ws;
    } catch {
      tab.buffer.push(`\x1b[33mWebSocket unavailable — HTTP fallback mode\x1b[0m\n`);
    }

    setTabs((prev) => [...prev, tab]);
    setActiveTab(id);
  }, [tabs.length]);

  // Create initial tab on mount
  useEffect(() => {
    if (tabs.length === 0) {
      createTab();
    }
  }, [createTab, tabs.length]);

  // Auto-scroll
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [activeTerminal?.buffer]);

  // Focus input when switching tabs
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  const closeTab = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.ws) tab.ws.close();
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTab === id) {
      const remaining = tabs.filter((t) => t.id !== id);
      setActiveTab(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const sendCommand = async (cmd: string) => {
    if (!cmd.trim() || !activeTerminal) return;

    // Add to history
    setHistory((prev) => [cmd, ...prev.slice(0, 50)]);
    setHistoryIdx(-1);

    // Append input to buffer
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab
          ? { ...t, buffer: [...t.buffer, `\x1b[97m$ ${cmd}\x1b[0m\n`] }
          : t
      )
    );

    if (activeTerminal.ws && activeTerminal.ws.readyState === WebSocket.OPEN) {
      // WebSocket mode — send to PTY
      activeTerminal.ws.send(cmd + "\n");
    } else {
      // HTTP fallback — POST to /api/terminal/exec
      try {
        const res = await fetch("/api/terminal/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        const output = data.output || data.error || "No output";
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab
              ? { ...t, buffer: [...t.buffer, output + "\n"] }
              : t
          )
        );
      } catch {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab
              ? {
                  ...t,
                  buffer: [
                    ...t.buffer,
                    `\x1b[31mError: Could not execute command\x1b[0m\n`,
                  ],
                }
              : t
          )
        );
      }
    }

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    }
  };

  // Strip ANSI for display (simple version)
  const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

  // Parse ANSI for color classes (simplified)
  const parseAnsi = (str: string) => {
    const parts: { text: string; className: string }[] = [];
    let currentClass = "text-zinc-300";
    const regex = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: str.slice(lastIndex, match.index), className: currentClass });
      }
      const code = match[1];
      if (code === "0" || code === "") currentClass = "text-zinc-300";
      else if (code === "31") currentClass = "text-red-400";
      else if (code === "32") currentClass = "text-emerald-400";
      else if (code === "33") currentClass = "text-amber-400";
      else if (code === "34") currentClass = "text-blue-400";
      else if (code === "90") currentClass = "text-zinc-600";
      else if (code === "97") currentClass = "text-zinc-100";
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < str.length) {
      parts.push({ text: str.slice(lastIndex), className: currentClass });
    }

    return parts;
  };

  return (
    <div
      className={`flex flex-col ${
        fullscreen
          ? "fixed inset-0 z-50 bg-surface-0"
          : "h-[calc(100vh-6rem)]"
      }`}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface-0 border-b border-white/5 px-2 py-1">
        <TerminalIcon className="w-3.5 h-3.5 text-zinc-500 mr-1" />
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg text-[11px] cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-surface-2 text-zinc-200"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span>{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="p-0.5 rounded hover:bg-surface-4 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        <button
          onClick={createTab}
          className="p-1 rounded hover:bg-surface-3 transition-colors"
          title="New terminal"
        >
          <Plus className="w-3 h-3 text-zinc-600" />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-emerald-400" : "bg-zinc-600"
            }`}
          />
          <span className="text-[9px] text-zinc-600 font-mono">
            {connected ? "ws" : "http"}
          </span>
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="p-1 rounded hover:bg-surface-3 transition-colors ml-1"
        >
          {fullscreen ? (
            <Minimize2 className="w-3 h-3 text-zinc-500" />
          ) : (
            <Maximize2 className="w-3 h-3 text-zinc-500" />
          )}
        </button>
      </div>

      {/* Terminal output */}
      <div
        ref={termRef}
        className="flex-1 overflow-y-auto bg-surface-0 px-3 py-2 font-mono text-[12px] leading-[1.6]"
        onClick={() => inputRef.current?.focus()}
      >
        {activeTerminal?.buffer.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {parseAnsi(line).map((part, j) => (
              <span key={j} className={part.className}>
                {part.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Input line */}
      <div className="flex items-center gap-2 bg-surface-1 border-t border-white/5 px-3 py-2">
        <span className="text-emerald-400 text-xs font-mono">$</span>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          rows={1}
          className="flex-1 bg-transparent text-xs text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
