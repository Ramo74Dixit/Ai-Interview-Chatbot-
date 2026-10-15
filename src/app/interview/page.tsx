"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  ListChecks,
  LogOut,
  Maximize,
  Mic,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  TriangleAlert,
  Volume2,
} from "lucide-react";
import { Button, Card, Logo, Pill, cn } from "@/components/ui";
import { Bars, Orb, type OrbState } from "@/components/Orb";
import { useInterview } from "@/store/interview";
import { evaluateQA, fallbackQuestion, fetchQuestion } from "@/lib/api";
import { MAX_VIOLATIONS, PENALTY_PER_VIOLATION, type QA, type ViolationType } from "@/lib/types";
import { useSpeechRecognition, isSpeechRecognitionSupported } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { enterFullscreen, exitFullscreen, isFullscreen, useProctoring } from "@/hooks/useProctoring";
import { useMediaStream } from "@/hooks/useMediaStream";

type Phase = "gate" | "greeting" | "loading" | "speaking" | "listening" | "ending";

const VIOLATION_LABEL: Record<ViolationType, string> = {
  "tab-switch": "Tab switch detected",
  "window-blur": "You left the interview window",
  "fullscreen-exit": "You exited full screen",
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function InterviewPage() {
  const router = useRouter();
  const config = useInterview((s) => s.config);
  const status = useInterview((s) => s.status);
  const qas = useInterview((s) => s.qas);
  const violations = useInterview((s) => s.violations);
  const startedAt = useInterview((s) => s.startedAt);

  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("gate");
  const [current, setCurrent] = useState<{ question: string; category: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [typed, setTyped] = useState("");
  const [srSupported, setSrSupported] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const lang = config?.lang ?? "en-US";
  const sr = useSpeechRecognition(lang);
  const tts = useSpeechSynthesis(lang);
  const media = useMediaStream({ video: true, audio: true, enabled: hydrated && !!config });
  const videoRef = useRef<HTMLVideoElement>(null);

  const aliveRef = useRef(true);
  const endingRef = useRef(false);
  const startedRef = useRef(false);
  const currentRef = useRef(current);
  currentRef.current = current;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Wait for sessionStorage hydration before deciding anything.
  useEffect(() => {
    setSrSupported(isSpeechRecognitionSupported());
    const unsub = useInterview.persist.onFinishHydration(() => setHydrated(true));
    if (useInterview.persist.hasHydrated()) setHydrated(true);
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!config) router.replace("/setup");
    else if (status === "finished") router.replace("/result");
  }, [hydrated, config, status, router]);

  useEffect(() => {
    if (videoRef.current && media.stream) videoRef.current.srcObject = media.stream;
  }, [media.stream]);

  const alive = () => aliveRef.current && !endingRef.current;
  const isTimeMode = config?.mode.type === "time";
  const totalQuestions = config?.mode.type === "questions" ? config.mode.count : null;
  const timeLimitMs = config?.mode.type === "time" ? config.mode.minutes * 60_000 : null;
  const remainingMs = timeLimitMs && startedAt ? Math.max(0, timeLimitMs - (now - startedAt)) : timeLimitMs;

  // ---------- flow ----------
  const finishInterview = useCallback(
    (terminated = false) => {
      if (endingRef.current) return;
      endingRef.current = true;
      tts.cancel();
      const spoken = sr.stop();
      const cur = currentRef.current;
      const answer = (srSupported ? spoken : typed).trim();
      if (cur && answer) {
        const qa: QA = { id: uid(), question: cur.question, category: cur.category, answer, skipped: false, status: "pending" };
        useInterview.getState().addQA(qa);
        void evaluateQA(qa);
      }
      useInterview.getState().finish(terminated);
      setPhase("ending");
      void exitFullscreen();
      router.replace("/result");
    },
    [router, sr, tts, srSupported, typed],
  );

  const askNext = useCallback(async () => {
    const { config: cfg, qas: asked } = useInterview.getState();
    if (!cfg || !alive()) return;
    setPhase("loading");
    setNotice(null);
    let q: { question: string; category: string };
    try {
      q = await fetchQuestion(
        cfg,
        asked.map((a) => ({ question: a.question, answer: a.skipped ? "" : a.answer })),
        asked.length,
      );
    } catch (e) {
      q = fallbackQuestion(asked.map((a) => a.question));
      setNotice(`${(e as Error).message} Using a backup question.`);
    }
    if (!alive()) return;
    setCurrent(q);
    setTyped("");
    sr.reset();
    setPhase("speaking");
    await tts.speak(q.question);
    if (!alive() || phaseRef.current !== "speaking") return;
    setPhase("listening");
    if (isSpeechRecognitionSupported()) sr.start();
  }, [sr, tts]);

  const beginListening = () => {
    tts.cancel();
    setPhase("listening");
    if (srSupported) sr.start();
  };

  const submit = (skipped = false) => {
    const cur = currentRef.current;
    if (!cur) return;
    const spoken = sr.stop();
    const answer = skipped ? "" : (srSupported ? spoken : typed).trim();
    const qa: QA = { id: uid(), question: cur.question, category: cur.category, answer, skipped, status: "pending" };
    useInterview.getState().addQA(qa);
    void evaluateQA(qa);
    setCurrent(null);
    const count = useInterview.getState().qas.length;
    if ((totalQuestions && count >= totalQuestions) || (timeLimitMs && remainingMs !== null && remainingMs <= 0)) {
      finishInterview(false);
    } else {
      void askNext();
    }
  };

  const repeatQuestion = async () => {
    const cur = currentRef.current;
    if (!cur) return;
    sr.stop();
    setPhase("speaking");
    await tts.speak(cur.question);
    if (!alive() || phaseRef.current !== "speaking") return;
    setPhase("listening");
    if (srSupported) sr.start();
  };

  const kickoff = useCallback(async () => {
    if (startedRef.current || !config) return;
    startedRef.current = true;
    const first = useInterview.getState().qas.length === 0;
    useInterview.getState().start();
    if (first) {
      setPhase("greeting");
      await tts.speak(
        `Hello! I'm Aria, and I'll be your interviewer today for the ${config.role} role. Speak clearly, and press submit when you finish each answer. Let's begin.`,
      );
    }
    if (alive()) void askNext();
  }, [config, tts, askNext]);

  // Auto-start when arriving from setup already in full screen.
  useEffect(() => {
    if (hydrated && config && status !== "finished" && phase === "gate" && isFullscreen()) void kickoff();
  }, [hydrated, config, status, phase, kickoff]);

  // ---------- proctoring ----------
  const proctoringActive = hydrated && phase !== "gate" && phase !== "ending";
  const onViolation = useCallback(
    (type: ViolationType) => {
      if (endingRef.current) return;
      const store = useInterview.getState();
      store.addViolation({ type, at: Date.now() });
      const n = store.violations.length + 1;
      const id = uid();
      setToasts((t) => [...t, { id, text: `${VIOLATION_LABEL[type]} · −${PENALTY_PER_VIOLATION} marks (${n}/${MAX_VIOLATIONS})` }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
      if (n >= MAX_VIOLATIONS) finishInterview(true);
    },
    [finishInterview],
  );
  const { fullscreen } = useProctoring(proctoringActive, onViolation);

  // ---------- timer ----------
  useEffect(() => {
    if (!proctoringActive) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [proctoringActive]);

  useEffect(() => {
    if (proctoringActive && timeLimitMs && remainingMs !== null && remainingMs <= 0) finishInterview(false);
  }, [proctoringActive, timeLimitMs, remainingMs, finishInterview]);

  if (!hydrated || !config) return <div className="min-h-screen bg-[#06060b]" />;

  const orbState: OrbState =
    phase === "speaking" || phase === "greeting" ? "speaking" : phase === "listening" ? "listening" : phase === "loading" ? "thinking" : "idle";
  const statusText = {
    gate: "Ready when you are",
    greeting: "Aria is introducing the interview",
    loading: "Aria is preparing the next question…",
    speaking: "Aria is asking…",
    listening: srSupported ? (sr.listening ? "Listening: speak your answer" : "Microphone paused") : "Type your answer",
    ending: "Wrapping up…",
  }[phase];

  const questionNo = Math.min(qas.length + 1, totalQuestions ?? Infinity);
  const answerText = srSupported ? sr.transcript : typed;
  const vCount = violations.length;

  // ---------- gate (refresh / direct visit) ----------
  if (phase === "gate") {
    const resuming = status === "in-progress" && qas.length > 0;
    return (
      <main className="grid min-h-screen place-items-center bg-[#06060b] p-5">
        <Card className="max-w-md p-8 text-center">
          <Orb state="idle" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-semibold text-white">{resuming ? "Resume your interview" : "Ready to begin?"}</h1>
          <p className="mt-2 text-zinc-400">
            The interview runs in full-screen, proctored mode. Leaving full screen or switching tabs costs {PENALTY_PER_VIOLATION} marks.
          </p>
          <Button
            size="lg"
            className="mt-7 w-full"
            onClick={async () => {
              if (await enterFullscreen()) void kickoff();
            }}
          >
            <Maximize className="h-4.5 w-4.5" /> Enter full screen & {resuming ? "resume" : "start"}
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#06060b] select-none">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div
          className={cn(
            "absolute top-1/4 left-1/3 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-[140px] transition-colors duration-1000",
            phase === "listening" ? "bg-cyan-500/15" : "bg-violet-600/20",
          )}
        />
      </div>

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3.5">
        <div className="flex items-center gap-4">
          <Logo className="pointer-events-none" />
          <span className="hidden h-5 w-px bg-white/10 md:block" />
          <span className="hidden truncate text-sm text-zinc-400 md:block">
            {config.role} · {config.experience}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isTimeMode ? (
            <Pill className={cn("font-mono text-sm tabular-nums", remainingMs !== null && remainingMs < 60_000 && "border-amber-400/40 bg-amber-500/15 text-amber-200")}>
              <Clock className="h-3.5 w-3.5" />
              {fmt(remainingMs ?? 0)}
            </Pill>
          ) : (
            <Pill className="text-sm">
              <ListChecks className="h-3.5 w-3.5" /> Question {questionNo} / {totalQuestions}
            </Pill>
          )}
          <Pill
            className={cn(
              "text-sm",
              vCount === 0 ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/15 text-rose-200",
            )}
          >
            {vCount === 0 ? <ShieldCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
            {vCount}/{MAX_VIOLATIONS} <span className="hidden sm:inline">violations</span>
          </Pill>
          <Button variant="danger" size="sm" onClick={() => setConfirmEnd(true)}>
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">End</span>
          </Button>
        </div>
      </header>

      {/* progress bar */}
      <div className="relative z-10 h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400"
          animate={{
            width: `${
              totalQuestions ? (qas.length / totalQuestions) * 100 : timeLimitMs && remainingMs !== null ? (1 - remainingMs / timeLimitMs) * 100 : 0
            }%`,
          }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-6 p-5 lg:grid-cols-[1fr_320px]">
        {/* stage */}
        <section className="flex min-h-0 flex-col items-center">
          <div className="flex flex-col items-center pt-2 lg:pt-6">
            <Orb state={orbState} level={media.level} size={190} />
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              {phase === "listening" && srSupported && <Bars active={sr.listening} level={media.level} />}
              {(phase === "speaking" || phase === "greeting") && <Volume2 className="h-4 w-4 text-violet-300" />}
              <span>{statusText}</span>
            </div>
          </div>

          <div className="mt-6 w-full max-w-3xl space-y-4">
            {/* question */}
            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={current.question}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Card className="p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-wider text-violet-300 uppercase">Aria · Question {qas.length + 1}</span>
                      <Pill className="py-0.5 text-[11px]">{current.category}</Pill>
                    </div>
                    <p className="text-xl leading-relaxed font-medium text-white sm:text-2xl">{current.question}</p>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card className="space-y-3 p-6">
                    <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                    <div className="h-5 w-full animate-pulse rounded bg-white/8" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-white/8" />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {notice && <p className="rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{notice}</p>}

            {/* answer */}
            {current && (
              <Card className={cn("p-5 transition-colors", phase === "listening" && "border-cyan-400/25")}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">Your answer</span>
                  {phase === "listening" && srSupported && (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span className={cn("h-1.5 w-1.5 rounded-full", sr.listening ? "animate-pulse bg-rose-400" : "bg-zinc-600")} />
                      {sr.listening ? "Recording" : "Paused"}
                    </span>
                  )}
                </div>
                {srSupported ? (
                  <div className="scrollbar-thin max-h-44 min-h-20 overflow-y-auto text-[15px] leading-relaxed">
                    {answerText ? (
                      <p className="text-zinc-100">
                        {sr.finalText} <span className="text-zinc-500">{sr.interim}</span>
                      </p>
                    ) : (
                      <p className="text-zinc-600 italic">
                        {phase === "listening" ? "Start speaking, and your words will appear here…" : "Wait for the question to finish, or press “Answer now”."}
                      </p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    disabled={phase !== "listening"}
                    placeholder="Voice input isn't supported in this browser. Type your answer here…"
                    className="scrollbar-thin h-32 w-full resize-none bg-transparent text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600"
                  />
                )}
                {sr.error && <p className="mt-2 text-sm text-rose-300">{sr.error}</p>}
              </Card>
            )}

            {/* controls */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {phase === "speaking" && current && (
                <Button variant="secondary" onClick={beginListening}>
                  <Mic className="h-4 w-4" /> Answer now
                </Button>
              )}
              {phase === "listening" && (
                <>
                  {srSupported && (
                    <Button variant="ghost" onClick={() => sr.reset()} disabled={!answerText}>
                      <RotateCcw className="h-4 w-4" /> Re-record
                    </Button>
                  )}
                  <Button variant="ghost" onClick={repeatQuestion}>
                    <Volume2 className="h-4 w-4" /> Repeat question
                  </Button>
                  <Button variant="secondary" onClick={() => submit(true)}>
                    <SkipForward className="h-4 w-4" /> Skip
                  </Button>
                  {srSupported && !sr.listening && (
                    <Button variant="secondary" onClick={() => sr.start()}>
                      <Mic className="h-4 w-4" /> Resume mic
                    </Button>
                  )}
                  <Button onClick={() => submit(false)} disabled={!answerText.trim()} className="min-w-44">
                    Submit answer
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* sidebar */}
        <aside className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-video bg-black/60">
              {media.stream ? (
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
              ) : (
                <div className="grid h-full place-items-center px-4 text-center text-xs text-zinc-500">{media.error ?? "Starting camera…"}</div>
              )}
              <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> LIVE · not recorded
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Proctoring</div>
            <ul className="mt-3 space-y-2.5 text-sm">
              <Row ok={fullscreen} label="Full screen" />
              <Row ok={vCount === 0} label={`Violations: ${vCount} of ${MAX_VIOLATIONS}`} />
              <Row ok label="Copy / paste blocked" />
            </ul>
            {vCount > 0 && (
              <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                −{vCount * PENALTY_PER_VIOLATION} marks so far. {MAX_VIOLATIONS - vCount} more and the interview ends automatically.
              </p>
            )}
          </Card>

          <Card className="hidden p-5 lg:block">
            <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Tips</div>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>• Structure answers: context → action → result.</li>
              <li>• Think out loud. Interviewers value reasoning.</li>
              <li>• It&apos;s fine to pause briefly before answering.</li>
            </ul>
          </Card>
        </aside>
      </div>

      {/* violation toasts */}
      <div className="pointer-events-none fixed top-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2.5 rounded-xl border border-rose-400/30 bg-rose-950/90 px-4 py-3 text-sm font-medium text-rose-100 shadow-2xl backdrop-blur"
            >
              <TriangleAlert className="h-4.5 w-4.5 text-rose-300" /> {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* full-screen lost overlay */}
      <AnimatePresence>
        {proctoringActive && !fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 grid place-items-center bg-black/85 p-5 backdrop-blur-md"
          >
            <Card className="max-w-md p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15">
                <TriangleAlert className="h-7 w-7 text-rose-300" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">You left full-screen mode</h2>
              <p className="mt-2 text-zinc-400">
                A {PENALTY_PER_VIOLATION}-mark penalty was applied. Return to full screen to continue your interview.
              </p>
              <Button size="lg" className="mt-6 w-full" onClick={() => void enterFullscreen()}>
                <Maximize className="h-4.5 w-4.5" /> Return to full screen
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* end confirmation */}
      <AnimatePresence>
        {confirmEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
              <Card className="max-w-sm p-7 text-center">
                <h2 className="text-lg font-semibold text-white">End the interview now?</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  You&apos;ll get a report for the {qas.length} question{qas.length === 1 ? "" : "s"} answered so far
                  {current && sr.transcript ? ", plus your current answer" : ""}.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirmEnd(false)}>
                    Continue
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={() => finishInterview(false)}>
                    End & see results
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]")} />
      <span className="text-zinc-300">{label}</span>
    </li>
  );
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
