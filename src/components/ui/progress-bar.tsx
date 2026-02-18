import { cn } from "@/lib/utils";
import { tokens } from "@/lib/design-tokens";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max,
  color = tokens.emerald,
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <div
      className={cn(
        "h-[5px] w-full overflow-hidden rounded-full bg-border-light",
        className
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}
