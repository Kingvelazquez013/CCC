"use client";

import {
  LayoutDashboard,
  Building2,
  Shield,
  Radio,
  User,
  Kanban,
} from "lucide-react";

export type View = "dashboard" | "pipeline" | "businesses" | "governance" | "feed" | "owner";

interface SidebarProps {
  active: View;
  onChange: (view: View) => void;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "governance", label: "Governance", icon: Shield },
  { id: "feed", label: "Live Feed", icon: Radio },
  { id: "owner", label: "Owner", icon: User },
];

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="w-[200px] min-h-[calc(100vh-3.5rem)] border-r border-white/5 bg-surface-0 p-3 flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-3 py-2">
        Navigation
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full text-left ${
              isActive
                ? "bg-surface-3 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-2"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-accent-emerald" : ""}`} />
            {item.label}
          </button>
        );
      })}

      <div className="mt-auto px-3 py-4 border-t border-white/5">
        <div className="text-[10px] text-zinc-600 font-mono leading-relaxed">
          ~/.claude/<br />
          layered cake v1
        </div>
      </div>
    </aside>
  );
}
