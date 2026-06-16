import { cn } from "@/lib/utils";
import { Bubble } from "./bubble";

type BubbleGridProps = {
  rows?: number;
  cols?: number;
  filledIndices?: number[];
  className?: string;
};

export function BubbleGrid({
  rows = 6,
  cols = 5,
  filledIndices = [],
  className,
}: BubbleGridProps) {
  const total = rows * cols;
  return (
    <div
      className={cn("grid gap-3", className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Bubble key={i} filled={filledIndices.includes(i)} size={1} />
      ))}
    </div>
  );
}
