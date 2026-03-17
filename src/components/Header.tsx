"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, Terminal, ChevronDown, Sun, Moon, Settings, LogOut, User } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  loading: boolean;
  terminalOpen?: boolean;
  onToggleTerminal?: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function Header({
  onRefresh,
  loading,
  terminalOpen,
  onToggleTerminal,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <header className="sticky top-0 z-50 bg-surface-0 border-b border-white/5">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-zinc-100">
            Claude Command Center
          </h1>
          <span className="text-[10px] font-mono text-zinc-600 bg-surface-2 px-2 py-0.5 rounded-full">
            v2.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-zinc-500"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Terminal toggle */}
          {onToggleTerminal && (
            <button
              onClick={onToggleTerminal}
              className={`p-2 rounded-lg transition-colors duration-150 ${
                terminalOpen
                  ? "bg-surface-3 text-zinc-200"
                  : "hover:bg-surface-3 text-zinc-500"
              }`}
              aria-label="Toggle terminal"
              title="Terminal (Ctrl+`)"
            >
              <Terminal className="w-4 h-4" />
            </button>
          )}

          {/* Refresh */}
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

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-3 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <span className="text-xs text-zinc-400 font-mono hidden sm:block">
                Ryan Velazquez
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-1 border border-white/10 rounded-xl shadow-xl overflow-hidden animate-fade-in z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="text-xs font-medium text-zinc-200">Ryan Velazquez</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">Owner</div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <MenuButton
                    icon={Settings}
                    label="Settings"
                    onClick={() => {
                      setShowMenu(false);
                      // Navigate to owner/settings view
                    }}
                  />
                  <MenuButton
                    icon={theme === "dark" ? Sun : Moon}
                    label={theme === "dark" ? "Light mode" : "Dark mode"}
                    onClick={() => {
                      onToggleTheme();
                      setShowMenu(false);
                    }}
                  />
                  <div className="border-t border-white/5 my-1" />
                  <MenuButton
                    icon={LogOut}
                    label="Sign out"
                    onClick={() => setShowMenu(false)}
                    danger
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Settings;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-xs transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-zinc-400 hover:bg-surface-2 hover:text-zinc-200"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
