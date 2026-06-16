# Product Requirements Document (PRD)
# ExamSense AI — AI-Powered Exam Prediction Study Tool (MVP)

**Document type:** MVP PRD optimized for AI coding agents (OpenCode + DeepSeek) and GitHub Spec Kit
**Budget:** $0 (free tiers only) | **Status:** Draft v1.1 (condensed)

> **Spec Kit usage:** Feed sections individually into `/specify`. Section 16 is pre-chunked for `/tasks`. Sections 9–12 are the technical context for `/plan`. A companion CSV (44-task tracker with dependencies and full "Definition of Done" detail) expands Section 16 for day-to-day tracking in Notion.

---

## 1. Executive Summary

ExamSense AI helps university students predict what's likely on their next exam. Students upload lecture PDFs and previous exam PDFs; a 5-step AI pipeline extracts text, builds a knowledge base, reverse-engineers the professor's exam-writing behavior, predicts high-probability topics, and generates a realistic mock exam matching that professor's actual style. The MVP ships the smallest version that proves this value loop, using only free tools: Next.js + Vercel, Supabase (DB/Auth/Storage), OpenRouter (free-tier LLMs), Tailwind + shadcn/ui.

---

## 2. Problem Statement

Students often have past exams and lecture slides but no efficient way to combine them into an actionable prediction of what their specific professor will ask. Generic AI tools and flashcard apps treat all course content as equally testable; they don't model an individual professor's historical exam behavior. ExamSense AI treats "what does this professor tend to ask" as a first-class signal, separate from "what does the course cover."

---

## 3. User Personas

- **Ahmed (Free, undergrad):** 3 PDFs, no budget, wants a usable prediction within minutes before finals.
- **Sara (Premium, master's):** 20+ PDFs across semesters, wants every intermediate output to study the reasoning, not just the final exam.
- **Admin (founder):** needs a simple way to flip a user to Premium manually (no payment processor yet) and see basic usage.

---

## 4. User Stories

1. Sign up with email/password to get a private workspace.
2. Sign out to end my session.
3. As Free, upload up to 3 PDFs to try the product.
4. As Premium, upload 20+ PDFs to analyze a full course.
5. Tag each upload as Lecture or Previous Exam so the pipeline knows how to use it.
6. Click "Generate Study Pack" to run the pipeline on my unprocessed documents.
7. See live status of which of the 5 steps is running.
8. As Free, view only `professor_dna.md` and `predicted_exam.md`.
9. As Premium, view/download all five outputs.
10. Get a clear error if a PDF can't be processed.
11. Be blocked from starting a second job while one runs.
12. As admin, toggle a user's plan in the Supabase table editor.

---

## 5. Functional Requirements

| Feature | Description | Inputs | Outputs | Validation | Error Handling |
|---|---|---|---|---|---|
| Sign Up | Email/password registration via Supabase Auth; auto-creates `profiles` row | email, password | Session; `profiles` row (`plan='free'`) | Valid email; password ≥8 chars; email unique | Duplicate email / weak password → specific message |
| Sign In | Email/password login | email, password | Session; redirect to `/dashboard` | Both fields required | Wrong credentials → "Invalid email or password" |
| Sign Out | Clears session | button click | Redirect to `/login` | Must be signed in | N/A |
| Upload Document | Upload one PDF tagged lecture/exam | file (PDF ≤15MB Free/30MB Premium), type | `documents` row, file in Storage | PDF MIME via magic bytes; size & count vs plan limit | Wrong type / oversize / over-limit / network failure → specific message, no orphaned row |
| Delete Document | Remove an unprocessed document | document_id | Row + file removed | Must own it; not mid-processing | "Currently being processed" message if blocked |
| Start Pipeline Job | Create a job over all eligible documents | none (auto-selects) | `jobs` row (`queued`) | ≥1 lecture + ≥1 exam doc; no active job | Missing doc type / job already running → specific message |
| Pipeline Execution (5 steps) | Server-side orchestration calling OpenRouter per step | Extracted text / prior step output | One `.md` file per step in Storage + `job_outputs` row | Each step needs prior step's non-empty output | API timeout/429 → retry once, then fail job with named step; failed extraction → exclude doc, continue if others succeed |
| View Job Status | Poll progress | job_id | `{status, current_step, steps[], error_message}` | Job must belong to user | Not found → 404 |
| View/Download Outputs | Render + download a Markdown output | job_id, output_type | Rendered Markdown + download link | Free plan limited to 2 of 5 output types (server-enforced) | Not ready / plan-restricted → specific message + upgrade CTA |
| Manual Plan Upgrade (MVP) | Admin edits `profiles.plan` directly in Supabase | admin action | `plan='premium'` | Only `free`/`premium` valid | N/A — real billing is a future feature |

---

## 6. Non-Functional Requirements

- **Cost:** $0 fixed monthly target; stay within Vercel Hobby, Supabase Free Tier, and OpenRouter free-model rate limits.
- **Performance:** each pipeline step <60s for typical input; full pipeline runs asynchronously, never blocking the user.
- **Reliability:** a failed step never corrupts prior completed steps.
- **Usability:** a non-technical student can sign up, upload, and start a job in under 2 minutes unaided.
- **Maintainability:** small, single-purpose files so an AI agent can change one feature without touching others.
- **Data retention:** PDFs/outputs kept indefinitely for MVP; cleanup is a future feature.

---

## 7. Free vs Premium Access Rules

| Capability | Free | Premium |
|---|---|---|
| Max active documents | 3 | 25 |
| Max file size | 15MB | 30MB |
| `Extracting_Text_from_PDF.md` | No | Yes |
| `knowledge_base.md` | No | Yes |
| `professor_dna.md` | Yes | Yes |
| `exam_targets.md` | No | Yes |
| `predicted_exam.md` | Yes | Yes |
| Concurrent jobs | 1 | 1 |
| Plan change | Manual (admin, MVP) | Manual (admin, MVP) |

Enforcement lives in exactly two places: the upload route (document count/size vs plan) and the outputs route (output_type vs plan allow-list). No other code re-implements this logic.

---

## 8. User Flow Diagrams

**Onboarding:** Visitor → Sign Up (email/password) → `profiles` row auto-created (`plan='free'`) → `/dashboard` empty state.

**Upload & Generate:** Upload PDF + choose type → validate (type/size/limit) → store + `documents` row → repeat → "Generate Study Pack" → validate (≥1 lecture, ≥1 exam, no active job) → `jobs` row created → Steps 1→2→3→4→5 run via polling → `jobs.status='completed'`.

**View Outputs (plan-gated):** Select completed job → 5 outputs listed, locked icon on Premium-only ones for Free users → unlocked → render Markdown + download; locked → upgrade modal.

---

## 9. Database Schema (Supabase Postgres)

All tables: RLS enabled, policy `auth.uid() = user_id` (or `= id` for `profiles`).

**profiles** — id (uuid, PK), plan (text, `free`/`premium`), created_at.

**documents** — id, user_id (FK), file_name, storage_path, document_type (`lecture`/`exam`), status (`uploaded`/`queued`/`processed`/`extraction_failed`/`archived`), file_size_bytes, created_at.

**jobs** — id, user_id (FK), status (`queued`/`running`/`completed`/`failed`), current_step, error_message, created_at, updated_at.

**job_documents** — job_id, document_id (join table linking a job to the documents it processed).

**job_outputs** — id, job_id, user_id, output_type (one of the 5 step names), storage_path, status (`pending`/`completed`/`failed`), created_at.

Output content is stored as `.md` files in Supabase Storage, not as large text columns, to keep the free-tier DB small. `job_outputs` only stores a pointer.

---

## 10. API Endpoints

Next.js API Routes under `/app/api/`, all requiring a valid Supabase session (401 otherwise).

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/documents/upload` | Upload PDF (multipart: `file`, `document_type`) |
| GET | `/api/documents` | List current user's documents |
| DELETE | `/api/documents/[id]` | Delete a document |
| POST | `/api/jobs` | Start a pipeline job |
| GET | `/api/jobs` | List user's jobs |
| GET | `/api/jobs/[id]/status` | Poll progress (`{status, current_step, steps[]}`) |
| POST | `/api/jobs/[id]/run-step` | Internal: execute the next pending step |
| GET | `/api/jobs/[id]/outputs` | List outputs with `locked` flag per plan |
| GET | `/api/jobs/[id]/outputs/[type]` | Markdown content + signed download URL (plan-gated) |
| GET | `/api/profile` | Current plan + usage counts |

---

## 11. Folder Structure

```
exam-sense-ai/
├── app/
│   ├── (auth)/login/page.tsx, signup/page.tsx
│   ├── dashboard/page.tsx, jobs/[id]/page.tsx
│   ├── api/documents/upload/route.ts, [id]/route.ts
│   ├── api/jobs/route.ts, [id]/status/route.ts, [id]/run-step/route.ts,
│   │        [id]/outputs/route.ts, [id]/outputs/[type]/route.ts
│   ├── api/profile/route.ts
│   └── layout.tsx
├── components/ui/ (shadcn), DocumentUploader.tsx, DocumentList.tsx,
│   JobProgress.tsx, OutputViewer.tsx
├── lib/
│   ├── supabase/client.ts, server.ts, middleware.ts
│   ├── openrouter.ts          # OpenRouter API wrapper (callLLM)
│   ├── pipeline/prompts/*.ts  # the 5 prompt files as constants
│   ├── pipeline/orchestrator.ts
│   └── planRules.ts           # single source of truth for Free/Premium limits
├── supabase/migrations/
├── .env.local.example
└── README.md
```

---

## 12. AI Pipeline Architecture

Each of the 5 steps reuses an existing prompt spec as the system prompt for one OpenRouter chat-completion call.

| Step | Prompt Source | Primary Input | Output |
|---|---|---|---|
| 1. Extract Text | `Extracting_Text_from_PDF.md` | PDF text (via `pdf-parse`) | `Extracting_Text_from_PDF.md` |
| 2. Knowledge Base | `knowledge_base_prompt.md` | Step 1, lecture docs only | `knowledge_base.md` |
| 3. Professor DNA | `professor_dna_prompt.md` | Step 1, exam docs only | `professor_dna.md` |
| 4. Exam Targets | `exam_targets_prompt.md` | Steps 2+3 | `exam_targets.md` |
| 5. Predicted Exam | `predicted_exam_prompt.md` | Steps 2+3+4 | `predicted_exam.md` |

**Provider:** OpenRouter, not DeepSeek's own API — its OpenAI-compatible endpoint offers genuinely free `:free`-suffixed models (DeepSeek/Llama/Qwen routes), matching the $0 budget; DeepSeek's direct API is only free for a one-time 5M-token trial. Model id is read from `OPENROUTER_MODEL` (not hardcoded) since the free roster rotates.

**Orchestration:** to stay within Vercel's free function timeout, the pipeline runs as a client-driven step chain — the dashboard repeatedly calls `POST /api/jobs/[id]/run-step`, one short step at a time, until `completed`/`failed`. No queue or worker needed.

**Chunking:** if combined input text would exceed ~80% of the model's context window, batch the documents, run the prompt per batch, and merge results.

**Free-tier capacity:** ~20 req/min and 50 req/day with no credit added (1,000/day after an optional one-time $10 top-up). A full run = 5 requests, so ~8–10 full test runs/day are free — enough for development.

---

## 13. Security Considerations

- RLS enabled on every table, scoped to `auth.uid()`.
- Storage bucket policy mirrors table RLS (`{user_id}/...` paths).
- `OPENROUTER_API_KEY` is server-only, never in client bundles; all LLM calls happen in API routes.
- Every API route checks for a valid session (401 if missing).
- Uploaded files are validated by magic bytes, not just extension.
- Plan-gating (output access, upload limits) is enforced server-side, never UI-only.
- Per-user limits (1 active job, plan-based doc caps) double as abuse/cost protection.

---

## 14. Edge Cases

- Scanned/image-only PDF with no extractable text → marked `extraction_failed`; job continues with remaining valid docs (OCR is a future feature).
- OpenRouter error/timeout/429 → retry once, then fail the job naming the step.
- Only lecture or only exam docs uploaded → job blocked at start with a specific message.
- Second job attempted while one is active → blocked, button disabled in UI.
- Combined text too large for context window → handled via batching (Section 12).
- Document deleted after its job ran → job's stored outputs remain untouched.
- Free user at the 3-document cap → 4th upload blocked with upgrade prompt.
- Output requested before its step finishes → "not ready yet," not a broken render.
- Unconfirmed email at sign-in (if confirmation enabled) → clear resend option (can defer to v1.1).

---

## 15. Development Roadmap

0. **Setup** — Next.js, Supabase, env vars, first Vercel deploy.
1. **Auth** — sign up/in/out, `profiles` + RLS.
2. **Uploads** — Storage bucket, upload/delete routes, document list UI.
3. **Pipeline Step 1** — PDF parsing, OpenRouter wrapper, extraction route.
4. **Pipeline Steps 2–5** — knowledge base, professor DNA, exam targets, predicted exam.
5. **Orchestrator & Job UI** — run-step chaining, progress bar, polling.
6. **Outputs & Plan Gating** — Markdown viewer, downloads, allow-list enforcement.
7. **Polish & Launch** — empty/error states, landing page, manual QA, deploy.

---

## 16. Detailed Task Breakdown for AI Agents

Each task is atomic and independently verifiable. Complete and verify one before starting the next. (Full detail, dependencies, and "Definition of Done" per task live in the companion progress-tracker CSV — this list is the condensed build order.)

**Phase 0 — Setup**
1. Init Next.js (TypeScript, App Router) project.
2. Configure Tailwind + shadcn/ui (button, input, card, table, badge).
3. Create Supabase project + OpenRouter account; set env vars (Supabase keys, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`).
4. Build `lib/supabase/client.ts` and `server.ts`.
5. Migrate `profiles` table + RLS.
6. Add trigger to auto-create `profiles` row on signup.
7. First deploy to Vercel with env vars set.

**Phase 1 — Auth**
8. Build `/login` page (Supabase `signInWithPassword`).
9. Build `/signup` page (Supabase `signUp`, password ≥8 chars).
10. Add Sign Out button.
11. Add middleware protecting `/dashboard/*`.

**Phase 2 — Documents**
12. Migrate `documents` table + RLS.
13. Create Storage bucket `documents` + path-based RLS.
14. Build `lib/planRules.ts` (limits + output allow-list).
15. Build `POST /api/documents/upload` (magic-byte check, size/count validation).
16. Build `GET /api/documents`.
17. Build `DELETE /api/documents/[id]` (block if mid-processing).
18. Build `DocumentUploader.tsx`.
19. Build `DocumentList.tsx`.

**Phase 3 — Pipeline Core**
20. Migrate `jobs`, `job_documents`, `job_outputs` + RLS.
21. Build `lib/openrouter.ts` (`callLLM`), reading model from env.
22. Add the 5 prompt files as TS constants.
23. Build PDF-to-text utility (`pdf-parse` + near-empty detection).
24. Build `POST /api/jobs` (validate doc types + no active job).
25. Build `GET /api/jobs`.
26. Build `GET /api/jobs/[id]/status`.

**Phase 4 — Pipeline Steps**
27. Implement "extract" branch of `run-step`.
28. Implement "knowledge_base" branch (lecture docs only).
29. Implement "professor_dna" branch (exam docs only).
30. Implement "exam_targets" branch (Steps 2+3).
31. Implement "predicted_exam" branch (Steps 2+3+4) → `jobs.status='completed'`.
32. Implement chunking/batching in `orchestrator.ts`.
33. Implement retry-once-then-fail + partial-document-failure handling.

**Phase 5 — Job UI**
34. Build `JobProgress.tsx` (polls status, drives `run-step` calls).
35. Wire "Generate Study Pack" button to `POST /api/jobs`.
36. Disable that button while a job is active.

**Phase 6 — Outputs**
37. Build `GET /api/jobs/[id]/outputs` (with `locked` flag).
38. Build `GET /api/jobs/[id]/outputs/[type]` (403 if locked, server-side).
39. Build `OutputViewer.tsx` (render, lock icon, download button).

**Phase 7 — Polish**
40. Build landing page with Sign Up CTA.
41. Add empty-state messaging for zero documents.
42. Add global error/toast handling.
43. Build `GET /api/profile` + plan badge in header.
44. Full manual end-to-end test on the deployed Vercel URL.

---

## 17. Acceptance Criteria

- New signup → `profiles` row with `plan='free'`; signed-out `/dashboard` visit redirects to `/login`.
- Free user blocked at exactly 3 uploaded PDFs; non-PDF rejected before any Storage write.
- Job blocked without ≥1 lecture + ≥1 exam document.
- A completed job has exactly 5 `job_outputs` rows, all `status='completed'`.
- A step failing twice sets `jobs.status='failed'` with the correct named step, and no later-step rows are created.
- Progress UI advances through all 5 steps without manual refresh.
- Direct API call for a locked output as a Free user returns 403, even bypassing the UI.
- Premium user can view/download all 5 outputs.
- No `OPENROUTER_API_KEY` ever appears in client-side JS.
- All of the above verified on the deployed Vercel URL, not just localhost.

---

## 18. Future Features (Not in MVP)

Stripe Checkout to replace the manual plan toggle; OCR for scanned PDFs (e.g., Tesseract.js); automatic job retry/resume from last successful step; multi-course organization; flashcards/spaced repetition from `knowledge_base.md`; shared study packs between classmates; completion email notifications; admin analytics dashboard; non-PDF input support (PPTX, DOCX, images); multi-language support; a mobile app; automatic document/output archival policy.
