import Link from "next/link";
import { X } from "lucide-react";
import {
  BubbleGrid,
  ScantronHeader,
  Option,
  StepCard,
  SectionMarker,
  ScantronFooter,
} from "@/components/core";

export default function Home() {
  return (
    <div className="min-h-screen bg-scantron-paper">
      <ScantronHeader />

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* ── HERO ── */}
        <section className="mb-20">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Bubble grid art */}
            <div className="hidden lg:col-span-2 lg:block">
              <BubbleGrid
                rows={6}
                cols={5}
                filledIndices={[0, 2, 5, 8, 12, 13, 15, 19, 22, 24, 27]}
              />
              {/* Erased mark */}
              <div className="mt-4 flex items-center gap-3 pl-2">
                <div className="h-3 w-8 rounded-sm bg-scantron-bubble/10" />
                <span className="flex items-center gap-1 font-mono text-[10px] text-scantron-red">
                  <X className="h-3 w-3" strokeWidth={3} />
                  ERASE COMPLETELY
                </span>
              </div>
            </div>

            {/* Hero content */}
            <div className="lg:col-span-3">
              <span className="inline-block font-mono text-xs text-scantron-bubble/40">
                MULTIPLE CHOICE · 1 QUESTION
              </span>

              <h1 className="mt-4 font-mono text-4xl font-bold leading-tight tracking-tight text-scantron-bubble sm:text-5xl">
                What will your professor test?
              </h1>

              <div className="mt-6 space-y-3">
                <Option
                  letter="A"
                  text="Upload lecture PDFs + past exams"
                />
                <Option
                  letter="B"
                  text="AI analyzes topics and writing style"
                />
                <Option
                  letter="C"
                  text="A predicted exam is generated for you"
                />
                <Option
                  letter="D"
                  text="All of the above"
                  correct
                />
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center bg-scantron-bubble px-8 font-mono text-sm font-bold text-scantron-paper transition-all hover:bg-scantron-bubble/90"
                >
                  SUBMIT &amp; START
                </Link>
                <Link
                  href="/login"
                  className="font-mono text-xs text-scantron-bubble/40 underline underline-offset-4 hover:text-scantron-bubble"
                >
                  Already registered? Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section>
          <SectionMarker label="SECTION I" sublabel="(30% of prediction)" />

          <div className="grid gap-6 sm:grid-cols-3">
            <StepCard
              num="1"
              title="UPLOAD"
              description="Drag your lecture PDFs and past exam files into the tool."
            />
            <StepCard
              num="2"
              title="ANALYZE"
              description="We scan the content and map your professor&apos;s pattern."
            />
            <StepCard
              num="3"
              title="PREDICT"
              description="Download a practice exam built from real tendencies."
            />
          </div>
        </section>

        <ScantronFooter />
      </main>
    </div>
  );
}
