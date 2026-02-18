import { tokens } from "@/lib/design-tokens";
import { ProgressBar } from "./progress-bar";

interface OutcomeRowProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

export function OutcomeRow({
  label,
  value,
  max,
  color = tokens.emerald,
}: OutcomeRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[90px] shrink-0 text-right text-xs text-text-muted">
        {label}
      </span>
      <div className="flex-1">
        <ProgressBar value={value} max={max} color={color} />
      </div>
      <span className="w-[30px] text-right text-xs tabular-nums text-text-muted">
        {value}
      </span>
    </div>
  );
}
