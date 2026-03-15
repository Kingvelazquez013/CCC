"use client";

import { Diamond, RefreshCw } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  loading: boolean;
}

export default function Header({ onRefresh, loading }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <Diamond className="w-5 h-5 text-accent-emerald" />
          <h1 className="text-sm font-semibold tracking-tight">
            Claude Command Center
          </h1>
          <span className="text-[10px] font-mono text-zinc-600 bg-surface-2 px-2 py-0.5 rounded-full">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse_dot" />
            Live
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-surface-3 transition-colors duration-150 disabled:opacity-40"
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              className={`w-4 h-4 text-zinc-400 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <div className="text-xs text-zinc-500 font-mono">
            Ryan Velazquez
          </div>
        </div>
      </div>
    </header>
  );
}
