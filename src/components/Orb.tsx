"use client";
import { motion } from "framer-motion";
import { cn } from "./ui";

export type OrbState = "idle" | "speaking" | "listening" | "thinking";

const ringColor: Record<OrbState, string> = {
  idle: "rgba(165,180,252,0.25)",
  speaking: "rgba(196,181,253,0.55)",
  listening: "rgba(103,232,249,0.55)",
  thinking: "rgba(240,171,252,0.45)",
};

/** Animated AI interviewer avatar. `level` (0-1) drives the pulse while listening. */
export function Orb({ state, level = 0, size = 220, className }: { state: OrbState; level?: number; size?: number; className?: string }) {
  const pulse = state === "listening" ? 1 + Math.min(level, 1) * 0.18 : 1;
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      {/* rings */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: ringColor[state] }}
          animate={
            state === "speaking" || state === "listening"
              ? { scale: [1, 1.35 + i * 0.12], opacity: [0.6, 0] }
              : { scale: 1 + i * 0.08, opacity: 0.25 - i * 0.07 }
          }
          transition={
            state === "speaking" || state === "listening"
              ? { duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }
              : { duration: 0.6 }
          }
        />
      ))}
      {/* glow */}
      <div
        className="absolute inset-[10%] rounded-full blur-2xl transition-colors duration-700"
        style={{
          background:
            state === "listening"
              ? "radial-gradient(circle, rgba(34,211,238,0.55), transparent 70%)"
              : "radial-gradient(circle, rgba(139,92,246,0.6), transparent 70%)",
        }}
      />
      {/* core */}
      <motion.div
        className="relative overflow-hidden rounded-full shadow-[inset_0_-20px_40px_rgba(0,0,0,0.35),0_20px_60px_-10px_rgba(124,58,237,0.6)]"
        style={{ width: size * 0.62, height: size * 0.62 }}
        animate={{
          scale: state === "speaking" ? [1, 1.06, 0.98, 1.04, 1] : pulse,
        }}
        transition={state === "speaking" ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.12 }}
      >
        <div
          className={cn("absolute -inset-1/2", state === "thinking" ? "spin-slow" : "spin-slow [animation-duration:14s]")}
          style={{
            background:
              state === "listening"
                ? "conic-gradient(from 0deg, #22d3ee, #6366f1, #a78bfa, #22d3ee)"
                : "conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #8b5cf6, #6366f1)",
          }}
        />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),transparent_45%)]" />
      </motion.div>
    </div>
  );
}

/** Simple animated equaliser bars. */
export function Bars({ active, level = 0.5, color = "bg-cyan-300" }: { active: boolean; level?: number; color?: string }) {
  return (
    <div className="flex h-6 items-center gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          className={cn("w-[3px] rounded-full", color)}
          animate={active ? { height: [4, 6 + (level * 18 + 4) * ((i % 3) + 1) * 0.5, 4] } : { height: 4 }}
          transition={active ? { duration: 0.5 + i * 0.08, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        />
      ))}
    </div>
  );
}
