"use client";
import { useInterview } from "@/store/interview";
import type { Evaluation, InterviewConfig, QA, Report } from "./types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const fetchQuestion = (config: InterviewConfig, history: { question: string; answer: string }[], index: number) =>
  post<{ question: string; category: string }>("/api/question", { config, history, index });

export const fetchReport = (body: unknown) => post<Report>("/api/report", body);

const inFlight = new Set<string>();

/** Evaluates a QA in the background and writes the result to the store. De-duplicated per QA id. */
export async function evaluateQA(qa: QA) {
  const { config, updateQA } = useInterview.getState();
  if (!config || inFlight.has(qa.id)) return;
  if (qa.skipped || qa.answer.trim().split(/\s+/).filter(Boolean).length < 3) {
    updateQA(qa.id, {
      status: "done",
      score: 0,
      feedback: qa.skipped ? "You skipped this question." : "No meaningful answer was captured for this question.",
      idealAnswer: "",
      strengths: [],
      improvements: ["Attempt every question - even a partial, structured answer earns marks."],
    });
    return;
  }
  inFlight.add(qa.id);
  updateQA(qa.id, { status: "pending" });
  try {
    const ev = await post<Evaluation>("/api/evaluate", { config, question: qa.question, answer: qa.answer });
    updateQA(qa.id, { ...ev, status: "done" });
  } catch {
    updateQA(qa.id, { status: "error" });
  } finally {
    inFlight.delete(qa.id);
  }
}

export const isEvaluating = (id: string) => inFlight.has(id);

/** Used if Gemini cannot generate a question, so the interview never gets stuck. */
const FALLBACK = [
  { question: "Tell me about yourself and what draws you to this role.", category: "Behavioral" },
  { question: "Walk me through a project you are proud of. What was your exact contribution?", category: "Role-specific" },
  { question: "Describe a difficult problem you solved recently. How did you approach it?", category: "Problem Solving" },
  { question: "Tell me about a time you disagreed with a teammate. How did you resolve it?", category: "Behavioral" },
  { question: "If you were given an unclear requirement with a tight deadline, what would you do?", category: "Situational" },
  { question: "What is one technical concept in your field that you recently learned, and how would you explain it to a beginner?", category: "Technical" },
  { question: "How do you make sure the quality of your work is high before delivering it?", category: "Role-specific" },
  { question: "Where do you see yourself growing in the next two years?", category: "Behavioral" },
];
export function fallbackQuestion(asked: string[]) {
  return FALLBACK.find((f) => !asked.includes(f.question)) ?? FALLBACK[asked.length % FALLBACK.length];
}
