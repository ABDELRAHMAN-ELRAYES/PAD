import { WorkspaceSection } from "@/types/workspace";

export interface AppSidebarProps {
  activeIdeaId: string | null;
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
  onIdeaSelect: (ideaId: string) => void;
  onNewIdea: () => void;
  ideaStatus?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}
