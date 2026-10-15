"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  Award,
  ChevronDown,
  Clock,
  Download,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsUp,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import { Background, Button, Card, Logo, Pill, cn } from "@/components/ui";
import { useInterview } from "@/store/interview";
import { evaluateQA, fetchReport, isEvaluating } from "@/lib/api";
import { computeScore, formatDuration, grade } from "@/lib/scoring";
import { PENALTY_PER_VIOLATION, type QA, type Report } from "@/lib/types";

export default function ResultPage() {
  const router = useRouter();
  const { config, qas, violations, startedAt, endedAt, terminated, report, status, setReport, reset } = useInterview();
  const [hydrated, setHydrated] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const reportRequested = useRef(false);

  useEffect(() => {
    const unsub = useInterview.persist.onFinishHydration(() => setHydrated(true));
    if (useInterview.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && (!config || status !== "finished")) router.replace(config ? "/interview" : "/setup");
  }, [hydrated, config, status, router]);

  // Re-run any evaluation lost to a refresh.
  useEffect(() => {
    if (!hydrated) return;
    useInterview
      .getState()
      .qas.filter((q) => q.status === "pending" && !isEvaluating(q.id))
      .forEach((q) => void evaluateQA(q));
  }, [hydrated]);

  const pending = qas.filter((q) => q.status === "pending").length;
  const failed = qas.filter((q) => q.status === "error");
  const score = useMemo(() => computeScore(qas, violations.length), [qas, violations.length]);
  const durationMs = (endedAt ?? Date.now()) - (startedAt ?? Date.now());

  const requestReport = async () => {
    if (!config) return;
    reportRequested.current = true;
    setReportError(null);
    try {
      const r = await fetchReport({
        config,
        qas: qas.map((q) => ({ question: q.question, answer: q.answer, score: q.score ?? 0, skipped: q.skipped })),
        finalScore: score.final,
        violations: violations.length,
      });
      setReport(r);
    } catch (e) {
      setReportError((e as Error).message);
      setReport(localReport(qas, score.final));
    }
  };

  // Generate the overall summary once every answer is evaluated.
  useEffect(() => {
    if (hydrated && config && status === "finished" && pending === 0 && !report && !reportRequested.current) void requestReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, pending, report, status]);

  if (!hydrated || !config || status !== "finished") return <div className="min-h-screen bg-[#06060b]" />;

  const ready = pending === 0 && !!report;
  const answered = qas.filter((q) => !q.skipped).length;

  return (
    <main className="relative min-h-screen">
      <Background />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!ready}
            onClick={async () => (await import("@/lib/pdf")).downloadReportPdf({ config, qas, violations, report, score, durationMs, terminated })}
          >
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              reset();
              router.push("/setup");
            }}
          >
            <RotateCcw className="h-4 w-4" /> New interview
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 pb-20">
        {terminated && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-rose-100">
              <TriangleAlert className="h-5 w-5 shrink-0 text-rose-300" />
              This interview was terminated automatically after {violations.length} proctoring violations.
            </div>
          </motion.div>
        )}

        {/* hero score */}
        <Card className="relative overflow-hidden p-6 sm:p-10">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-[100px]" style={{ background: `${score.grade.color}33` }} />
          <div className="relative grid items-center gap-10 md:grid-cols-[auto_1fr]">
            <ScoreRing value={ready ? score.final : null} color={score.grade.color} />
            <div>
              <Pill className="text-sm" >
                <Sparkles className="h-3.5 w-3.5 text-violet-300" /> {config.role} · {config.experience}
              </Pill>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {ready ? (
                  <>
                    <span style={{ color: score.grade.color }}>{score.grade.label}</span> performance
                  </>
                ) : (
                  "Analysing your interview…"
                )}
              </h1>
              <div className="mt-3 max-w-2xl text-zinc-400">
                {ready ? (
                  report.summary
                ) : (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {pending > 0 ? `Evaluating ${pending} answer${pending > 1 ? "s" : ""}…` : "Writing your personalised summary…"}
                  </span>
                )}
              </div>
              {ready && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                  <Target className="h-4 w-4 text-violet-300" /> {report.verdict}
                </div>
              )}
            </div>
          </div>

          {/* breakdown */}
          <div className="relative mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={TrendingUp} label="Answer score" value={`${score.base}/100`} />
            <Stat
              icon={violations.length ? TriangleAlert : ShieldCheck}
              label="Proctoring penalty"
              value={violations.length ? `−${score.penalty}` : "None"}
              sub={`${violations.length} violation${violations.length === 1 ? "" : "s"} × ${PENALTY_PER_VIOLATION}`}
              tone={violations.length ? "bad" : "good"}
            />
            <Stat icon={ListChecks} label="Answered" value={`${answered}/${qas.length}`} sub={qas.length - answered ? `${qas.length - answered} skipped` : "none skipped"} />
            <Stat icon={Clock} label="Duration" value={formatDuration(durationMs)} />
          </div>
        </Card>

        {failed.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-amber-100">
            <span>
              {failed.length} answer{failed.length > 1 ? "s" : ""} couldn&apos;t be evaluated (AI busy). They count as 0 until evaluated.
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                reportRequested.current = false;
                setReport(null);
                failed.forEach((q) => void evaluateQA(q));
              }}
            >
              <RotateCcw className="h-4 w-4" /> Retry evaluation
            </Button>
          </div>
        )}
        {reportError && <p className="text-sm text-zinc-500">Summary generated offline: {reportError}</p>}

        {ready && (
          <div className="grid gap-6 md:grid-cols-2">
            <ListCard icon={ThumbsUp} title="Strengths" items={report.strengths} tone="good" />
            <ListCard icon={Lightbulb} title="Areas to improve" items={report.improvements} tone="warn" />
          </div>
        )}

        {/* per question */}
        <Card className="p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Award className="h-5 w-5 text-violet-300" /> Question breakdown
            </h2>
            <span className="text-sm text-zinc-500">Tap a question for feedback</span>
          </div>
          {qas.length === 0 && <p className="text-zinc-500">No questions were answered in this session.</p>}
          <div className="space-y-3">
            {qas.map((q, i) => (
              <QuestionRow key={q.id} qa={q} index={i} open={open === q.id} onToggle={() => setOpen(open === q.id ? null : q.id)} />
            ))}
          </div>
        </Card>

        {violations.length > 0 && (
          <Card className="p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <TriangleAlert className="h-5 w-5 text-rose-300" /> Proctoring log
            </h2>
            <ul className="divide-y divide-white/5">
              {violations.map((v, i) => (
                <li key={i} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-zinc-300 capitalize">
                    #{i + 1} · {v.type.replace("-", " ")}
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="text-zinc-500">{new Date(v.at).toLocaleTimeString()}</span>
                    <span className="font-medium text-rose-300">−{PENALTY_PER_VIOLATION}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}

function ScoreRing({ value, color }: { value: number | null; color: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === null) return;
    const c = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => c.stop();
  }, [value]);
  const r = 84;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
        <motion.circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: value === null ? C * 0.75 : C - (C * value) / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 12px ${color}88)` }}
          className={value === null ? "origin-center animate-spin [animation-duration:1.6s]" : ""}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {value === null ? (
          <span className="text-sm text-zinc-500">Scoring…</span>
        ) : (
          <div>
            <div className="text-6xl font-semibold tracking-tight text-white tabular-nums">{display}</div>
            <div className="text-sm text-zinc-500">out of 100</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Icon className={cn("h-3.5 w-3.5", tone === "bad" ? "text-rose-300" : tone === "good" ? "text-emerald-300" : "text-zinc-400")} /> {label}
      </div>
      <div className={cn("mt-1.5 text-2xl font-semibold tabular-nums", tone === "bad" ? "text-rose-200" : "text-white")}>{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function ListCard({ icon: Icon, title, items, tone }: { icon: typeof Clock; title: string; items: string[]; tone: "good" | "warn" }) {
  return (
    <Card className="p-6 sm:p-7">
      <h3 className="flex items-center gap-2 font-semibold text-white">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tone === "good" ? "bg-emerald-500/15" : "bg-amber-500/15")}>
          <Icon className={cn("h-4 w-4", tone === "good" ? "text-emerald-300" : "text-amber-300")} />
        </span>
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-zinc-300">
            <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", tone === "good" ? "bg-emerald-400" : "bg-amber-400")} />
            {s}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuestionRow({ qa, index, open, onToggle }: { qa: QA; index: number; open: boolean; onToggle: () => void }) {
  const s = qa.skipped ? 0 : qa.score;
  const g = s !== undefined ? grade(s * 10) : null;
  return (
    <div className={cn("overflow-hidden rounded-xl border transition", open ? "border-white/15 bg-white/[0.04]" : "border-white/8 bg-white/[0.02] hover:border-white/12")}>
      <button onClick={onToggle} className="flex w-full cursor-pointer items-center gap-4 p-4 text-left">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-semibold tabular-nums"
          style={g ? { background: `${g.color}1f`, color: g.color } : undefined}
        >
          {qa.status === "pending" ? <LoaderCircle className="h-4 w-4 animate-spin text-zinc-500" /> : s !== undefined ? s : "–"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2 text-xs text-zinc-500">
            Q{index + 1} · {qa.category}
            {qa.skipped && <span className="rounded bg-zinc-700/50 px-1.5 text-zinc-400">skipped</span>}
          </div>
          <p className={cn("text-[15px] text-zinc-100", !open && "truncate")}>{qa.question}</p>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="space-y-4 border-t border-white/5 px-4 pt-4 pb-5 sm:pl-20">
              <Section label="Your answer">{qa.skipped ? <em className="text-zinc-500">Skipped</em> : qa.answer || <em className="text-zinc-500">No answer</em>}</Section>
              {qa.feedback && <Section label="Feedback">{qa.feedback}</Section>}
              {(!!qa.strengths?.length || !!qa.improvements?.length) && (
                <div className="flex flex-wrap gap-2">
                  {qa.strengths?.map((x, i) => (
                    <span key={`s${i}`} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                      ✓ {x}
                    </span>
                  ))}
                  {qa.improvements?.map((x, i) => (
                    <span key={`i${i}`} className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                      ↑ {x}
                    </span>
                  ))}
                </div>
              )}
              {qa.idealAnswer && (
                <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-violet-300 uppercase">
                    <Lightbulb className="h-3.5 w-3.5" /> Model answer
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">{qa.idealAnswer}</p>
                </div>
              )}
              {qa.status === "error" && <p className="text-sm text-amber-300">This answer hasn&apos;t been evaluated yet.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">{label}</div>
      <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

/** Fallback summary if the AI report call fails. */
function localReport(qas: QA[], final: number): Report {
  const good = qas.filter((q) => (q.score ?? 0) >= 7).map((q) => q.category);
  const weak = qas.filter((q) => q.skipped || (q.score ?? 0) < 5).map((q) => q.category);
  const uniq = (a: string[]) => [...new Set(a)];
  return {
    summary: `You scored ${final}/100 across ${qas.length} question${qas.length === 1 ? "" : "s"}. Review the feedback and model answers below to see where you can improve.`,
    strengths: uniq(good).map((c) => `Solid ${c.toLowerCase()} answers`).slice(0, 3).concat(good.length ? [] : ["You completed a full mock interview. Keep practising!"]),
    improvements: uniq(weak).map((c) => `Strengthen your ${c.toLowerCase()} answers`).slice(0, 3).concat(weak.length ? [] : ["Add more concrete examples and metrics"]),
    verdict: final >= 70 ? "Close to interview-ready" : "Needs more preparation",
  };
}
