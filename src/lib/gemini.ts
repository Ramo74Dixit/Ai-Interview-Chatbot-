import "server-only";
import { GoogleGenAI, ThinkingLevel, type Schema } from "@google/genai";
import { NextResponse } from "next/server";

/** Tried in order; the next model is used if one is overloaded, slow or unavailable. Override with GEMINI_MODELS (comma-separated). */
const MODELS = (process.env.GEMINI_MODELS || "gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.8-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const TIMEOUT_MS = 20_000;

let client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("your_")) {
    throw new AIError("Server is missing GEMINI_API_KEY. Add it to .env.local and restart.", 500);
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export class AIError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls Gemini with a JSON schema and returns the parsed object, falling back across models on errors or timeouts. */
export async function generateJSON<T>(
  prompt: string,
  schema: Schema,
  { temperature = 0.7, thinkingLevel = ThinkingLevel.LOW }: { temperature?: number; thinkingLevel?: ThinkingLevel } = {},
): Promise<T> {
  const ai = getClient();
  let lastErr: unknown;
  for (let pass = 0; pass < 2; pass++) {
    for (const model of MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature,
            thinkingConfig: { thinkingLevel },
            abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          },
        });
        return JSON.parse(res.text ?? "") as T;
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number }).status;
        console.warn(`[gemini] ${model} failed (${status ?? (err as Error).name}): ${String((err as Error).message).slice(0, 160)}`);
        if (status === 401 || status === 403) throw new AIError("The Gemini API key is invalid or not permitted.", 500);
      }
    }
    await sleep(1500);
  }
  const status = (lastErr as { status?: number }).status;
  if (status === 429) {
    throw new AIError("The AI is receiving too many requests right now. Please wait a few seconds and try again.", 429);
  }
  throw new AIError("The AI service is temporarily unavailable. Please try again.", 502);
}

export function errorResponse(err: unknown) {
  if (err instanceof AIError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(err);
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
