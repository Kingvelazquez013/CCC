"use client";

import { useEffect, useState } from "react";
import { Shield, FileText, ScrollText } from "lucide-react";
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

export default function GovernanceView() {
  const [data, setData] = useState<GovernanceData | null>(null);
  const [activeTab, setActiveTab] = useState<"governance" | "protocols" | "templates">("governance");
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/governance")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-700 text-sm">
        Loading governance...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-4 h-4 text-accent-emerald" />
        <h2 className="text-sm font-semibold text-zinc-200">
          Governance & Protocols
        </h2>
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
            onClick={() => setActiveTab(id)}
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

      {/* Content */}
      {activeTab === "governance" && (
        <div className="bg-surface-1 rounded-xl border border-white/5 p-6 prose-dark animate-fade-in">
          <MarkdownRenderer content={data.governance} />
        </div>
      )}

      {activeTab === "protocols" && (
        <div className="space-y-3 animate-fade-in">
          {data.protocols.map((protocol) => (
            <div
              key={protocol.name}
              className="bg-surface-1 rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() =>
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
                <span className="text-xs text-zinc-600 font-mono">
                  _shared/protocols/{protocol.name}.md
                </span>
              </button>
              {activeProtocol === protocol.name && (
                <div className="px-5 pb-4 prose-dark border-t border-white/5 pt-3 animate-fade-in">
                  <MarkdownRenderer content={protocol.content} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
