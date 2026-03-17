"use client";

import { Building2, FolderOpen, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface BusinessCardProps {
  business: Business;
  expanded: boolean;
  onToggle: () => void;
}

export default function BusinessCard({ business, expanded, onToggle }: BusinessCardProps) {
  const hasContent = business.fileCount > 0;
  const activeDepts = business.departments.filter(
    (d) => d.files.length > 0
  ).length;

  return (
    <div
      className="rounded-xl border border-white/5 bg-surface-1 transition-colors duration-100 hover:border-white/10 cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">
                {business.name}
              </h3>
              <span className="text-[11px] font-mono text-zinc-600">
                businesses/{business.slug}/
              </span>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full mt-1 ${
              hasContent ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { value: business.departments.length, label: "Depts" },
            { value: business.fileCount, label: "Files" },
            { value: activeDepts, label: "Active" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-2 rounded-lg p-2.5 text-center">
              <div className="text-lg font-semibold text-zinc-100">
                {stat.value}
              </div>
              <div className="text-[10px] text-zinc-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Last modified */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <Clock className="w-3 h-3" />
          {business.lastModified
            ? formatDistanceToNow(new Date(business.lastModified), {
                addSuffix: true,
              })
            : "No files yet"}
        </div>
      </div>

      {/* Expanded department list */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-3 space-y-1.5">
          {business.departments.map((dept) => (
            <div
              key={dept.name}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs text-zinc-300 font-mono">
                  {dept.name}/
                </span>
              </div>
              <div className="flex items-center gap-2">
                {dept.hasSoul && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-zinc-400 font-mono">
                    Soul
                  </span>
                )}
                {dept.hasGoals && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-zinc-400 font-mono">
                    Goals
                  </span>
                )}
                {dept.files.length > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <FileText className="w-3 h-3" />
                    {dept.files.length}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-700 italic">
                    empty
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
