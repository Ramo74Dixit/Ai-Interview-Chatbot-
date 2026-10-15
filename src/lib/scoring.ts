import { PENALTY_PER_VIOLATION, type QA } from "./types";

export function computeScore(qas: QA[], violationCount: number) {
  const scored = qas.map((q) => (q.skipped ? 0 : (q.score ?? 0)));
  const base = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) : 0;
  const penalty = violationCount * PENALTY_PER_VIOLATION;
  const final = Math.max(0, base - penalty);
  return { base, penalty, final, grade: grade(final) };
}

export function grade(score: number) {
  if (score >= 85) return { label: "Excellent", color: "#34d399" };
  if (score >= 70) return { label: "Good", color: "#60a5fa" };
  if (score >= 50) return { label: "Average", color: "#fbbf24" };
  return { label: "Needs Improvement", color: "#f87171" };
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
