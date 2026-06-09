import { Idea } from "../models/idea";

export interface OverviewPanelProps {
  idea: Idea;
  ideaId: string;
  onIdeaUpdate: (idea: Idea) => void;
}
