"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar, { type View } from "@/components/Sidebar";
import BusinessCard from "@/components/BusinessCard";
import LiveFeed from "@/components/LiveFeed";
import GovernanceView from "@/components/GovernanceView";
import OwnerPanel from "@/components/OwnerPanel";
import KanbanBoard from "@/components/KanbanBoard";
import {
  Building2,
  FolderTree,
  FileText,
  Boxes,
  ArrowRight,
} from "lucide-react";

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
      <Header onRefresh={fetchData} loading={loading} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={view} onChange={setView} />

        <main className="flex-1 overflow-y-auto p-6">
          {/* ── Dashboard View ── */}
          {view === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Businesses",
                    value: businesses.length,
                    icon: Building2,
                    color: "text-accent-emerald",
                  },
                  {
                    label: "Departments",
                    value: totalDepts,
                    icon: FolderTree,
                    color: "text-accent-cyan",
                  },
                  {
                    label: "Total Files",
                    value: totalFiles,
                    icon: FileText,
                    color: "text-accent-amber",
                  },
                  {
                    label: "Active",
                    value: activeBiz,
                    icon: Boxes,
                    color: "text-accent-violet",
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="bg-surface-1 rounded-xl border border-white/5 p-4 flex items-center gap-4"
                    >
                      <div className="p-2.5 rounded-lg bg-surface-2">
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-zinc-100">
                          {stat.value}
                        </div>
                        <div className="text-[11px] text-zinc-600 uppercase tracking-wide">
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
                    Business Overview
                  </h2>
                  <button
                    onClick={() => setView("businesses")}
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
            <div className="h-[calc(100vh-6rem)] animate-fade-in">
              <KanbanBoard businesses={businesses} />
            </div>
          )}

          {/* ── Businesses View ── */}
          {view === "businesses" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">
                All Businesses
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
            <div className="animate-fade-in">
              <GovernanceView />
            </div>
          )}

          {/* ── Live Feed View ── */}
          {view === "feed" && (
            <div className="bg-surface-1 rounded-xl border border-white/5 p-5 h-[calc(100vh-6rem)] animate-fade-in">
              <LiveFeed />
            </div>
          )}

          {/* ── Owner View ── */}
          {view === "owner" && (
            <div className="animate-fade-in">
              <OwnerPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
