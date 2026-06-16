import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type OptionProps = {
  letter: string;
  text: string;
  correct?: boolean;
  children?: React.ReactNode;
};

export function Option({ letter, text, correct = false, children }: OptionProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-2 px-5 py-3 font-mono text-sm transition-colors",
        correct
          ? "border-scantron-bubble bg-scantron-bubble/5"
          : "border-scantron-line bg-transparent hover:border-scantron-bubble/30",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
          correct
            ? "border-scantron-bubble bg-scantron-bubble text-scantron-paper"
            : "border-scantron-line text-scantron-bubble/40",
        )}
      >
        {letter}
      </div>
      <span className={correct ? "font-bold text-scantron-bubble" : "text-scantron-bubble/60"}>
        {text}
      </span>
      {correct && (
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] font-bold text-scantron-red">
          <Check className="h-3 w-3" strokeWidth={3} />
          CORRECT
        </span>
      )}
      {children}
    </div>
  );
}
