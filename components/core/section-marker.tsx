type SectionMarkerProps = {
  label: string;
  sublabel?: string;
};

export function SectionMarker({ label, sublabel }: SectionMarkerProps) {
  return (
    <div className="mb-8 flex items-center gap-4 border-b-2 border-scantron-line pb-2">
      <span className="font-mono text-xs font-bold text-scantron-red">
        {label}
      </span>
      {sublabel && (
        <span className="font-mono text-[10px] text-scantron-bubble/30">
          {sublabel}
        </span>
      )}
    </div>
  );
}
