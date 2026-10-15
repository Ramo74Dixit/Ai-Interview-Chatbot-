import { NextResponse } from "next/server";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { evaluatePrompt, evaluateSchema } from "@/lib/prompts";
import type { Evaluation } from "@/lib/types";
import { parseConfig } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config = parseConfig(body.config);
    if (!config || typeof body.question !== "string" || typeof body.answer !== "string") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const data = await generateJSON<Evaluation>(evaluatePrompt(config, body.question, body.answer), evaluateSchema, {
      temperature: 0.2,
    });
    data.score = Math.max(0, Math.min(10, Math.round(Number(data.score) || 0)));
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
