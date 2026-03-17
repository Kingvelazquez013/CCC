"use client";

import {
  LayoutDashboard,
  Building2,
  Shield,
  Radio,
  User,
  Kanban,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export type View = "dashboard" | "pipeline" | "workspaces" | "governance" | "feed" | "owner" | "agents";

interface SidebarProps {
  active: View;
  onChange: (view: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "workspaces", label: "Workspaces", icon: Building2 },
  { id: "governance", label: "Governance", icon: Shield },
  { id: "feed", label: "Live Feed", icon: Radio },
  { id: "owner", label: "Owner", icon: User },
];

export default function Sidebar({ active, onChange, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`${
        collapsed ? "w-[52px]" : "w-[200px]"
      } min-h-[calc(100vh-3.5rem)] border-r border-white/5 bg-surface-0 p-2 flex flex-col gap-0.5 transition-all duration-200`}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center p-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-surface-2 transition-colors mb-1"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="w-4 h-4" />
        ) : (
          <PanelLeftClose className="w-4 h-4" />
        )}
      </button>

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            title={collapsed ? item.label : undefined}
            className={`flex items-center ${
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            } py-2 rounded-lg text-sm transition-colors duration-100 w-full text-left ${
              isActive
                ? "bg-surface-3 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-2"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-100" : ""}`} />
            {!collapsed && item.label}
          </button>
        );
      })}

      <div className="mt-auto px-2 py-4 border-t border-white/5">
        {collapsed ? (
          <div className="text-[9px] text-zinc-700 font-mono text-center">CCC</div>
        ) : (
          <div className="text-[10px] text-zinc-700 font-mono px-1">
            Claude Command Center
          </div>
        )}
      </div>
    </aside>
  );
}
