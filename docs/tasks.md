# ExamSense AI — Task Breakdown

---

## M0: Project Setup
*Dependency: None*

| ID | Task | Verification |
|---|---|---|
| 0.1 | Init Next.js (TypeScript, App Router), configure Tailwind + shadcn/ui (button, input, card, table, badge). | `npm run dev` starts; shadcn components render. |
| 0.2 | Create Supabase project + OpenRouter account; set env vars (Supabase keys, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`). | `.env.local` has all 5 vars; `SUPABASE_SERVICE_ROLE_KEY` present. |
| 0.3 | Build `lib/supabase/client.ts` (browser `createClient`) and `server.ts` (server `createClient` with `serviceRoleKey`). | Can instantiate both without error. |
| 0.4 | Migrate `profiles` table + RLS (`auth.uid() = id`). | Row-level security active; insert test passes. |
| 0.5 | Add DB trigger to auto-create `profiles` row on signup. | New auth user → `profiles` row with `plan='free'`. |
| 0.6 | First deploy to Vercel with env vars set. | App loads at deployed URL; no 500 on homepage. |

---

## M1: Auth
*Dependency: M0*

| ID | Task | Verification |
|---|---|---|
| 1.1 | Build `/login` page (Supabase `signInWithPassword`). | Valid creds → redirect to `/dashboard`; invalid → error message. |
| 1.2 | Build `/signup` page (Supabase `signUp`; password ≥8 chars). | Valid → session + `profiles` row created; weak password → message. |
| 1.3 | Add Sign Out button to layout/header. | Clears session; redirects to `/login`. |
| 1.4 | Add middleware protecting `/dashboard/*` and API routes. | Unauthenticated → redirect to `/login`; no protected content leaked. |

---

## M2: Document Management
*Dependency: M1*

| ID | Task | Verification |
|---|---|---|
| 2.1 | Migrate `documents` table + RLS (`auth.uid() = user_id`). | Can only see own rows; insert respects RLS. |
| 2.2 | Create Storage bucket `documents` with path-based RLS (`{user_id}/...`). | User only lists/reads own files; anonymous gets 404. |
| 2.3 | Build `lib/planRules.ts` — single source of truth for limits + output allow-list. | Returns correct caps per plan; no magic numbers elsewhere. |
| 2.4 | Build `POST /api/documents/upload` — magic-byte PDF check, size/count vs plan, store to Supabase Storage, create `documents` row. | Non-PDF rejected before Storage; Free capped at 3 files; Premium at 25; proper row created. |
| 2.5 | Build `GET /api/documents` — list current user's documents. | Returns only user's docs; correct fields. |
| 2.6 | Build `DELETE /api/documents/[id]` — soft-block if mid-processing. | Deletes row + Storage file; returns error if job is running on it. |
| 2.7 | Build `DocumentUploader.tsx` — drag/click upload, tag selector (lecture/exam). | Uploads PDF; shows progress; displays errors inline. |
| 2.8 | Build `DocumentList.tsx` — table of uploaded docs with type badge, status, delete button. | Sort by date; delete works; empty state handled. |

---

## M3: Pipeline Core
*Dependency: M2*

| ID | Task | Verification |
|---|---|---|
| 3.1 | Migrate `jobs`, `job_documents`, `job_outputs` + RLS. | All three tables RLS-enabled; foreign keys valid. |
| 3.2 | Build `lib/openrouter.ts` — `callLLM(systemPrompt, userMessages)` wrapper reading `OPENROUTER_MODEL`. | Returns parsed LLM text; handles 429/timeout errors. |
| 3.3 | Convert 5 prompt `.md` files to TS string constants in `lib/pipeline/prompts/*.ts`. | Each prompt matches its `.md` source exactly. |
| 3.4 | Build PDF-to-text utility using `pdf-parse` with near-empty detection (<50 chars → `extraction_failed`). | Extracts text; marks scanned/image-only PDFs as failed. |
| 3.5 | Build `POST /api/jobs` — validates ≥1 lecture + ≥1 exam, no active job, creates `jobs` + `job_documents` rows. | Blocked messages for missing types or existing active job. |
| 3.6 | Build `GET /api/jobs` — list user's jobs. | Returns jobs sorted by recency. |
| 3.7 | Build `GET /api/jobs/[id]/status` — returns `{status, current_step, steps[], error_message}`. | Accurate progress; 404 for non-owned job. |

---

## M4: Pipeline Steps (1–5)
*Dependency: M3*

| ID | Task | Verification |
|---|---|---|
| 4.1 | Implement "extract" branch of `run-step`: parse each PDF, call LLM to clean text, store as `Extracting_Text_from_PDF.md`. | Failed docs marked `extraction_failed`; job continues with remaining. |
| 4.2 | Implement "knowledge_base" branch: feed lecture-doc extracts to LLM, store `knowledge_base.md`. | Only lecture docs included; output stored in `job_outputs`. |
| 4.3 | Implement "professor_dna" branch: feed exam-doc extracts to LLM, store `professor_dna.md`. | Only exam docs included; output stored. |
| 4.4 | Implement "exam_targets" branch: feed knowledge_base + professor_dna to LLM, store `exam_targets.md`. | Both prior outputs used as input. |
| 4.5 | Implement "predicted_exam" branch: feed knowledge_base + professor_dna + exam_targets to LLM, store `predicted_exam.md`; set `jobs.status='completed'`. | Final step marks job complete; all 5 outputs exist. |
| 4.6 | Implement chunking/batching in `lib/pipeline/orchestrator.ts` — if combined text >80% context window, batch docs. | Large doc sets produce valid merged output. |
| 4.7 | Implement retry-once-then-fail on OpenRouter errors; continue on per-doc extraction failure. | Transient error → retry; second failure → `jobs.status='failed'` with step name; single bad doc doesn't fail job. |

---

## M5: Job UI & Orchestration
*Dependency: M4*

| ID | Task | Verification |
|---|---|---|
| 5.1 | Build `JobProgress.tsx` — polls `GET /api/jobs/[id]/status`, drives `POST /api/jobs/[id]/run-step` calls sequentially. | Advances through all 5 steps without manual refresh. |
| 5.2 | Wire "Generate Study Pack" button to `POST /api/jobs` on dashboard. | Creates job; redirects to job progress page. |
| 5.3 | Disable "Generate Study Pack" button while a job is active (Free + Premium both capped at 1). | Button greyed out; tooltip explains. |

---

## M6: Outputs & Plan Gating
*Dependency: M5*

| ID | Task | Verification |
|---|---|---|
| 6.1 | Build `GET /api/jobs/[id]/outputs` — returns output list with `locked` flag per plan rules. | Free gets 2 unlocked; Premium gets 5 unlocked. |
| 6.2 | Build `GET /api/jobs/[id]/outputs/[type]` — returns Markdown content + signed Storage URL; 403 for locked output types. | Plan-gated server-side; direct curl bypass returns 403. |
| 6.3 | Build `OutputViewer.tsx` — renders Markdown, shows lock icon for Premium-only outputs, download button. | Free sees locked items as disabled; Premium sees all. |

---

## M7: Polish & Launch
*Dependency: M6*

| ID | Task | Verification |
|---|---|---|
| 7.1 | Build landing page with Sign Up CTA. | Public, professional, links to `/signup`. |
| 7.2 | Add empty-state messaging for zero documents on dashboard. | Helpful prompt to upload first PDF. |
| 7.3 | Add global error/toast handling (sonner or similar). | API errors surface as toasts; network failures handled. |
| 7.4 | Build `GET /api/profile` + plan badge in header. | Shows plan name; Free sees upgrade prompt. |
| 7.5 | Full manual end-to-end test on deployed Vercel URL — signup, upload, generate, view outputs, plan limits. | All acceptance criteria (§17) pass on production URL. |
