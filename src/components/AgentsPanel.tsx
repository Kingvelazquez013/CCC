"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  status: "standby" | "working" | "offline";
  model: string;
  fallback_model: string | null;
  departments: string[];
  businesses: string[];
  priority_floor: string;
  system_prompt: string;
  executor: string;
  executor_config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Execution {
  id: string;
  agent_id: string;
  task_id: string;
  model_used: string;
  status: "running" | "success" | "failed" | "timeout";
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  tokens_used: number | null;
}

const STATUS_DOT: Record<string, string> = {
  standby: "bg-emerald-400",
  working: "bg-blue-400 animate-pulse",
  offline: "bg-zinc-600",
};

const EXEC_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  failed: XCircle,
  running: Activity,
  timeout: Clock,
};

const EXEC_STATUS_COLOR: Record<string, string> = {
  success: "text-emerald-400",
  failed: "text-red-400",
  running: "text-blue-400",
  timeout: "text-amber-400",
};

/* ── Model catalog by provider ────────────────────────────────── */

interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

const MODEL_CATALOG: ModelOption[] = [
  // Anthropic
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "anthropic" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "anthropic" },
  // OpenAI
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { id: "o3", label: "o3", provider: "openai" },
  { id: "o4-mini", label: "o4-mini", provider: "openai" },
  // DeepSeek
  { id: "deepseek-chat", label: "DeepSeek V3", provider: "deepseek" },
  { id: "deepseek-reasoner", label: "DeepSeek R1", provider: "deepseek" },
  // Google
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google" },
  // Local / Ollama
  { id: "llama3.3:70b", label: "Llama 3.3 70B", provider: "ollama" },
  { id: "codellama:34b", label: "Code Llama 34B", provider: "ollama" },
  { id: "mistral:7b", label: "Mistral 7B", provider: "ollama" },
];

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  google: "Google",
  ollama: "Ollama (local)",
};

/* ── Built-in roles + custom ─────────────────────────────────── */

const BUILT_IN_ROLES = [
  { value: "builder", label: "Builder", desc: "Writes code, fixes bugs, builds features" },
  { value: "writer", label: "Writer", desc: "Creates content, copy, blog posts" },
  { value: "researcher", label: "Researcher", desc: "Gathers info, analyzes data" },
  { value: "reviewer", label: "Reviewer", desc: "Reviews work quality, verifies completeness" },
  { value: "social-media-manager", label: "Social Media Manager", desc: "Manages social media presence and engagement" },
  { value: "sales-manager", label: "Sales Manager", desc: "Handles sales strategy and outreach" },
  { value: "project-manager", label: "Project Manager", desc: "Coordinates tasks, timelines, and teams" },
  { value: "designer", label: "Designer", desc: "UI/UX design, visual assets, branding" },
  { value: "data-analyst", label: "Data Analyst", desc: "Analyzes metrics, creates reports" },
  { value: "qa-tester", label: "QA Tester", desc: "Tests features, finds bugs, writes test cases" },
  { value: "devops", label: "DevOps Engineer", desc: "CI/CD, infrastructure, deployments" },
  { value: "support", label: "Support Agent", desc: "Customer support, troubleshooting" },
];

/* ── Model Selector Component ─────────────────────────────────── */

function ModelSelector({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const isCustom = value && !MODEL_CATALOG.find((m) => m.id === value);

  if (showCustom || isCustom) {
    return (
      <div className="flex gap-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom model ID..."
          className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20"
        />
        <button
          type="button"
          onClick={() => {
            setShowCustom(false);
            if (isCustom) onChange(MODEL_CATALOG[0].id);
          }}
          className="px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          List
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/20"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {Object.keys(PROVIDER_LABELS).map((provider) => {
          const models = MODEL_CATALOG.filter((m) => m.provider === provider);
          if (models.length === 0) return null;
          return (
            <optgroup key={provider} label={PROVIDER_LABELS[provider]}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <button
        type="button"
        onClick={() => setShowCustom(true)}
        className="px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
        title="Enter custom model ID"
      >
        Custom
      </button>
    </div>
  );
}

/* ── Role Selector Component ──────────────────────────────────── */

function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const isCustom = value && !BUILT_IN_ROLES.find((r) => r.value === value);

  if (showCustom || isCustom) {
    return (
      <div className="flex gap-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom role..."
          className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20"
        />
        <button
          type="button"
          onClick={() => {
            setShowCustom(false);
            if (isCustom) onChange(BUILT_IN_ROLES[0].value);
          }}
          className="px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          List
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/20"
      >
        {BUILT_IN_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowCustom(true)}
        className="px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
        title="Enter custom role"
      >
        Custom
      </button>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Record<string, Execution[]>>({});
  const [showCreate, setShowCreate] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data);
    } catch {
      // handle error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const fetchExecutions = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}?executions=true`);
      const data = await res.json();
      if (data.executions) {
        setExecutions((prev) => ({ ...prev, [agentId]: data.executions }));
      }
    } catch {
      // handle error
    }
  };

  const toggleExpand = (agentId: string) => {
    if (expandedAgent === agentId) {
      setExpandedAgent(null);
    } else {
      setExpandedAgent(agentId);
      if (!executions[agentId]) {
        fetchExecutions(agentId);
      }
    }
  };

  const toggleEnabled = async (agent: Agent) => {
    await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !agent.enabled }),
    });
    fetchAgents();
  };

  const enabledAgents = agents.filter((a) => a.enabled);
  const disabledAgents = agents.filter((a) => !a.enabled);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Agents</h2>
          <span className="text-[10px] text-zinc-600 bg-surface-2 px-2 py-0.5 rounded-full font-mono">
            {enabledAgents.length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAgents}
            className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-3 text-zinc-200 hover:bg-surface-4 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Agent
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateAgentForm
          onCreated={() => {
            setShowCreate(false);
            fetchAgents();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Agent list */}
      {loading ? (
        <div className="text-center py-12 text-xs text-zinc-600">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-600">No agents configured.</p>
          <p className="text-[10px] text-zinc-700 mt-1">
            Run the migration SQL to seed default agents.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...enabledAgents, ...disabledAgents].map((agent) => {
            const isExpanded = expandedAgent === agent.id;
            const agentExecs = executions[agent.id] || [];
            const modelInfo = MODEL_CATALOG.find((m) => m.id === agent.model);

            return (
              <div
                key={agent.id}
                className={`rounded-xl border bg-surface-1 transition-colors ${
                  agent.enabled ? "border-white/5" : "border-white/5 opacity-50"
                }`}
              >
                {/* Agent row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2/50 transition-colors"
                  onClick={() => toggleExpand(agent.id)}
                >
                  <span className="text-lg">{agent.avatar_emoji}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200">
                        {agent.name}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[agent.status]}`}
                        title={agent.status}
                      />
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {agent.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {modelInfo ? modelInfo.label : agent.model}
                      </span>
                      {modelInfo && (
                        <span className="text-[9px] text-zinc-700 bg-surface-2 px-1.5 py-0.5 rounded">
                          {PROVIDER_LABELS[modelInfo.provider]}
                        </span>
                      )}
                      {agent.departments.length > 0 && (
                        <span className="text-[10px] text-zinc-700">
                          {agent.departments.slice(0, 3).join(", ")}
                          {agent.departments.length > 3 && ` +${agent.departments.length - 3}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEnabled(agent);
                    }}
                    className={`relative w-8 h-4 rounded-full transition-colors ${
                      agent.enabled ? "bg-emerald-500/30" : "bg-surface-4"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                        agent.enabled
                          ? "left-4.5 bg-emerald-400"
                          : "left-0.5 bg-zinc-600"
                      }`}
                    />
                  </button>

                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-3 py-3">
                      <DetailItem label="Model" value={modelInfo ? modelInfo.label : agent.model} />
                      <DetailItem label="Fallback" value={agent.fallback_model || "none"} />
                      <DetailItem label="Executor" value={agent.executor} />
                      <DetailItem label="Priority floor" value={agent.priority_floor} />
                      <DetailItem
                        label="Departments"
                        value={agent.departments.length > 0 ? agent.departments.join(", ") : "all"}
                      />
                      <DetailItem
                        label="Workspaces"
                        value={agent.businesses.length > 0 ? agent.businesses.join(", ") : "all"}
                      />
                    </div>

                    {agent.system_prompt && (
                      <div className="mb-3">
                        <div className="text-[10px] text-zinc-600 mb-1">System prompt</div>
                        <div className="bg-surface-2 rounded-lg p-2.5 text-[11px] text-zinc-400 leading-relaxed max-h-24 overflow-y-auto">
                          {agent.system_prompt}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1.5">Recent executions</div>
                      {agentExecs.length === 0 ? (
                        <div className="text-[10px] text-zinc-700 py-2">No executions yet</div>
                      ) : (
                        <div className="space-y-1">
                          {agentExecs.slice(0, 5).map((exec) => {
                            const Icon = EXEC_STATUS_ICON[exec.status] || Activity;
                            const color = EXEC_STATUS_COLOR[exec.status] || "text-zinc-500";
                            return (
                              <div
                                key={exec.id}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-surface-2/50"
                              >
                                <Icon className={`w-3 h-3 ${color}`} />
                                <span className="text-[10px] text-zinc-400 font-mono flex-1 truncate">
                                  {exec.task_id?.slice(0, 8)}...
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                  {exec.model_used}
                                </span>
                                {exec.duration_ms && (
                                  <span className="text-[10px] text-zinc-700 font-mono">
                                    {(exec.duration_ms / 1000).toFixed(1)}s
                                  </span>
                                )}
                                {exec.tokens_used && (
                                  <span className="text-[10px] text-zinc-700 font-mono">
                                    {exec.tokens_used.toLocaleString()} tok
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-600">{label}</div>
      <div className="text-[11px] text-zinc-400 font-mono truncate">{value}</div>
    </div>
  );
}

/* ── Create Agent Form ──────────────────────────────────────────── */

function CreateAgentForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("builder");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [fallbackModel, setFallbackModel] = useState("claude-opus-4-6");
  const [executor, setExecutor] = useState("claude-cli");
  const [departments, setDepartments] = useState("");
  const [emoji, setEmoji] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !model.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          model: model.trim(),
          fallback_model: fallbackModel.trim() || null,
          executor,
          departments: departments
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
          avatar_emoji: emoji || undefined,
          system_prompt: systemPrompt.trim(),
        }),
      });
      onCreated();
    } catch {
      // handle error
    }
    setSaving(false);
  };

  return (
    <div className="bg-surface-1 rounded-xl border border-white/5 p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-300">New Agent</span>
        <button onClick={onCancel} className="p-1 rounded hover:bg-surface-3">
          <X className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name + Emoji */}
        <div className="grid grid-cols-4 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. eng-agent)"
            className="col-span-3 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20"
          />
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="Emoji"
            className="bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20 text-center"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-[10px] text-zinc-600 mb-1">Role</label>
          <RoleSelector value={role} onChange={setRole} />
        </div>

        {/* Model */}
        <div>
          <label className="block text-[10px] text-zinc-600 mb-1">Model</label>
          <ModelSelector value={model} onChange={setModel} />
        </div>

        {/* Fallback Model */}
        <div>
          <label className="block text-[10px] text-zinc-600 mb-1">Fallback model</label>
          <ModelSelector value={fallbackModel} onChange={setFallbackModel} placeholder="None" />
        </div>

        {/* Executor */}
        <div>
          <label className="block text-[10px] text-zinc-600 mb-1">Execution backend</label>
          <select
            value={executor}
            onChange={(e) => setExecutor(e.target.value)}
            className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/20"
          >
            <option value="claude-cli">Claude CLI</option>
            <option value="http">HTTP (Ollama / OpenAI / custom)</option>
            <option value="openclaw">OpenClaw Gateway</option>
          </select>
        </div>

        {/* Departments */}
        <input
          value={departments}
          onChange={(e) => setDepartments(e.target.value)}
          placeholder="Departments (comma-separated)"
          className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20"
        />

        {/* System prompt */}
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="System prompt — describe what this agent does..."
          rows={2}
          className="w-full bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20 resize-none"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !model.trim() || saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Creating..." : "Create Agent"}
          </button>
        </div>
      </form>
    </div>
  );
}
