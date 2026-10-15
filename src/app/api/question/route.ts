import { NextResponse } from "next/server";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { questionPrompt, questionSchema } from "@/lib/prompts";
import { parseConfig } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config = parseConfig(body.config);
    if (!config) return NextResponse.json({ error: "Invalid interview config." }, { status: 400 });
    const history = Array.isArray(body.history) ? body.history : [];
    const index = Number(body.index) || 0;
    const total = config.mode.type === "questions" ? config.mode.count : null;
    const data = await generateJSON<{ question: string; category: string }>(
      questionPrompt(config, history, index, total),
      questionSchema,
      { temperature: 0.9 },
    );
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
