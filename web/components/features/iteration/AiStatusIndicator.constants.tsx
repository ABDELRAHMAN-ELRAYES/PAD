import * as React from "react";
import { GeistThinkingIcon } from "./icons/GeistThinkingIcon";
import { GeistGeneratingIcon } from "./icons/GeistGeneratingIcon";
import { GeistEditingIcon } from "./icons/GeistEditingIcon";

export const PHASE_ICONS: Record<string, React.FC<{ size?: number }>> = {
  thinking: GeistThinkingIcon,
  planning: GeistThinkingIcon,
  validating: GeistThinkingIcon,
  generating: GeistGeneratingIcon,
  editing: GeistEditingIcon,
  applying: GeistEditingIcon,
  syncing: GeistEditingIcon,
};

export const DEFAULT_LABELS: Record<string, string> = {
  thinking: "PAD is thinking…",
  planning: "Planning changes…",
  validating: "Validating plan…",
  editing: "Updating project…",
  applying: "Applying changes…",
  syncing: "Syncing artifacts…",
};
