import { WorkspaceSection } from "@/types/workspace";

export interface WorkspaceSidebarProps {
    activeSection: WorkspaceSection;
    onSectionChange: (section: WorkspaceSection) => void;
    ideaStatus?: string;
}
