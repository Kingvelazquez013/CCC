"use client";

import { useEffect, useState } from "react";
import { User, FileText } from "lucide-react";
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

  useEffect(() => {
    fetch("/api/owner")
      .then((r) => r.json())
      .then((data: OwnerFile[]) => {
        setFiles(data);
        if (data.length > 0) setActiveFile(data[0].name);
      });
  }, []);

  const current = files.find((f) => f.name === activeFile);

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <User className="w-4 h-4 text-accent-emerald" />
        <h2 className="text-sm font-semibold text-zinc-200">Owner Layer</h2>
        <span className="text-[10px] text-zinc-600 font-mono bg-surface-2 px-2 py-0.5 rounded-full">
          _owner/ (read-only)
        </span>
      </div>

      {/* File selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() => setActiveFile(file.name)}
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
        <div className="bg-surface-1 rounded-xl border border-white/5 p-6 prose-dark animate-fade-in">
          <MarkdownRenderer content={current.content} />
        </div>
      )}
    </div>
  );
}
