"use client";

import {
  GripVertical,
  ChevronRight,
  Trash2,
  Building2,
  User,
  Clock,
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

/* ── Task Aging ─────────────────────────────────────────────────── */
const AGING_STAGES = new Set(["assigned", "working", "review", "approved"]);
const AGING_THRESHOLDS = { warning: 1, danger: 3 }; // days

type AgingLevel = "normal" | "warning" | "danger";

function getAgingLevel(stage: string, updatedAt: string): AgingLevel {
  if (!AGING_STAGES.has(stage)) return "normal";
  const days = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
  if (days >= AGING_THRESHOLDS.danger) return "danger";
  if (days >= AGING_THRESHOLDS.warning) return "warning";
  return "normal";
}

function getDaysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

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
  const agingLevel = getAgingLevel(task.stage, task.updated_at);
  const daysInStage = getDaysInStage(task.updated_at);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onEdit}
      className="bg-surface-2 rounded-lg border border-white/5 p-3 cursor-grab active:cursor-grabbing hover:border-white/10 transition-colors duration-100 group"
    >
      {/* Drag handle + priority + aging */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-3 text-zinc-400">
            {task.priority}
          </span>
          {agingLevel !== "normal" && (
            <span
              className={`flex items-center gap-0.5 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded ${
                agingLevel === "danger"
                  ? "text-red-400"
                  : "text-amber-400"
              }`}
              title={`${daysInStage}d in ${task.stage}`}
            >
              <Clock className="w-2.5 h-2.5" />
              {daysInStage}d
            </span>
          )}
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
              <ChevronRight className="w-3 h-3 text-zinc-400" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-500/10 transition-colors"
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
          <Building2 className="w-3 h-3 text-zinc-600" />
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
