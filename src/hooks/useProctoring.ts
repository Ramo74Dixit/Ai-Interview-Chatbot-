"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ViolationType } from "@/lib/types";

const DEBOUNCE_MS = 1500;
const BLOCKED_KEYS = new Set(["c", "v", "x", "a", "p", "s", "u", "r", "f", "t", "n", "w"]);

export const isFullscreen = () => typeof document !== "undefined" && !!document.fullscreenElement;

export async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {}
}

/**
 * Watches for tab switches, window blur and full-screen exits while `active`,
 * and blocks copy/paste, right-click and common shortcuts.
 * A single user action often fires several events (blur + visibilitychange), so violations are debounced.
 */
export function useProctoring(active: boolean, onViolation: (type: ViolationType) => void) {
  const [fullscreen, setFullscreen] = useState(true);
  const lastRef = useRef(0);
  const cbRef = useRef(onViolation);
  useEffect(() => {
    cbRef.current = onViolation;
  }, [onViolation]);

  const report = useCallback((type: ViolationType) => {
    const now = Date.now();
    if (now - lastRef.current < DEBOUNCE_MS) return;
    lastRef.current = now;
    cbRef.current(type);
  }, []);

  useEffect(() => {
    if (!active) return;
    setFullscreen(isFullscreen());

    const onVisibility = () => document.visibilityState === "hidden" && report("tab-switch");
    const onBlur = () => setTimeout(() => !document.hasFocus() && document.visibilityState === "visible" && report("window-blur"), 150);
    const onFs = () => {
      const fs = isFullscreen();
      setFullscreen(fs);
      if (!fs) report("fullscreen-exit");
    };
    const block = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // allow selecting text inside the typed-answer fallback
      if (e.type === "selectstart" && target?.closest?.("textarea")) return;
      e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (
        (mod && BLOCKED_KEYS.has(k)) ||
        (mod && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        k === "f12" ||
        k === "f5" ||
        k === "printscreen" ||
        (e.altKey && k === "tab")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    ["copy", "cut", "paste", "contextmenu", "selectstart", "dragstart", "drop"].forEach((ev) =>
      document.addEventListener(ev, block),
    );
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      ["copy", "cut", "paste", "contextmenu", "selectstart", "dragstart", "drop"].forEach((ev) =>
        document.removeEventListener(ev, block),
      );
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active, report]);

  return { fullscreen };
}
