"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;

function getCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return !!getCtor();
}

/**
 * Continuous speech-to-text using the browser Web Speech API.
 * Chrome stops recognition after periods of silence, so we transparently restart while `listening` is true.
 */
export function useSpeechRecognition(lang: string) {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");

  const stopInternal = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    if (interimRef.current) finalRef.current = `${finalRef.current} ${interimRef.current}`.trim();
    interimRef.current = "";
    setFinalText(finalRef.current);
    setInterim("");
    try {
      recRef.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setError(null);
    wantRef.current = true;
    setListening(true);
    const rec: SR = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      if (!wantRef.current || recRef.current !== rec) return;
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalRef.current = `${finalRef.current} ${r[0].transcript}`.trim();
        } else {
          interimText += r[0].transcript;
        }
      }
      interimRef.current = interimText;
      setFinalText(finalRef.current);
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access was blocked. Allow mic access in your browser settings.");
        wantRef.current = false;
        setListening(false);
      } else if (e.error === "network") {
        setError("Speech recognition needs an internet connection.");
      }
      // "no-speech" / "aborted" are normal: onend will restart.
    };
    rec.onend = () => {
      if (wantRef.current && recRef.current === rec) {
        try {
          rec.start();
        } catch {}
      }
    };
    try {
      recRef.current?.abort?.();
    } catch {}
    recRef.current = rec;
    try {
      rec.start();
    } catch {}
  }, [lang]);

  const reset = useCallback(() => {
    finalRef.current = "";
    interimRef.current = "";
    setFinalText("");
    setInterim("");
  }, []);

  /** Stops listening and returns everything heard so far (including the last interim chunk). */
  const stop = useCallback(() => {
    const text = `${finalRef.current} ${interimRef.current}`.trim();
    stopInternal();
    return text;
  }, [stopInternal]);

  useEffect(
    () => () => {
      wantRef.current = false;
      try {
        recRef.current?.abort?.();
      } catch {}
    },
    [],
  );

  return { listening, transcript: `${finalText} ${interim}`.trim(), finalText, interim, error, start, stop, reset };
}
