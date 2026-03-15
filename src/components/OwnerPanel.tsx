"use client";

import { useEffect, useState } from "react";
import { User, FileText, Pencil, X, Check } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface OwnerFile {
  name: string;
  content: string;
  lastModified: string;
}

const FILE_DESCRIPTIONS: Record<string, string> = {
  RYAN: "Owner identity, decision filter, communication style",
  APPROVALS: "What requires approval vs. autonomous action",
  DIGEST: "Standup format, delivery schedule",
  BUSINESSES: "Registry of all businesses and their status",
};

export default function OwnerPanel() {
  const [files, setFiles] = useState<OwnerFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetch("/api/owner")
      .then((r) => r.json())
      .then((data: OwnerFile[]) => {
        setFiles(data);
        if (data.length > 0) setActiveFile(data[0].name);
      });
  }, []);

  const current = files.find((f) => f.name === activeFile);

  function startEdit() {
    if (!current) return;
    setDraft(current.content);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }

  async function saveEdit() {
    if (!current) return;
    setSaving(true);
    const path = `_owner/${current.name}`;
    await fetch("/api/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content: draft }),
    });
    // Update local state immediately
    setFiles((prev) =>
      prev.map((f) => (f.name === current.name ? { ...f, content: draft } : f))
    );
    setSaving(false);
    setEditing(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <User className="w-4 h-4 text-accent-emerald" />
        <h2 className="text-sm font-semibold text-zinc-200">Owner Layer</h2>
        <span className="text-[10px] text-zinc-600 font-mono bg-surface-2 px-2 py-0.5 rounded-full">
          _owner/
        </span>
        {savedMsg && (
          <span className="text-[10px] text-accent-emerald font-mono ml-auto">
            saved — pull script will sync to disk
          </span>
        )}
      </div>

      {/* File selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() => {
              setActiveFile(file.name);
              setEditing(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 ${
              activeFile === file.name
                ? "bg-surface-3 border-accent-emerald/30 text-zinc-100"
                : "bg-surface-1 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <div className="text-left">
              <div className="text-xs font-medium">{file.name}.md</div>
              <div className="text-[10px] text-zinc-600">
                {FILE_DESCRIPTIONS[file.name] || ""}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {current && (
        <div className="bg-surface-1 rounded-xl border border-white/5 overflow-hidden animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5">
            <span className="text-[11px] text-zinc-600 font-mono">
              _owner/{current.name}.md
            </span>
            <div className="flex items-center gap-2">
              {editing ? (
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
                  onClick={startEdit}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[60vh] p-5 bg-surface-2 text-zinc-200 font-mono text-xs resize-none focus:outline-none"
              spellCheck={false}
            />
          ) : (
            <div className="p-6 prose-dark">
              <MarkdownRenderer content={current.content} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
