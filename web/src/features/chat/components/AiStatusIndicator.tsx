import { cn } from "@/lib/utils";
import { AiStatusIndicatorProps, AiPhase } from "../types/components/AiStatusIndicator.types";
import { PHASE_ICONS, DEFAULT_LABELS } from "./AiStatusIndicator.constants";

export type { AiPhase, AiStatusIndicatorProps };

export function AiStatusIndicator({ phase, label, className }: AiStatusIndicatorProps) {
  if (phase === "idle" || phase === "error") return null;

  const IconComponent = PHASE_ICONS[phase];
  const iconSize = phase === "generating" ? 46 : 36;
  const displayLabel = label || DEFAULT_LABELS[phase];

  return (
    <div className={cn("flex items-center gap-3 text-foreground opacity-80 dark:opacity-100 dark:text-muted-foreground", className)}>
      {IconComponent && <IconComponent size={iconSize} />}

      {displayLabel && (
        <span className="text-sm font-medium">
          {displayLabel}
        </span>
      )}
    </div>
  );
}
