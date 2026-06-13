import { Idea } from "../models/idea";

export interface OverviewPanelProps {
  idea: Idea;
  ideaId: string;
  onIdeaUpdate: (idea: Idea) => void;
  onSectionChange?: (section: "overview" | "documents" | "diagrams" | "features" | "workflow") => void;
}
