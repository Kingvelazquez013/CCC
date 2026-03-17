"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar, { type View } from "@/components/Sidebar";
import BusinessCard from "@/components/BusinessCard";
import LiveFeed from "@/components/LiveFeed";
import GovernanceView from "@/components/GovernanceView";
import OwnerPanel from "@/components/OwnerPanel";
import KanbanBoard from "@/components/KanbanBoard";
import AgentsPanel from "@/components/AgentsPanel";
import TerminalDock from "@/components/TerminalDock";
import {
  Building2,
  FolderTree,
  FileText,
  Boxes,
  ArrowRight,
} from "lucide-react";

type StatItem = {
  label: string;
  value: number;
  icon: typeof Building2;
};

interface Department {
  name: string;
  files: string[];
  hasSoul: boolean;
  hasGoals: boolean;
}

interface Business {
  name: string;
  slug: string;
  departments: Department[];
  fileCount: number;
  lastModified: string | null;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedBiz, setExpandedBiz] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTerminal = useCallback(() => {
    setTerminalOpen((prev) => !prev);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ccc-theme", next);
      return next;
    });
  }, []);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("ccc-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  // Load saved sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("ccc-sidebar-collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ccc-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  // Global keyboard shortcut: Ctrl+` to toggle terminal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleTerminal();
      }
      // Ctrl+B to toggle sidebar
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleTerminal, toggleSidebar]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/businesses");
      const data = await res.json();
      setBusinesses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalDepts = businesses.reduce(
    (sum, b) => sum + b.departments.length,
    0
  );
  const totalFiles = businesses.reduce((sum, b) => sum + b.fileCount, 0);
  const activeBiz = businesses.filter((b) => b.fileCount > 0).length;

  return (
    <div className="flex flex-col h-screen">
      <Header
        onRefresh={fetchData}
        loading={loading}
        terminalOpen={terminalOpen}
        onToggleTerminal={toggleTerminal}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          active={view}
          onChange={setView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {/* ── Dashboard View ── */}
            {view === "dashboard" && (
              <div className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { label: "Workspaces", value: businesses.length, icon: Building2 },
                    { label: "Departments", value: totalDepts, icon: FolderTree },
                    { label: "Total Files", value: totalFiles, icon: FileText },
                    { label: "Active", value: activeBiz, icon: Boxes },
                  ] as StatItem[]).map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="bg-surface-1 rounded-xl border border-white/5 p-4 flex items-center gap-4"
                      >
                        <div className="p-2.5 rounded-lg bg-surface-2">
                          <Icon className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-zinc-100">
                            {stat.value}
                          </div>
                          <div className="text-[11px] text-zinc-600">
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Business cards */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-zinc-300">
                      Workspace Overview
                    </h2>
                    <button
                      onClick={() => setView("workspaces")}
                      className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      View all <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {businesses.map((biz) => (
                      <BusinessCard
                        key={biz.slug}
                        business={biz}
                        expanded={expandedBiz === biz.slug}
                        onToggle={() =>
                          setExpandedBiz(
                            expandedBiz === biz.slug ? null : biz.slug
                          )
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Live feed preview */}
                <div className="bg-surface-1 rounded-xl border border-white/5 p-5">
                  <LiveFeed />
                </div>
              </div>
            )}

            {/* ── Pipeline View ── */}
            {view === "pipeline" && (
              <div className="h-[calc(100vh-6rem)]">
                <KanbanBoard businesses={businesses} />
              </div>
            )}

            {/* ── Workspaces View ── */}
            {view === "workspaces" && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">
                  All Workspaces
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {businesses.map((biz) => (
                    <BusinessCard
                      key={biz.slug}
                      business={biz}
                      expanded={expandedBiz === biz.slug}
                      onToggle={() =>
                        setExpandedBiz(
                          expandedBiz === biz.slug ? null : biz.slug
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Governance View ── */}
            {view === "governance" && (
              <div>
                <GovernanceView />
              </div>
            )}

            {/* ── Live Feed View ── */}
            {view === "feed" && (
              <div className="bg-surface-1 rounded-xl border border-white/5 p-5 h-[calc(100vh-6rem)]">
                <LiveFeed />
              </div>
            )}

            {/* ── Owner View ── */}
            {view === "owner" && (
              <div>
                <OwnerPanel />
              </div>
            )}

            {/* ── Agents View ── */}
            {view === "agents" && (
              <div>
                <AgentsPanel />
              </div>
            )}
          </main>

          {/* ── Terminal Dock (bottom panel) ── */}
          <TerminalDock
            visible={terminalOpen}
            onClose={() => setTerminalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
