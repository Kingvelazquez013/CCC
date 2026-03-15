"use client";

import { useEffect, useState } from "react";
import { Shield, FileText, ScrollText, Pencil, X, Check } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface Protocol {
  name: string;
  content: string;
}

interface Template {
  name: string;
}

interface GovernanceData {
  governance: string;
  protocols: Protocol[];
  templates: Template[];
}

type EditTarget = { type: "governance" } | { type: "protocol"; name: string };

export default function GovernanceView() {
  const [data, setData] = useState<GovernanceData | null>(null);
  const [activeTab, setActiveTab] = useState<"governance" | "protocols" | "templates">("governance");
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetch("/api/governance")
      .then((r) => r.json())
      .then(setData);
  }, []);

  function startEdit(target: EditTarget) {
    if (!data) return;
    if (target.type === "governance") {
      setDraft(data.governance);
    } else {
      const p = data.protocols.find((p) => p.name === target.name);
      setDraft(p?.content || "");
    }
    setEditTarget(target);
  }

  function cancelEdit() {
    setEditTarget(null);
    setDraft("");
  }

  async function saveEdit() {
    if (!editTarget || !data) return;
    setSaving(true);

    const path =
      editTarget.type === "governance"
        ? "GOVERNANCE"
        : `_shared/protocols/${editTarget.name}`;

    await fetch("/api/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content: draft }),
    });

    // Update local state immediately
    if (editTarget.type === "governance") {
      setData({ ...data, governance: draft });
    } else {
      setData({
        ...data,
        protocols: data.protocols.map((p) =>
          p.name === editTarget.name ? { ...p, content: draft } : p
        ),
      });
    }

    setSaving(false);
    setEditTarget(null);
    setDraft("");
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-700 text-sm">
        Loading governance...
      </div>
    );
  }

  const isEditing = editTarget !== null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-4 h-4 text-accent-emerald" />
        <h2 className="text-sm font-semibold text-zinc-200">
          Governance & Protocols
        </h2>
        {savedMsg && (
          <span className="text-[10px] text-accent-emerald font-mono ml-auto">
            saved — pull script will sync to disk
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-1 p-1 rounded-lg w-fit">
        {(
          [
            { id: "governance", label: "Governance", icon: Shield },
            { id: "protocols", label: "Protocols", icon: ScrollText },
            { id: "templates", label: "Templates", icon: FileText },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              cancelEdit();
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              activeTab === id
                ? "bg-surface-3 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Governance tab ── */}
      {activeTab === "governance" && (
        <div className="bg-surface-1 rounded-xl border border-white/5 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5">
            <span className="text-[11px] text-zinc-600 font-mono">GOVERNANCE.md</span>
            <div className="flex items-center gap-2">
              {isEditing && editTarget?.type === "governance" ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs text-accent-emerald hover:text-emerald-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEdit({ type: "governance" })}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
          {isEditing && editTarget?.type === "governance" ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[60vh] p-5 bg-surface-2 text-zinc-200 font-mono text-xs resize-none focus:outline-none"
              spellCheck={false}
            />
          ) : (
            <div className="p-6 prose-dark">
              <MarkdownRenderer content={data.governance} />
            </div>
          )}
        </div>
      )}

      {/* ── Protocols tab ── */}
      {activeTab === "protocols" && (
        <div className="space-y-3 animate-fade-in">
          {data.protocols.map((protocol) => {
            const isEditingThis =
              isEditing &&
              editTarget?.type === "protocol" &&
              editTarget.name === protocol.name;
            return (
              <div
                key={protocol.name}
                className="bg-surface-1 rounded-xl border border-white/5 overflow-hidden"
              >
                <button
                  onClick={() =>
                    !isEditing &&
                    setActiveProtocol(
                      activeProtocol === protocol.name ? null : protocol.name
                    )
                  }
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-2/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-3.5 h-3.5 text-accent-cyan" />
                    <span className="text-sm font-medium text-zinc-200">
                      {protocol.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 font-mono">
                      _shared/protocols/{protocol.name}.md
                    </span>
                    {isEditingThis ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="flex items-center gap-1 text-xs text-accent-emerald hover:text-emerald-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveProtocol(protocol.name);
                          startEdit({ type: "protocol", name: protocol.name });
                        }}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                  </div>
                </button>
                {(activeProtocol === protocol.name || isEditingThis) && (
                  <div className="border-t border-white/5 animate-fade-in">
                    {isEditingThis ? (
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="w-full min-h-[40vh] p-5 bg-surface-2 text-zinc-200 font-mono text-xs resize-none focus:outline-none"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="px-5 pb-4 prose-dark pt-3">
                        <MarkdownRenderer content={protocol.content} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Templates tab ── */}
      {activeTab === "templates" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {data.templates.map((template) => (
            <div
              key={template.name}
              className="bg-surface-1 rounded-xl border border-white/5 p-4 flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-surface-2">
                <FileText className="w-4 h-4 text-accent-amber" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-200">
                  {template.name}
                </div>
                <div className="text-[11px] text-zinc-600 font-mono">
                  _shared/templates/
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
