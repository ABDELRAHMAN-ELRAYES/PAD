import * as React from "react";
import { cn } from "@/lib/utils";
import { GeistThinkingIcon } from "./icons/GeistThinkingIcon";
import { GeistGeneratingIcon } from "./icons/GeistGeneratingIcon";
import { GeistEditingIcon } from "./icons/GeistEditingIcon";

export type AiPhase = "idle" | "thinking" | "generating" | "editing" | "planning" | "validating" | "applying" | "syncing" | "error";

interface AiStatusIndicatorProps {
  phase: AiPhase;
  label?: string;
  className?: string;
}

const phaseIcons: Record<string, React.FC<{ size?: number }>> = {
  thinking: GeistThinkingIcon,
  planning: GeistThinkingIcon,
  validating: GeistThinkingIcon,
  generating: GeistGeneratingIcon,
  editing: GeistEditingIcon,
  applying: GeistEditingIcon,
  syncing: GeistEditingIcon,
};

const defaultLabels: Record<string, string> = {
  thinking: "PAD is thinking…",
  planning: "Planning changes…",
  validating: "Validating plan…",
  editing: "Updating project…",
  applying: "Applying changes…",
  syncing: "Syncing artifacts…",
};

export function AiStatusIndicator({ phase, label, className }: AiStatusIndicatorProps) {
  if (phase === "idle" || phase === "error") return null;

  const IconComponent = phaseIcons[phase];
  const iconSize = phase === "generating" ? 46 : 36;
  const displayLabel = label || defaultLabels[phase];

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
