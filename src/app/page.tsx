"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Briefcase,
  Download,
  Lightbulb,
  Mic,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Video,
  Volume2,
} from "lucide-react";
import { Background, Card, FadeIn, Logo, Pill } from "@/components/ui";
import { Bars, Orb } from "@/components/Orb";

const steps = [
  { icon: Briefcase, title: "Tell us your goal", text: "Pick the role you're targeting, your experience and the skills you want to be tested on." },
  { icon: Timer, title: "Choose your format", text: "Practise a fixed number of questions, or set a timer and go until the clock runs out." },
  { icon: Mic, title: "Talk it out", text: "Your AI interviewer asks questions out loud. You answer by voice, just like the real thing." },
];

const features = [
  { icon: Volume2, title: "Fully voice-based", text: "Natural spoken questions and live speech-to-text transcripts of your answers." },
  { icon: Brain, title: "Adapts to you", text: "Gemini tailors every question to your role and seniority, and follows up on your answers." },
  { icon: ShieldCheck, title: "Proctored mode", text: "Full-screen and no tab switching. Each violation costs 15 marks, just like a real assessment." },
  { icon: TrendingUp, title: "Honest scoring", text: "Every answer is scored out of 10 for relevance, depth, correctness and communication." },
  { icon: Lightbulb, title: "Model answers", text: "See what a strong answer looks like for every question you were asked." },
  { icon: Download, title: "PDF report", text: "Download a detailed report with strengths, gaps and next steps to track your progress." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Background />

      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <a href="#how" className="hidden rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white sm:block">
            How it works
          </a>
          <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white sm:block">
            Features
          </a>
          <Link
            href="/setup"
            className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-10 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Pill className="border-violet-400/20 bg-violet-500/10 text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Powered by Google Gemini · 100% free
            </Pill>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-5xl leading-[1.04] font-semibold tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl"
          >
            Ace your next interview with an AI that{" "}
            <span className="font-serif font-normal italic text-gradient">talks back.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400"
          >
            Realistic, voice-based mock interviews tailored to your role and experience. Answer out loud
            in a proctored environment and get instant, honest feedback on every answer.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/setup"
              className="btn-glow group inline-flex h-13 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-7 font-semibold text-white transition hover:brightness-110"
            >
              Start your interview
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#how" className="glass inline-flex h-13 items-center rounded-xl px-6 font-medium text-zinc-200 transition hover:bg-white/10">
              See how it works
            </a>
          </motion.div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> No sign-up needed</span>
            <span className="flex items-center gap-1.5"><Video className="h-4 w-4 text-cyan-400" /> Camera never recorded</span>
            <span className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-violet-400" /> Starts in under a minute</span>
          </div>
        </div>

        {/* hero preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <Card className="relative overflow-hidden p-6 shadow-2xl shadow-violet-950/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Live · Proctored</span>
              </div>
              <Pill>Question 3 / 8</Pill>
            </div>
            <div className="flex justify-center py-6">
              <Orb state="speaking" size={200} />
            </div>
            <div className="rounded-xl border border-white/8 bg-black/30 p-4">
              <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-violet-300 uppercase">Aria · AI Interviewer</div>
              <p className="text-[15px] leading-relaxed text-zinc-100">
                &ldquo;Can you walk me through how you&apos;d design a rate limiter for a public API?&rdquo;
              </p>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
              <Bars active level={0.6} />
              <p className="truncate text-sm text-zinc-400">I&apos;d start by choosing a token bucket algorithm because…</p>
            </div>
          </Card>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="glass absolute top-28 -right-6 hidden items-center gap-3 rounded-2xl px-4 py-3 shadow-xl sm:flex"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-lg font-bold text-emerald-300">8.5</div>
            <div>
              <div className="text-sm font-semibold text-white">Strong answer</div>
              <div className="text-xs text-zinc-400">Clear trade-offs explained</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold tracking-wider text-violet-300 uppercase">How it works</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Three steps to <span className="font-serif font-normal italic text-gradient">interview-ready</span>
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.1}>
              <Card className="group h-full p-7 transition hover:border-white/15 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/20 ring-1 ring-white/10">
                    <s.icon className="h-5.5 w-5.5 text-violet-200" />
                  </div>
                  <span className="font-serif text-5xl text-white/10 italic">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{s.text}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20">
        <FadeIn className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wider text-violet-300 uppercase">Features</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Built to feel like the real room.</h2>
          <p className="mt-4 text-lg text-zinc-400">Every detail is designed to build the confidence and discipline you need on interview day.</p>
        </FadeIn>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={(i % 3) * 0.08} className="bg-[#0a0a12]">
              <div className="h-full p-7 transition hover:bg-white/[0.03]">
                <f.icon className="h-6 w-6 text-violet-300" />
                <h3 className="mt-5 font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-24">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-fuchsia-600/20 p-10 text-center sm:p-16">
            <div className="bg-grid absolute inset-0 opacity-60" />
            <div className="relative">
              <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Your next interview starts now.</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-300">
                No sign-up, no cost. Just you, a microphone and an interviewer who never gets tired.
              </p>
              <Link
                href="/setup"
                className="mt-8 inline-flex h-13 items-center gap-2 rounded-xl bg-white px-7 font-semibold text-zinc-900 transition hover:bg-zinc-200"
              >
                Start practising <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <p className="mt-4 text-xs text-zinc-400">Works best in Google Chrome or Microsoft Edge on desktop.</p>
            </div>
          </div>
        </FadeIn>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-zinc-500 sm:flex-row">
          <Logo />
          <p>Practise smarter. Interview better. © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
