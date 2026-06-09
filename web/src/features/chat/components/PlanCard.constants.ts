export const moduleLabels: Record<string, string> = {
    DOCUMENT: "Document",
    DIAGRAM: "Diagram",
    FEATURE: "Feature",
    TASK: "Task",
    WORKFLOW: "Workflow",
};

export const actionLabels: Record<string, string> = {
    CREATE: "Create",
    MODIFY: "Modify",
    DELETE: "Delete",
    REGENERATE: "Regenerate",
};

export const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    applying: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 animate-pulse",
    applied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    rolled_back: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export const actionStatusStyles: Record<string, string> = {
    pending: "text-muted-foreground",
    applying: "text-violet-500 font-semibold animate-pulse",
    applied: "text-green-500 font-semibold",
    failed: "text-red-500 font-semibold",
};
