"use client";

import {
  GripVertical,
  ChevronRight,
  Trash2,
  Building2,
  User,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  business: string;
  department: string;
  assigned_agent: string;
  stage: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const BIZ_COLORS: Record<string, string> = {
  bookd: "text-emerald-400",
  lifeos: "text-cyan-400",
  "automotive-intelligence": "text-amber-400",
  bizzycar: "text-violet-400",
};

interface TaskCardProps {
  task: Task;
  onMoveForward: () => void;
  onDelete: () => void;
  onEdit: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function TaskCard({
  task,
  onMoveForward,
  onDelete,
  onEdit,
  draggable = true,
  onDragStart,
}: TaskCardProps) {
  const canMoveForward = task.stage !== "done";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onEdit}
      className="bg-surface-2 rounded-lg border border-white/5 p-3 cursor-grab active:cursor-grabbing hover:border-white/10 transition-all duration-150 group"
    >
      {/* Drag handle + priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span
            className={`text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}
          >
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canMoveForward && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveForward();
              }}
              className="p-1 rounded hover:bg-surface-4 transition-colors"
              title="Move to next stage"
            >
              <ChevronRight className="w-3 h-3 text-accent-emerald" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-500/20 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-3 h-3 text-zinc-600 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-zinc-200 mb-2 leading-snug">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-[11px] text-zinc-600 mb-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: business + agent */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          <Building2 className={`w-3 h-3 ${BIZ_COLORS[task.business] || "text-zinc-500"}`} />
          <span className="text-[10px] text-zinc-500 font-mono">
            {task.business}
            {task.department ? `/${task.department}` : ""}
          </span>
        </div>
        {task.assigned_agent && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-zinc-600" />
            <span className="text-[10px] text-zinc-500 font-mono">
              {task.assigned_agent}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
