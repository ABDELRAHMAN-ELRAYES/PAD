export type AiPhase =
  | "idle"
  | "thinking"
  | "generating"
  | "editing"
  | "planning"
  | "validating"
  | "applying"
  | "syncing"
  | "error";

export interface AiStatusIndicatorProps {
  phase: AiPhase;
  label?: string;
  className?: string;
}
