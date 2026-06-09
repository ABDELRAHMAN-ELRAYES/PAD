import { Idea } from "@/lib/types/idea";

export interface OverviewPanelProps {
  idea: Idea;
  ideaId: string;
  onIdeaUpdate: (idea: Idea) => void;
}
