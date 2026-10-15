"use client";
import { useCallback, useEffect, useRef, useState } from "react";

function pickVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  const exact = voices.filter((v) => v.lang.replace("_", "-") === lang);
  const sameLang = voices.filter((v) => v.lang.startsWith(base));
  const prefer = (list: SpeechSynthesisVoice[]) =>
    list.find((v) => /natural|neural|online/i.test(v.name)) ||
    list.find((v) => /google/i.test(v.name)) ||
    list.find((v) => /samantha|female|zira|aria|jenny|heera/i.test(v.name)) ||
    list[0];
  return prefer(exact) || prefer(sameLang) || null;
}

export function useSpeechSynthesis(lang: string) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const resolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    // Voices load asynchronously in Chrome.
    window.speechSynthesis.getVoices();
    const onChange = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  /** Speaks text and resolves when finished (or cancelled / failed). */
  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(lang);
        if (voice) u.voice = voice;
        u.lang = voice?.lang || lang;
        u.rate = 1;
        u.pitch = 1;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearInterval(keepAlive);
          clearTimeout(safety);
          setSpeaking(false);
          resolveRef.current = null;
          resolve();
        };
        resolveRef.current = finish;
        u.onend = finish;
        u.onerror = finish;
        // Chrome pauses long utterances after ~15s; nudging resume keeps it going.
        const keepAlive = setInterval(() => synth.speaking && synth.resume(), 10000);
        // Safety net in case onend never fires.
        const safety = setTimeout(finish, Math.max(8000, text.split(/\s+/).length * 600));
        setSpeaking(true);
        synth.speak(u);
      }),
    [lang],
  );

  return { speak, cancel, speaking, supported };
}
