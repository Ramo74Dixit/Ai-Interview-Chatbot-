"use client";
import { useEffect, useRef, useState } from "react";

/** Opens camera and/or mic and exposes a smoothed mic level (0-1). Nothing is recorded or uploaded. */
export function useMediaStream({ video, audio, enabled = true }: { video: boolean; audio: boolean; enabled?: boolean }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let s: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false,
          audio,
        });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        setStream(s);
        setError(null);
        if (audio) {
          ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(s).connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          let smooth = 0;
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (const v of data) sum += ((v - 128) / 128) ** 2;
            const rms = Math.sqrt(sum / data.length);
            smooth = smooth * 0.8 + Math.min(1, rms * 4) * 0.2;
            setLevel(smooth);
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch (e) {
        const name = (e as DOMException).name;
        setError(
          name === "NotAllowedError"
            ? "Permission denied. Please allow camera and microphone access in your browser."
            : name === "NotFoundError"
              ? "No camera or microphone was found."
              : "Could not access your camera / microphone.",
        );
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      s?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      setStream(null);
    };
  }, [video, audio, enabled]);

  return { stream, error, level };
}
