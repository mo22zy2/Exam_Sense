# AGENTS.md — ExamSense AI

## State of the repo

Pre-implementation. Only `docs/PRD.md` (authoritative spec) and 5 prompt `.md` files exist. No code, no package.json, no config.

## First steps

1. Scaffold: `npx create-next-app@latest examsense --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"` in parent dir, then move contents into this repo. Add shadcn/ui (`npx shadcn@latest init`) + Supabase JS SDK + `pdf-parse`.
2. Set env vars per `docs/PRD.md` §3: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.

## Key architecture

- **Pipeline driver:** client-driven step chain — dashboard polls `POST /api/jobs/[id]/run-step`. No queue/worker (Vercel Hobby timeout).
- **5 prompt `.md` files at root** → convert to TS string constants in `lib/pipeline/prompts/*.ts`.
- **Step order:** extract → knowledge_base (lecture docs only) → professor_dna (exam docs only) → exam_targets (steps 2+3) → predicted_exam (steps 2+3+4).
- **OpenRouter model** from `OPENROUTER_MODEL` env var. Use `:free`-suffixed models ($0 budget). Free tier: ~20 req/min, 50 req/day (full run = 5 reqs).
- **Storage:** outputs stored as `.md` files in Supabase Storage; `job_outputs` table only stores the storage path pointer.

## Plan gating (single source of truth in `lib/planRules.ts`)

| | Free | Premium |
|---|---|---|
| Max documents | 3 | 25 |
| Max file size | 15 MB | 30 MB |
| Visible outputs | `professor_dna.md`, `predicted_exam.md` | all 5 |

Enforce in exactly two places: upload route (count/size) and outputs route (type allow-list). No payment processor — admin toggles `profiles.plan` in Supabase table editor.

## Directory layout (follow `docs/PRD.md` §11)

```
app/
├── (auth)/login/page.tsx, signup/page.tsx
├── dashboard/page.tsx, jobs/[id]/page.tsx
├── api/documents/upload/route.ts, [id]/route.ts
├── api/jobs/route.ts, [id]/status/route.ts, [id]/run-step/route.ts,
│        [id]/outputs/route.ts, [id]/outputs/[type]/route.ts
├── api/profile/route.ts
└── layout.tsx
components/ui/ (shadcn), DocumentUploader.tsx, DocumentList.tsx,
  JobProgress.tsx, OutputViewer.tsx
lib/
├── supabase/client.ts, server.ts, middleware.ts
├── openrouter.ts
├── pipeline/prompts/*.ts
├── pipeline/orchestrator.ts
└── planRules.ts
supabase/migrations/
```

## Visual design rules

- **Never hand-craft icons.** Use `lucide-react` (already installed) for all icons. No emoji-as-icons, no inline SVG paths, no Unicode symbols as decorative elements. Every icon must be an imported Lucid component.
- **Design tokens** are defined in `app/globals.css` as CSS custom properties under `:root` and registered in `@theme inline` so they are usable as Tailwind classes. Current palette: `scantron-paper`, `scantron-bubble`, `scantron-red`, `scantron-line`.
- **Component library** lives in `components/core/` — reusable UI components extracted from the landing page. Barrel-exported via `index.ts`.

## Security rules

- RLS on every table (`auth.uid() = user_id`). Storage bucket RLS mirrors it (`{user_id}/...` paths).
- All API routes validate session → 401.
- Upload validates PDF by magic bytes (not extension).
- Plan gating is server-side only; never trust client.
- `OPENROUTER_API_KEY` server-only (not in client bundle).

## Edge cases (must handle)

- Scanned/image-only PDF → `extraction_failed`, job continues with remaining docs.
- OpenRouter error/timeout/429 → retry once, then fail job naming the step.
- Job blocked unless ≥1 lecture + ≥1 exam doc.
- Block second job while one is active.
- Combined input > ~80% context window → batch docs per step.
- Chunking: if combined text exceeds ~80% of model's context, batch documents, run prompt per batch, merge results.
