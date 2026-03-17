"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Kanban, Filter } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";

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

interface Business {
  slug: string;
  name: string;
  departments: { name: string }[];
}

const STAGES = [
  { id: "backlog", label: "Backlog" },
  { id: "planning", label: "Planning" },
  { id: "assigned", label: "Assigned" },
  { id: "working", label: "Working" },
  { id: "review", label: "Review" },
  { id: "approved", label: "Approved" },
  { id: "done", label: "Done" },
];

const STAGE_ORDER = STAGES.map((s) => s.id);

function nextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

interface KanbanBoardProps {
  businesses: Business[];
}

export default function KanbanBoard({ businesses }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterBiz, setFilterBiz] = useState<string>("all");
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCreate = async (data: Record<string, string>) => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowModal(false);
    fetchTasks();
  };

  const handleUpdate = async (data: Record<string, string>) => {
    if (!editingTask) return;
    await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingTask(null);
    fetchTasks();
  };

  const handleMoveForward = async (task: Task) => {
    const next = nextStage(task.stage);
    if (!next) return;
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    fetchTasks();
  };

  const handleDelete = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    fetchTasks();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage }),
    });
    fetchTasks();
  };

  const filteredTasks =
    filterBiz === "all"
      ? tasks
      : tasks.filter((t) => t.business === filterBiz);

  const tasksByStage = (stageId: string) =>
    filteredTasks.filter((t) => t.stage === stageId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Kanban className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Pipeline</h2>
          <span className="text-[10px] text-zinc-600 bg-surface-2 px-2 py-0.5 rounded-full font-mono">
            {filteredTasks.length} tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter by business */}
          <div className="flex items-center gap-1.5 bg-surface-1 border border-white/5 rounded-lg px-2 py-1">
            <Filter className="w-3 h-3 text-zinc-600" />
            <select
              value={filterBiz}
              onChange={(e) => setFilterBiz(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All businesses</option>
              {businesses.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          {/* New task button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-3 text-zinc-200 hover:bg-surface-4 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 h-full min-w-max pb-2">
          {STAGES.map((stage) => {
            const stageTasks = tasksByStage(stage.id);
            const isDragOver = dragOverStage === stage.id;

            return (
              <div
                key={stage.id}
                className={`w-[220px] flex-shrink-0 flex flex-col rounded-xl border border-white/5 bg-surface-1/50 ${
                  isDragOver ? "bg-surface-2" : ""
                } transition-colors duration-100`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.id);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/5">
                  <span className="text-[11px] font-medium text-zinc-400">
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-zinc-700 font-mono bg-surface-2 px-1.5 py-0.5 rounded">
                    {stageTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stageTasks.length === 0 ? (
                    <div className="text-center py-8 text-[10px] text-zinc-800">
                      Drop tasks here
                    </div>
                  ) : (
                    stageTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onMoveForward={() => handleMoveForward(task)}
                        onDelete={() => handleDelete(task)}
                        onEdit={() => setEditingTask(task)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", task.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <TaskModal
          task={null}
          businesses={businesses}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          businesses={businesses}
          onSave={handleUpdate}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
