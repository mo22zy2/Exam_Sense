import { cn } from "@/lib/utils";

type BubbleProps = {
  filled?: boolean;
  size?: number;
  className?: string;
};

export function Bubble({ filled = false, size = 4, className }: BubbleProps) {
  return (
    <div
      className={cn(
        "rounded-full border-2 transition-colors",
        filled
          ? "border-scantron-bubble bg-scantron-bubble"
          : "border-scantron-line bg-transparent",
        className,
      )}
      style={{ width: size * 4, height: size * 4 }}
    />
  );
}
