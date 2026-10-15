import { Type, type Schema } from "@google/genai";
import type { InterviewConfig } from "./types";

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

export function candidateProfile(c: InterviewConfig) {
  const skills = c.skills?.length ? c.skills.slice(0, 15).map((s) => clip(s, 40)).join(", ") : "not specified";
  return `Target role: ${clip(c.role, 80)}\nExperience: ${clip(c.experience, 40)}\nKey skills / tech stack: ${skills}`;
}

export function questionPrompt(
  config: InterviewConfig,
  history: { question: string; answer: string }[],
  index: number,
  total: number | null,
) {
  const past = history
    .slice(-12)
    .map((h, i) => `Q${i + 1}: ${clip(h.question, 400)}\nA${i + 1}: ${clip(h.answer, 1200) || "(skipped)"}`)
    .join("\n\n");
  const position = total ? `question ${index + 1} of ${total}` : `question ${index + 1} (time-boxed interview)`;
  return `You are an experienced, friendly but rigorous interviewer conducting a spoken job interview.

CANDIDATE
${candidateProfile(config)}

PREVIOUS QUESTIONS AND ANSWERS
${past || "(none yet - this is the first question)"}

TASK
Write ${position}.
- Calibrate difficulty to the candidate's experience level (freshers: fundamentals; seniors: architecture, trade-offs, leadership).
- Mix categories across the interview: Technical, Behavioral, Situational, Problem Solving, Role-specific.
- Never repeat or closely paraphrase a previous question. Occasionally ask a brief follow-up that builds on a previous answer.
- The question will be read aloud by text-to-speech: plain conversational English, no markdown, no code blocks, no bullet lists, max 45 words, one question only.
- Start with a short natural transition only when it helps (e.g. "Thanks. Next, ..."), but not for the first question.
Return JSON.`;
}

export const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING },
    category: { type: Type.STRING, enum: ["Technical", "Behavioral", "Situational", "Problem Solving", "Role-specific"] },
  },
  required: ["question", "category"],
};

export function evaluatePrompt(config: InterviewConfig, question: string, answer: string) {
  return `You are an expert interviewer evaluating one answer from a spoken mock interview.

CANDIDATE
${candidateProfile(config)}

QUESTION
${clip(question, 600)}

CANDIDATE'S ANSWER (speech-to-text transcript; ignore minor transcription and grammar errors)
${clip(answer, 4000)}

Score the answer from 0 to 10 considering relevance, technical correctness, depth, structure and communication,
relative to what is expected at this experience level. Be fair but honest: vague or very short answers score low (0-3),
solid answers 6-7, excellent answers 8-10.
Return JSON with:
- score: integer 0-10
- feedback: 2-3 sentences addressed to the candidate ("you")
- idealAnswer: a concise model answer (60-120 words) in plain text
- strengths: 0-3 short bullet phrases
- improvements: 1-3 short bullet phrases`;
}

export const evaluateSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    feedback: { type: Type.STRING },
    idealAnswer: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["score", "feedback", "idealAnswer", "strengths", "improvements"],
};

export function reportPrompt(
  config: InterviewConfig,
  qas: { question: string; answer: string; score: number; skipped: boolean }[],
  finalScore: number,
  violations: number,
) {
  const lines = qas
    .map(
      (q, i) =>
        `Q${i + 1} [score ${q.score}/10]: ${clip(q.question, 300)}\nAnswer: ${q.skipped ? "(skipped)" : clip(q.answer, 800)}`,
    )
    .join("\n\n");
  return `You are a senior hiring manager writing the summary of a mock interview.

CANDIDATE
${candidateProfile(config)}

FINAL SCORE: ${finalScore}/100 (after ${violations} proctoring violation(s), each costing 15 marks)

TRANSCRIPT
${lines || "(no questions answered)"}

Return JSON with:
- summary: 3-4 sentences on overall performance, addressed to the candidate ("you")
- strengths: 2-4 short points
- improvements: 2-4 short, actionable points (what to study or practise)
- verdict: one short line on interview readiness for this role (e.g. "Ready for interviews", "Almost there - polish system design", "Needs more preparation")`;
}

export const reportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
    verdict: { type: Type.STRING },
  },
  required: ["summary", "strengths", "improvements", "verdict"],
};
