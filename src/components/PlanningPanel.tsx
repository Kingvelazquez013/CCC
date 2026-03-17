"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, ArrowRight, Loader2 } from "lucide-react";

interface PlanningMessage {
  id: number;
  task_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface PlanningPanelProps {
  taskId: string;
  taskTitle: string;
  onFinalize: () => void;
  onSkip: () => void;
}

export default function PlanningPanel({
  taskId,
  taskTitle,
  onFinalize,
  onSkip,
}: PlanningPanelProps) {
  const [messages, setMessages] = useState<PlanningMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing messages on mount
  useEffect(() => {
    fetch(`/api/tasks/${taskId}/plan`)
      .then((r) => r.json())
      .then((data: PlanningMessage[]) => {
        if (data.length > 0) {
          setMessages(data);
          setStarted(true);
        }
      })
      .catch(() => {});
  }, [taskId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function startPlanning() {
    setLoading(true);
    setStarted(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_questions" }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            task_id: taskId,
            role: "assistant",
            content: data.message,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!input.trim() || loading) return;

    const userMsg: PlanningMessage = {
      id: Date.now(),
      task_id: taskId,
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_answer", message: input.trim() }),
      });
      const data = await res.json();

      if (data.isFinal) {
        setSummary(data.summary || "Planning complete.");
      } else if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            task_id: taskId,
            role: "assistant",
            content: data.message,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  async function finalizePlanning() {
    setLoading(true);
    try {
      await fetch(`/api/tasks/${taskId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      });
      onFinalize();
    } catch {
      // handle error
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-200">
          Planning: {taskTitle}
        </span>
      </div>

      {!started ? (
        /* Start state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-zinc-500 text-center max-w-xs">
            AI will ask clarifying questions to refine this task before work begins.
          </p>
          <div className="flex gap-2">
            <button
              onClick={startPlanning}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              Start Planning
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-surface-3 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-surface-3 text-zinc-200"
                      : "bg-surface-2 text-zinc-300 border border-white/5"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-2 rounded-lg px-3 py-2 border border-white/5">
                  <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Summary / finalize */}
          {summary ? (
            <div className="border-t border-white/5 pt-3">
              <div className="bg-surface-2 rounded-lg p-3 mb-3 border border-white/5">
                <div className="text-[10px] text-zinc-500 mb-1.5">Summary</div>
                <div className="text-xs text-zinc-300 whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
              <button
                onClick={finalizePlanning}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Finalize & Assign
              </button>
            </div>
          ) : (
            /* Input */
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                placeholder="Type your answer..."
                disabled={loading}
                className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
              />
              <button
                onClick={submitAnswer}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg bg-surface-3 hover:bg-surface-4 transition-colors disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5 text-zinc-300" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
