"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  X,
  Plus,
  Maximize2,
  Minimize2,
  GripHorizontal,
  ChevronDown,
} from "lucide-react";

interface TerminalTab {
  id: string;
  label: string;
  ws: WebSocket | null;
  buffer: string[];
  cwd: string;
}

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/terminal`
    : "";

interface TerminalDockProps {
  visible: boolean;
  onClose: () => void;
}

export default function TerminalDock({ visible, onClose }: TerminalDockProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [height, setHeight] = useState(300);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
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
      buffer: [],
      cwd: "~",
    };

    // Try WebSocket connection
    try {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setConnected(true);
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
              ? { ...t, buffer: [...t.buffer, `\x1b[90m[session ended]\x1b[0m\n`] }
              : t
          )
        );
      };
      ws.onerror = () => {
        setConnected(false);
        tab.buffer = [
          `\x1b[90mCCC Terminal — HTTP mode\x1b[0m\n`,
          `\x1b[90mFor full PTY: npm install node-pty ws && node server.js\x1b[0m\n\n`,
        ];
        setTabs((prev) =>
          prev.map((t) => (t.id === id ? { ...t, buffer: [...tab.buffer] } : t))
        );
      };
      tab.ws = ws;
    } catch {
      tab.buffer.push(`\x1b[90mCCC Terminal — HTTP mode\x1b[0m\n\n`);
    }

    setTabs((prev) => [...prev, tab]);
    setActiveTab(id);
  }, [tabs.length]);

  // Create initial tab when first opened
  useEffect(() => {
    if (visible && tabs.length === 0) {
      createTab();
    }
  }, [visible, createTab, tabs.length]);

  // Auto-scroll
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [activeTerminal?.buffer]);

  // Focus input when visible or switching tabs
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeTab, visible]);

  // Drag-to-resize
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        const newH = Math.max(150, Math.min(window.innerHeight - 100, dragRef.current.startH + delta));
        setHeight(newH);
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [height]
  );

  const closeTab = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.ws) tab.ws.close();
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTab === id) {
      setActiveTab(remaining.length > 0 ? remaining[0].id : null);
    }
    if (remaining.length === 0) {
      onClose();
    }
  };

  const sendCommand = async (cmd: string) => {
    if (!cmd.trim() || !activeTerminal) return;

    setHistory((prev) => [cmd, ...prev.slice(0, 50)]);
    setHistoryIdx(-1);

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab
          ? { ...t, buffer: [...t.buffer, `\x1b[97m$ ${cmd}\x1b[0m\n`] }
          : t
      )
    );

    if (activeTerminal.ws && activeTerminal.ws.readyState === WebSocket.OPEN) {
      activeTerminal.ws.send(cmd + "\n");
    } else {
      // HTTP fallback with working directory tracking
      try {
        const res = await fetch("/api/terminal/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd, cwd: activeTerminal.cwd }),
        });
        const data = await res.json();
        const output = data.output || data.error || "";
        if (data.cwd) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab ? { ...t, cwd: data.cwd } : t
            )
          );
        }
        if (output) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab
                ? { ...t, buffer: [...t.buffer, output + "\n"] }
                : t
            )
          );
        }
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
    if (e.key === "Enter") {
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
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      // Clear terminal
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab ? { ...t, buffer: [] } : t))
      );
    }
  };

  // Parse ANSI color codes
  const parseAnsi = (str: string) => {
    const parts: { text: string; className: string }[] = [];
    let currentClass = "text-zinc-300";
    const regex = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: str.slice(lastIndex, match.index),
          className: currentClass,
        });
      }
      const code = match[1];
      if (code === "0" || code === "") currentClass = "text-zinc-300";
      else if (code === "31") currentClass = "text-red-400";
      else if (code === "32") currentClass = "text-emerald-400";
      else if (code === "33") currentClass = "text-amber-400";
      else if (code === "34") currentClass = "text-blue-400";
      else if (code === "35") currentClass = "text-purple-400";
      else if (code === "36") currentClass = "text-cyan-400";
      else if (code === "90") currentClass = "text-zinc-600";
      else if (code === "97") currentClass = "text-zinc-100";
      else if (code === "1") currentClass += " font-bold";
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < str.length) {
      parts.push({ text: str.slice(lastIndex), className: currentClass });
    }

    return parts;
  };

  if (!visible) return null;

  const panelHeight = maximized ? "100vh" : `${height}px`;

  return (
    <div
      className={`flex flex-col bg-surface-0 border-t border-white/10 ${
        maximized ? "fixed inset-0 z-50" : "relative"
      }`}
      style={{ height: panelHeight }}
    >
      {/* Drag handle */}
      {!maximized && (
        <div
          onMouseDown={onDragStart}
          className="h-1 cursor-row-resize hover:bg-white/10 transition-colors flex items-center justify-center group"
        >
          <GripHorizontal className="w-4 h-3 text-zinc-800 group-hover:text-zinc-500 transition-colors" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 bg-surface-0 px-2 py-1 border-b border-white/5 shrink-0">
        <TerminalIcon className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />

        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] cursor-pointer transition-colors ${
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
              className="p-0.5 rounded hover:bg-surface-4 transition-colors opacity-0 group-hover:opacity-100"
              style={{ opacity: activeTab === tab.id ? 1 : undefined }}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        <button
          onClick={createTab}
          className="p-1 rounded hover:bg-surface-3 transition-colors"
          title="New terminal (Ctrl+Shift+`)"
        >
          <Plus className="w-3 h-3 text-zinc-600" />
        </button>

        <div className="flex-1" />

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5 mr-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-emerald-400" : "bg-zinc-600"
            }`}
          />
          <span className="text-[9px] text-zinc-600 font-mono">
            {connected ? "pty" : "http"}
          </span>
        </div>

        {/* Maximize / minimize */}
        <button
          onClick={() => setMaximized(!maximized)}
          className="p-1 rounded hover:bg-surface-3 transition-colors"
          title={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? (
            <Minimize2 className="w-3 h-3 text-zinc-500" />
          ) : (
            <Maximize2 className="w-3 h-3 text-zinc-500" />
          )}
        </button>

        {/* Close panel */}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-3 transition-colors"
          title="Close terminal (Ctrl+`)"
        >
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </button>
      </div>

      {/* Terminal output */}
      <div
        ref={termRef}
        className="flex-1 overflow-y-auto bg-surface-0 px-3 py-2 font-mono text-[12px] leading-[1.6] select-text"
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
      <div className="flex items-center gap-2 bg-surface-1 border-t border-white/5 px-3 py-2 shrink-0">
        <span className="text-[10px] text-zinc-600 font-mono shrink-0">
          {activeTerminal?.cwd ?? "~"}
        </span>
        <span className="text-emerald-400/70 text-xs font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="flex-1 bg-transparent text-xs text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
