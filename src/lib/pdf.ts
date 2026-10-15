"use client";
import { jsPDF } from "jspdf";
import type { InterviewConfig, QA, Report, Violation } from "./types";
import { formatDuration } from "./scoring";

interface Input {
  config: InterviewConfig;
  qas: QA[];
  violations: Violation[];
  report: Report | null;
  score: { base: number; penalty: number; final: number; grade: { label: string } };
  durationMs: number;
  terminated: boolean;
}

const INDIGO: [number, number, number] = [79, 70, 229];
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

/** Builds and downloads a clean, printable PDF version of the results. */
export function downloadReportPdf({ config, qas, violations, report, score, durationMs, terminated }: Input) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = 0;

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const text = (t: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const { size = 10.5, bold = false, color = DARK, indent = 0, gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(t.replace(/[^\x20-\x7E\n]/g, (c) => ({ "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "−": "-", "…": "..." })[c] ?? ""), W - M * 2 - indent);
    for (const line of lines) {
      ensure(size * 1.4);
      doc.text(line, M + indent, y + size);
      y += size * 1.4;
    }
    y += gap;
  };
  const heading = (t: string) => {
    ensure(40);
    y += 10;
    text(t, { size: 14, bold: true, color: INDIGO, gap: 6 });
  };
  const list = (items: string[]) => items.forEach((i) => text(`-  ${i}`, { indent: 6, gap: 2 }));

  // header band
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, W, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Interview Performance Report", M, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${config.role}  |  ${config.experience}  |  ${new Date().toLocaleString()}`, M, 76);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text(`${score.final}`, W - M, 70, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`/ 100  -  ${score.grade.label}`, W - M, 92, { align: "right" });
  y = 150;

  if (terminated) text("This interview was terminated automatically due to proctoring violations.", { bold: true, color: [190, 18, 60] });

  heading("Summary");
  text(
    `Questions: ${qas.length}   |   Answered: ${qas.filter((q) => !q.skipped).length}   |   Duration: ${formatDuration(durationMs)}   |   Violations: ${violations.length}`,
    { color: MUTED },
  );
  text(`Answer score: ${score.base}/100   |   Proctoring penalty: -${score.penalty}   |   Final score: ${score.final}/100`, { bold: true });
  if (report) {
    text(report.summary);
    text(`Verdict: ${report.verdict}`, { bold: true });
    heading("Strengths");
    list(report.strengths);
    heading("Areas to improve");
    list(report.improvements);
  }

  if (violations.length) {
    heading("Proctoring log");
    const start = violations[0]?.at ?? 0;
    list(violations.map((v, i) => `#${i + 1}  ${v.type.replace("-", " ")}  at ${new Date(v.at).toLocaleTimeString()}${i ? ` (+${Math.round((v.at - start) / 1000)}s)` : ""}`));
  }

  heading("Question-by-question");
  qas.forEach((q, i) => {
    ensure(70);
    text(`Q${i + 1}. ${q.question}`, { bold: true, gap: 2 });
    text(`${q.category}   |   Score: ${q.skipped ? "0 (skipped)" : q.score !== undefined ? `${q.score}/10` : "not evaluated"}`, { size: 9, color: MUTED, gap: 4 });
    text(`Your answer: ${q.skipped ? "(skipped)" : q.answer || "(no answer)"}`, { size: 10, gap: 3 });
    if (q.feedback) text(`Feedback: ${q.feedback}`, { size: 10, gap: 3 });
    if (q.idealAnswer) text(`Model answer: ${q.idealAnswer}`, { size: 10, color: [51, 65, 85], gap: 12 });
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("HireReady AI - Mock Interview Report", M, H - 22);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 22, { align: "right" });
  }

  const safeRole = config.role.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`interview-report-${safeRole}.pdf`);
}
