import { FC } from "react";
import { FileText, GitBranch, ListChecks, Zap, Workflow } from "lucide-react";



export const moduleIcons: Record<string, FC<{ className?: string }>> = {
    DOCUMENT: FileText,
    DIAGRAM: GitBranch,
    FEATURE: ListChecks,
    TASK: Zap,
    WORKFLOW: Workflow,
};
