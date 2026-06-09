import { SuggestionModule, SuggestionActionType } from "../types/models/chat";

export const moduleLabels: Record<SuggestionModule, string> = {
    DOCUMENT: "Document",
    DIAGRAM: "Diagram",
    FEATURE: "Feature",
    TASK: "Task",
    WORKFLOW: "Workflow",
};

export const actionLabels: Record<SuggestionActionType, string> = {
    CREATE: "Create",
    MODIFY: "Modify",
    DELETE: "Delete",
    REGENERATE: "Regenerate",
};

export const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    applied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    partial: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
