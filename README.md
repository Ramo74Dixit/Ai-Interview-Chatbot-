# HireReady AI – Voice Mock Interview Chatbot

A proctored, voice-based AI interview portal built with Next.js 15 and Google Gemini.

## Features
- Pick a target role, experience level, optional skills
- Interview **by number of questions** (3–15) or **by time** (5–30 min)
- AI interviewer **speaks** questions; you **answer by voice** (live transcript)
- Questions adapt to your role, seniority and previous answers (Gemini 3.5 Flash-Lite, with automatic fallback models)
- **Proctored mode**: full screen, tab/window switch or leaving full screen = **−15 marks** each,
  auto-terminates after 3 violations, copy/paste/right-click/shortcuts blocked, live webcam preview (never recorded)
- Detailed results: score /100, penalties, per-question score + feedback + model answer, strengths, improvements, **PDF download**

## Setup
1. Get a free Gemini API key: https://aistudio.google.com/apikey
2. Put it in `.env.local`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000 in **Google Chrome or Microsoft Edge** (needed for voice recognition).

## Scoring
`final = max(0, average(answer scores 0–10) × 10 − 15 × violations)`. Skipped questions count as 0.

## Project structure
```
src/app/            pages: / (landing), /setup, /interview, /result
src/app/api/        question, evaluate, report (Gemini, server-side key)
src/hooks/          speech recognition, speech synthesis, proctoring, camera/mic
src/lib/            prompts, Gemini client, scoring, PDF export
src/store/          interview session state (sessionStorage)
```
