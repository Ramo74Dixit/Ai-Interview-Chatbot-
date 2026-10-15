"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { InterviewConfig, QA, Report, Violation } from "@/lib/types";

export type SessionStatus = "idle" | "ready" | "in-progress" | "finished";

interface InterviewState {
  config: InterviewConfig | null;
  status: SessionStatus;
  qas: QA[];
  violations: Violation[];
  startedAt: number | null;
  endedAt: number | null;
  terminated: boolean;
  report: Report | null;

  setConfig: (config: InterviewConfig) => void;
  start: () => void;
  addQA: (qa: QA) => void;
  updateQA: (id: string, patch: Partial<QA>) => void;
  addViolation: (v: Violation) => void;
  finish: (terminated?: boolean) => void;
  setReport: (r: Report | null) => void;
  reset: () => void;
}

const empty = {
  status: "idle" as SessionStatus,
  qas: [],
  violations: [],
  startedAt: null,
  endedAt: null,
  terminated: false,
  report: null,
};

export const useInterview = create<InterviewState>()(
  persist(
    (set) => ({
      config: null,
      ...empty,
      setConfig: (config) => set({ ...empty, config, status: "ready" }),
      start: () => set((s) => (s.status === "in-progress" ? s : { status: "in-progress", startedAt: Date.now() })),
      addQA: (qa) => set((s) => ({ qas: [...s.qas, qa] })),
      updateQA: (id, patch) => set((s) => ({ qas: s.qas.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
      addViolation: (v) => set((s) => ({ violations: [...s.violations, v] })),
      finish: (terminated = false) =>
        set((s) => (s.status === "finished" ? s : { status: "finished", endedAt: Date.now(), terminated })),
      setReport: (report) => set({ report }),
      reset: () => set({ config: null, ...empty }),
    }),
    { name: "ai-interview-session", storage: createJSONStorage(() => sessionStorage) },
  ),
);
