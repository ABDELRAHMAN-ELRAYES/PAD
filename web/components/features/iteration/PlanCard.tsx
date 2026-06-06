"use client";

import { FC, useState } from "react";
import { Check, X, Loader2, FileText, GitBranch, ListChecks, Workflow, Zap, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModificationPlan, SuggestionModule, SuggestionActionType } from "@/lib/types/idea";

interface PlanCardProps {
    plan: ModificationPlan;
    ideaId: string;
    onConfirm: (planId: string) => Promise<void>;
    onRollback?: (planId: string) => Promise<void>;
    onDismiss: () => void;
}

const moduleIcons: Record<string, FC<{ className?: string }>> = {
    DOCUMENT: FileText,
    DIAGRAM: GitBranch,
    FEATURE: ListChecks,
    TASK: Zap,
    WORKFLOW: Workflow,
};

const moduleLabels: Record<string, string> = {
    DOCUMENT: "Document",
    DIAGRAM: "Diagram",
    FEATURE: "Feature",
    TASK: "Task",
    WORKFLOW: "Workflow",
};

const actionLabels: Record<string, string> = {
    CREATE: "Create",
    MODIFY: "Modify",
    DELETE: "Delete",
    REGENERATE: "Regenerate",
};

const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    applying: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 animate-pulse",
    applied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    rolled_back: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const actionStatusStyles: Record<string, string> = {
    pending: "text-muted-foreground",
    applying: "text-violet-500 font-semibold animate-pulse",
    applied: "text-green-500 font-semibold",
    failed: "text-red-500 font-semibold",
};

export const PlanCard: FC<PlanCardProps> = ({ plan, ideaId, onConfirm, onRollback, onDismiss }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsConfirming(true);
        setError(null);
        try {
            await onConfirm(plan.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm plan");
        } finally {
            setIsConfirming(false);
        }
    };

    const handleRollback = async () => {
        if (!onRollback) return;
        setIsRollingBack(true);
        setError(null);
        try {
            await onRollback(plan.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rollback plan");
        } finally {
            setIsRollingBack(false);
        }
    };

    const isDraft = plan.status === "draft";
    const isApplying = plan.status === "applying";
    const isApplied = plan.status === "applied";
    const isFailed = plan.status === "failed";
    const isRolledBack = plan.status === "rolled_back";

    return (
        <Card className="border-border/80 bg-background shadow-md max-w-xl mx-auto overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 bg-muted/20 border-b">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-sm font-semibold text-foreground">
                            Modification Plan
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge
                            variant="secondary"
                            className={`text-[10px] px-2 py-0.5 capitalize font-medium ${statusStyles[plan.status] || ""}`}
                        >
                            {plan.status.replace("_", " ")}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                {plan.summary && (
                    <CardDescription className="text-xs font-medium text-foreground mt-1">
                        {plan.summary}
                    </CardDescription>
                )}
            </CardHeader>

            {isExpanded && (
                <CardContent className="px-4 py-3 space-y-3">
                    {plan.explanation && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {plan.explanation}
                        </p>
                    )}

                    {/* Actions list */}
                    {plan.actions && plan.actions.length > 0 && (
                        <div className="space-y-1.5">
                            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Planned Actions ({plan.actions.length})
                            </h4>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                                {plan.actions.map((action) => {
                                    const Icon = moduleIcons[action.module] || FileText;
                                    return (
                                        <div
                                            key={action.id}
                                            className="flex flex-col gap-1 text-xs bg-muted/30 dark:bg-muted/10 border border-border/40 rounded-lg p-2 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/20 bg-primary/5 text-primary">
                                                        {actionLabels[action.actionType] || action.actionType}
                                                    </Badge>
                                                    <span className="font-medium text-foreground">
                                                        {moduleLabels[action.module] || action.module}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] capitalize font-medium ${actionStatusStyles[action.status] || ""}`}>
                                                    {action.status}
                                                </span>
                                            </div>
                                            {action.rationale && (
                                                <p className="text-[10px] text-muted-foreground italic pl-5">
                                                    Reason: {action.rationale}
                                                </p>
                                            )}
                                            {action.error && (
                                                <p className="text-[10px] text-destructive pl-5 font-medium">
                                                    Error: {action.error}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2 font-medium">
                            {error}
                        </p>
                    )}

                    {/* Actions / Buttons */}
                    <div className="flex gap-2 pt-1.5 justify-end">
                        {isDraft && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={handleConfirm}
                                    disabled={isConfirming}
                                    className="h-8 text-xs px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-1.5 shadow-sm"
                                >
                                    {isConfirming ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Confirming...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3 w-3" />
                                            Confirm & Execute
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onDismiss}
                                    disabled={isConfirming}
                                    className="h-8 text-xs font-medium"
                                >
                                    Dismiss
                                </Button>
                            </>
                        )}

                        {isApplying && (
                            <Button
                                size="sm"
                                disabled
                                className="h-8 text-xs px-4 bg-primary/70 text-primary-foreground font-medium flex items-center gap-1.5"
                            >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Applying Plan...
                            </Button>
                        )}

                        {(isApplied || isFailed) && onRollback && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRollback}
                                    disabled={isRollingBack}
                                    className="h-8 text-xs px-3 border-amber-200 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/30 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5"
                                >
                                    {isRollingBack ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Undo2 className="h-3 w-3" />
                                    )}
                                    Undo Changes (Rollback)
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={onDismiss}
                                    disabled={isRollingBack}
                                    className="h-8 text-xs font-medium"
                                >
                                    Close
                                </Button>
                            </>
                        )}

                        {isRolledBack && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={onDismiss}
                                className="h-8 text-xs font-medium"
                            >
                                Close
                            </Button>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};
