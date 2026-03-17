"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import PlanningPanel from "./PlanningPanel";

interface Task {
  id: string;
  title: string;
  description: string;
  business: string;
  department: string;
  assigned_agent: string;
  stage: string;
  priority: string;
}

interface TaskModalProps {
  task: Task | null; // null = create mode
  businesses: { slug: string; name: string; departments: { name: string }[] }[];
  onSave: (data: Record<string, string>) => void;
  onClose: () => void;
}

const STAGES = [
  { value: "backlog", label: "Backlog" },
  { value: "planning", label: "Planning" },
  { value: "assigned", label: "Assigned" },
  { value: "working", label: "Working" },
  { value: "review", label: "Review" },
  { value: "approved", label: "Approved" },
  { value: "done", label: "Done" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function TaskModal({
  task,
  businesses,
  onSave,
  onClose,
}: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [business, setBusiness] = useState(task?.business || (businesses[0]?.slug || ""));
  const [department, setDepartment] = useState(task?.department || "");
  const [assignedAgent, setAssignedAgent] = useState(task?.assigned_agent || "");
  const [stage, setStage] = useState(task?.stage || "backlog");
  const [priority, setPriority] = useState(task?.priority || "medium");

  const isEdit = !!task;
  const selectedBiz = businesses.find((b) => b.slug === business);
  const departments = selectedBiz?.departments || [];

  // Reset department when business changes
  useEffect(() => {
    if (!isEdit) setDepartment("");
  }, [business, isEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !business) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      business,
      department,
      assigned_agent: assignedAgent.trim(),
      stage,
      priority,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-1 rounded-xl border border-white/10 w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-zinc-200">
            {isEdit ? "Edit Task" : "New Task"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-3 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Planning Panel — shown when editing a task in planning stage */}
        {isEdit && task.stage === "planning" && (
          <div className="p-5 border-b border-white/5">
            <PlanningPanel
              taskId={task.id}
              taskTitle={task.title}
              onFinalize={() => {
                onSave({ stage: "assigned" });
              }}
              onSkip={() => {
                onSave({ stage: "assigned" });
              }}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details, context, requirements..."
              rows={3}
              className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20 transition-colors resize-none"
            />
          </div>

          {/* Business + Department row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1.5">
                Business
              </label>
              <select
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/20 transition-colors"
              >
                {businesses.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/20 transition-colors"
              >
                <option value="">Any</option>
                {departments.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority + Stage row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/20 transition-colors"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1.5">
                Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/20 transition-colors"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Agent */}
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1.5">
              Assigned Agent
            </label>
            <input
              type="text"
              value={assignedAgent}
              onChange={(e) => setAssignedAgent(e.target.value)}
              placeholder="e.g. eng-agent, content-agent"
              className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !business}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
