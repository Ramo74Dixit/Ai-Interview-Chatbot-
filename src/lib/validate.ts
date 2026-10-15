import type { InterviewConfig } from "./types";

/** Minimal shape check for configs coming from the browser. */
export function parseConfig(raw: unknown): InterviewConfig | null {
  const c = raw as Partial<InterviewConfig> | null;
  if (!c || typeof c.role !== "string" || !c.role.trim() || typeof c.experience !== "string") return null;
  return {
    role: c.role.trim(),
    experience: c.experience,
    skills: Array.isArray(c.skills) ? c.skills.filter((s): s is string => typeof s === "string") : [],
    mode: c.mode?.type === "time" ? { type: "time", minutes: Number(c.mode.minutes) || 10 } : { type: "questions", count: Number(c.mode?.count) || 5 },
    lang: typeof c.lang === "string" ? c.lang : "en-US",
  };
}
