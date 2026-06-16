type StepCardProps = {
  num: string;
  title: string;
  description: string;
};

export function StepCard({ num, title, description }: StepCardProps) {
  return (
    <div className="border-2 border-scantron-line p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center border-2 border-scantron-bubble font-mono text-xs font-bold text-scantron-bubble">
          {num}
        </span>
        <span className="font-mono text-[10px] text-scantron-red">
          Q{num}
        </span>
      </div>
      <h3 className="font-mono text-sm font-bold text-scantron-bubble">
        {title}
      </h3>
      <p className="mt-1 font-mono text-xs leading-relaxed text-scantron-bubble/60">
        {description}
      </p>
    </div>
  );
}
