import Link from "next/link";
import { Bubble } from "./bubble";

export function ScantronHeader() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between border-b-2 border-scantron-bubble/10 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bubble key={i} size={0.75} />
          ))}
        </div>
        <span className="font-mono text-xs font-bold tracking-widest text-scantron-bubble">
          EXAMENSE
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden font-mono text-[10px] text-scantron-bubble/40 sm:block">
          FORM 01
        </span>
        <Link
          href="/login"
          className="font-mono text-xs font-bold text-scantron-bubble underline underline-offset-4 hover:text-scantron-red"
        >
          SIGN IN
        </Link>
      </div>
    </header>
  );
}
