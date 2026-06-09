import { FC } from "react";
import { FileText, GitBranch, ListChecks, Zap, Workflow } from "lucide-react";

export const statusBadgeStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200",
    applying: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 animate-pulse",
    applied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200",
    rolled_back: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200",
};

export const moduleIcons: Record<string, FC<{ className?: string }>> = {
    DOCUMENT: FileText,
    DIAGRAM: GitBranch,
    FEATURE: ListChecks,
    TASK: Zap,
    WORKFLOW: Workflow,
};
