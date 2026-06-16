import { Bubble } from "./bubble";

export function ScantronFooter() {
  return (
    <footer className="mt-20 border-t-2 border-scantron-line pt-4">
      <div className="flex items-center justify-between font-mono text-[10px] text-scantron-bubble/30">
        <span>EXAMENSE · PREDICTED EXAM FORM 01</span>
        <span>PAGE 1 OF 1</span>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Bubble key={i} size={0.5} />
        ))}
      </div>
    </footer>
  );
}
