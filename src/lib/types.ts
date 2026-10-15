export type InterviewMode =
  | { type: "questions"; count: number }
  | { type: "time"; minutes: number };

export interface InterviewConfig {
  role: string;
  experience: string; // e.g. "Fresher (0 years)", "3-5 years"
  skills: string[];
  mode: InterviewMode;
  lang: string; // BCP-47 code used for speech, e.g. "en-IN"
}

export type EvalStatus = "pending" | "done" | "error";

export interface QA {
  id: string;
  question: string;
  category: string;
  answer: string;
  skipped: boolean;
  status: EvalStatus;
  score?: number; // 0-10
  feedback?: string;
  idealAnswer?: string;
  strengths?: string[];
  improvements?: string[];
}

export type ViolationType = "tab-switch" | "window-blur" | "fullscreen-exit";

export interface Violation {
  type: ViolationType;
  at: number;
}

export interface Report {
  summary: string;
  strengths: string[];
  improvements: string[];
  verdict: string;
}

export interface Evaluation {
  score: number;
  feedback: string;
  idealAnswer: string;
  strengths: string[];
  improvements: string[];
}

export const PENALTY_PER_VIOLATION = 15;
export const MAX_VIOLATIONS = 3;
