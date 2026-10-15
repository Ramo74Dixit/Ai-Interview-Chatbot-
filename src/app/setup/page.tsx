"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Camera,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  GraduationCap,
  ListChecks,
  Maximize,
  Mic,
  ShieldCheck,
  TriangleAlert,
  Volume2,
  X,
} from "lucide-react";
import { Background, Button, Card, Logo, cn } from "@/components/ui";
import { useMediaStream } from "@/hooks/useMediaStream";
import { isSpeechRecognitionSupported } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { enterFullscreen } from "@/hooks/useProctoring";
import { MAX_VIOLATIONS, PENALTY_PER_VIOLATION, type InterviewMode } from "@/lib/types";
import { useInterview } from "@/store/interview";

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Android Developer",
  "Product Manager",
  "UI/UX Designer",
  "QA / Test Engineer",
  "Business Analyst",
];

const EXPERIENCE = [
  { value: "Fresher (0 years)", label: "Fresher", sub: "0 years · student / graduate" },
  { value: "1-2 years", label: "Junior", sub: "1-2 years" },
  { value: "3-5 years", label: "Mid-level", sub: "3-5 years" },
  { value: "6-10 years", label: "Senior", sub: "6-10 years" },
  { value: "10+ years", label: "Lead / Principal", sub: "10+ years" },
];

const QUESTION_OPTS = [3, 5, 8, 10, 15];
const TIME_OPTS = [5, 10, 15, 20, 30];

const LANGS = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
];

const STEPS = ["Role", "Experience", "Format", "System check", "Rules"];

export default function SetupPage() {
  const router = useRouter();
  const setConfig = useInterview((s) => s.setConfig);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const [role, setRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState("");
  const [modeType, setModeType] = useState<"questions" | "time">("questions");
  const [count, setCount] = useState(5);
  const [minutes, setMinutes] = useState(10);
  const [lang, setLang] = useState("en-IN");
  const [agreed, setAgreed] = useState(false);
  const [checks, setChecks] = useState({ speaker: false });
  const [fsError, setFsError] = useState(false);

  const mode: InterviewMode = modeType === "questions" ? { type: "questions", count } : { type: "time", minutes };

  const canNext = [role.trim().length > 1, !!experience, true, true, agreed][step];

  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d)));
  };

  const addSkill = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (v && !skills.includes(v) && skills.length < 12) setSkills([...skills, v]);
    setSkillInput("");
  };

  const begin = async () => {
    setConfig({ role: role.trim(), experience, skills, mode, lang });
    const ok = await enterFullscreen();
    if (!ok) {
      setFsError(true);
      return;
    }
    router.push("/interview");
  };

  return (
    <main className="relative min-h-screen">
      <Background />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <span className="text-sm text-zinc-500">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-16">
        {/* stepper */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col gap-2">
              <div className="h-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className={cn("hidden text-xs sm:block", i <= step ? "text-zinc-200" : "text-zinc-600")}>{s}</span>
            </div>
          ))}
        </div>

        <Card className="relative overflow-hidden p-6 sm:p-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <section>
                  <StepHeader icon={Briefcase} title="What role are you targeting?" sub="We'll tailor every question to this role." />
                  <input
                    autoFocus
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canNext && go(1)}
                    placeholder="e.g. Frontend Developer"
                    maxLength={80}
                    className="h-14 w-full rounded-xl border border-white/10 bg-black/30 px-5 text-lg text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/15"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={cn(
                          "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition",
                          role === r
                            ? "border-violet-400/60 bg-violet-500/20 text-white"
                            : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <label className="mt-8 block text-sm font-medium text-zinc-300">
                    Key skills / tech stack <span className="text-zinc-600">(optional)</span>
                  </label>
                  <div className="mt-2 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 focus-within:border-violet-400/60">
                    {skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1 text-sm text-violet-100">
                        {s}
                        <button aria-label={`Remove ${s}`} onClick={() => setSkills(skills.filter((x) => x !== s))} className="cursor-pointer text-violet-300 hover:text-white">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      value={skillInput}
                      onChange={(e) => (e.target.value.endsWith(",") ? addSkill(e.target.value) : setSkillInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && skillInput.trim()) {
                          e.preventDefault();
                          addSkill(skillInput);
                        } else if (e.key === "Backspace" && !skillInput && skills.length) setSkills(skills.slice(0, -1));
                      }}
                      onBlur={() => skillInput.trim() && addSkill(skillInput)}
                      placeholder={skills.length ? "" : "React, Node.js, SQL… press Enter to add"}
                      className="min-w-40 flex-1 bg-transparent py-1 text-white outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </section>
              )}

              {step === 1 && (
                <section>
                  <StepHeader icon={GraduationCap} title="How much experience do you have?" sub="Question difficulty is calibrated to your level." />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EXPERIENCE.map((e) => (
                      <OptionCard key={e.value} selected={experience === e.value} onClick={() => setExperience(e.value)}>
                        <div className="font-semibold text-white">{e.label}</div>
                        <div className="text-sm text-zinc-400">{e.sub}</div>
                      </OptionCard>
                    ))}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section>
                  <StepHeader icon={ListChecks} title="How do you want to practise?" sub="Go by a number of questions, or set a time limit." />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionCard selected={modeType === "questions"} onClick={() => setModeType("questions")}>
                      <ListChecks className="mb-3 h-6 w-6 text-violet-300" />
                      <div className="font-semibold text-white">By number of questions</div>
                      <div className="text-sm text-zinc-400">Finish after a set number of questions.</div>
                    </OptionCard>
                    <OptionCard selected={modeType === "time"} onClick={() => setModeType("time")}>
                      <Clock className="mb-3 h-6 w-6 text-cyan-300" />
                      <div className="font-semibold text-white">By time</div>
                      <div className="text-sm text-zinc-400">Keep going until the timer runs out.</div>
                    </OptionCard>
                  </div>
                  <div className="mt-8">
                    <div className="mb-3 text-sm font-medium text-zinc-300">
                      {modeType === "questions" ? "Number of questions" : "Duration"}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {(modeType === "questions" ? QUESTION_OPTS : TIME_OPTS).map((n) => {
                        const sel = modeType === "questions" ? count === n : minutes === n;
                        return (
                          <button
                            key={n}
                            onClick={() => (modeType === "questions" ? setCount(n) : setMinutes(n))}
                            className={cn(
                              "h-16 cursor-pointer rounded-xl border text-center transition",
                              sel
                                ? "border-violet-400/60 bg-violet-500/20 text-white shadow-lg shadow-violet-900/30"
                                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20",
                            )}
                          >
                            <div className="text-xl font-semibold">{n}</div>
                            <div className="text-[11px] tracking-wide uppercase opacity-70">{modeType === "questions" ? "Qs" : "min"}</div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-sm text-zinc-500">
                      {modeType === "questions"
                        ? `Roughly ${Math.round(count * 2.5)}-${count * 3} minutes.`
                        : `About ${Math.max(2, Math.round(minutes / 2.5))} questions, depending on your pace.`}
                    </p>
                  </div>
                </section>
              )}

              {step === 3 && <SystemCheck lang={lang} setLang={setLang} checks={checks} setChecks={setChecks} />}

              {step === 4 && (
                <section>
                  <StepHeader icon={ShieldCheck} title="Proctoring rules" sub="This interview runs in proctored mode. Please read carefully." />
                  <ul className="space-y-3">
                    {[
                      ["The interview runs in full-screen mode.", Maximize],
                      [`Switching tabs, switching windows or leaving full screen is a violation: −${PENALTY_PER_VIOLATION} marks each.`, TriangleAlert],
                      [`The interview ends automatically after ${MAX_VIOLATIONS} violations.`, CircleX],
                      ["Copy, paste, right-click and keyboard shortcuts are disabled.", X],
                      ["Your camera preview is shown on screen but never recorded or uploaded.", Camera],
                      ["Questions are spoken aloud. Answer by voice, then press “Submit answer”.", Mic],
                    ].map(([text, Icon], i) => {
                      const I = Icon as typeof Mic;
                      return (
                        <li key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4">
                          <I className={cn("mt-0.5 h-5 w-5 shrink-0", i === 1 || i === 2 ? "text-amber-300" : "text-violet-300")} />
                          <span className="text-zinc-300">{text as string}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-6 rounded-xl border border-white/8 bg-black/30 p-4 text-sm text-zinc-400">
                    <span className="font-medium text-zinc-200">Your session:</span> {role} · {experience} ·{" "}
                    {mode.type === "questions" ? `${mode.count} questions` : `${mode.minutes} minutes`}
                    {skills.length > 0 && ` · ${skills.join(", ")}`}
                  </div>
                  <label className="mt-6 flex cursor-pointer items-center gap-3 select-none">
                    <span
                      className={cn(
                        "grid h-5.5 w-5.5 place-items-center rounded-md border transition",
                        agreed ? "border-violet-400 bg-violet-500" : "border-white/20 bg-white/5",
                      )}
                    >
                      {agreed && <Check className="h-3.5 w-3.5 text-white" />}
                    </span>
                    <input type="checkbox" className="sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <span className="text-zinc-200">I understand and agree to the proctoring rules.</span>
                  </label>
                  {fsError && (
                    <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">
                      Your browser blocked full-screen mode. Please allow it and try again.
                    </p>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => go(-1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(1)} disabled={!canNext}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={begin} disabled={!agreed} size="lg">
                <Maximize className="h-4.5 w-4.5" /> Enter full screen & start
              </Button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

function StepHeader({ icon: Icon, title, sub }: { icon: typeof Mic; title: string; sub: string }) {
  return (
    <div className="mb-7">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/20 ring-1 ring-white/10">
        <Icon className="h-5 w-5 text-violet-200" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-zinc-400">{sub}</p>
    </div>
  );
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border p-5 text-left transition",
        selected
          ? "border-violet-400/60 bg-violet-500/15 shadow-lg shadow-violet-900/30"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      {selected && (
        <span className="absolute top-4 right-4 grid h-5 w-5 place-items-center rounded-full bg-violet-500">
          <Check className="h-3 w-3 text-white" />
        </span>
      )}
      {children}
    </button>
  );
}

function SystemCheck({
  lang,
  setLang,
  checks,
  setChecks,
}: {
  lang: string;
  setLang: (l: string) => void;
  checks: { speaker: boolean };
  setChecks: (c: { speaker: boolean }) => void;
}) {
  const { stream, error, level } = useMediaStream({ video: true, audio: true });
  const { speak, speaking } = useSpeechSynthesis(lang);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [srSupported, setSrSupported] = useState(true);
  const [heardMic, setHeardMic] = useState(false);

  useEffect(() => setSrSupported(isSpeechRecognitionSupported()), []);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (level > 0.12) setHeardMic(true);
  }, [level]);

  const items = useMemo(
    () => [
      { label: "Camera", ok: !!stream && stream.getVideoTracks().length > 0, hint: error ?? "Waiting for permission…" },
      { label: "Microphone", ok: heardMic, hint: stream ? "Say something to test your mic" : (error ?? "Waiting for permission…") },
      { label: "Speakers", ok: checks.speaker, hint: "Play the test voice" },
      { label: "Voice recognition", ok: srSupported, hint: "Not supported. Use Chrome or Edge (you can still type)." },
    ],
    [stream, error, heardMic, checks.speaker, srSupported],
  );

  return (
    <section>
      <StepHeader icon={Mic} title="Quick system check" sub="Let's make sure your camera, mic and speakers are working." />
      <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/50">
          {stream ? (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          ) : (
            <div className="grid h-full place-items-center p-4 text-center text-sm text-zinc-500">
              <div>
                <Camera className="mx-auto mb-2 h-7 w-7" />
                {error ?? "Allow camera & microphone access when prompted"}
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur">
            <Mic className="h-3.5 w-3.5 text-cyan-300" />
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width] duration-75" style={{ width: `${Math.min(100, level * 160)}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              {it.ok ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <span className="mt-1 h-4 w-4 shrink-0 animate-pulse rounded-full border-2 border-zinc-600" />}
              <div>
                <div className="text-sm font-medium text-white">{it.label}</div>
                {!it.ok && <div className="text-xs text-zinc-500">{it.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          variant="secondary"
          loading={speaking}
          onClick={async () => {
            await speak("Hi! I'm Aria, your AI interviewer. If you can hear me clearly, you're all set.");
            setChecks({ ...checks, speaker: true });
          }}
        >
          <Volume2 className="h-4 w-4" /> Play test voice
        </Button>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="h-11 cursor-pointer rounded-xl border border-white/10 bg-[#0e0e17] px-4 text-sm text-zinc-200 outline-none focus:border-violet-400/60"
          aria-label="Interview language / accent"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Tip: use headphones and a quiet room for the best speech recognition. You can continue even if a check is pending.
      </p>
    </section>
  );
}
