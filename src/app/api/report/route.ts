import { NextResponse } from "next/server";
import { errorResponse, generateJSON } from "@/lib/gemini";
import { reportPrompt, reportSchema } from "@/lib/prompts";
import type { Report } from "@/lib/types";
import { parseConfig } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config = parseConfig(body.config);
    if (!config || !Array.isArray(body.qas)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const data = await generateJSON<Report>(
      reportPrompt(config, body.qas, Number(body.finalScore) || 0, Number(body.violations) || 0),
      reportSchema,
      { temperature: 0.4 },
    );
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
