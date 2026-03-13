"use client";

import { FC, useState } from "react";
import { Check, Loader2, FileText, GitBranch, ListChecks, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { iterationApi } from "@/lib/api";
import { IterationSuggestion, SuggestionModule, SuggestionActionType } from "@/lib/types/idea";

interface SuggestionCardProps {
    suggestion: IterationSuggestion;
    ideaId: string;
    onApproved?: (suggestionId: string) => void;
}

const moduleIcons: Record<SuggestionModule, FC<{ className?: string }>> = {
    DOCUMENT: FileText,
    DIAGRAM: GitBranch,
    FEATURE: ListChecks,
    TASK: Zap,
    WORKFLOW: Workflow,
};

const moduleLabels: Record<SuggestionModule, string> = {
    DOCUMENT: "Document",
    DIAGRAM: "Diagram",
    FEATURE: "Feature",
    TASK: "Task",
    WORKFLOW: "Workflow",
};

const actionLabels: Record<SuggestionActionType, string> = {
    CREATE: "Create",
    MODIFY: "Modify",
    DELETE: "Delete",
    REGENERATE: "Regenerate",
};

const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    applied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const SuggestionCard: FC<SuggestionCardProps> = ({ suggestion, ideaId, onApproved }) => {
    const [isApproving, setIsApproving] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(suggestion.status);
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async () => {
        setIsApproving(true);
        setError(null);
        try {
            const updated = await iterationApi.approveSuggestion(suggestion.id);
            setCurrentStatus(updated.status);
            onApproved?.(suggestion.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to approve suggestion");
        } finally {
            setIsApproving(false);
        }
    };

    return (
        <Card className="border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20">
            <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                        {suggestion.title}
                    </CardTitle>
                    <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0.5 capitalize ${statusStyles[currentStatus] || ""}`}
                    >
                        {currentStatus}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.summary}</p>

                {/* Actions list */}
                {suggestion.actions && suggestion.actions.length > 0 && (
                    <div className="space-y-1">
                        {suggestion.actions.map((action) => {
                            const Icon = moduleIcons[action.module];
                            return (
                                <div
                                    key={action.id}
                                    className="flex items-center gap-2 text-xs text-muted-foreground bg-background/60 rounded-md px-2 py-1.5"
                                >
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-medium">{actionLabels[action.actionType]}</span>
                                    <span>{moduleLabels[action.module]}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-xs text-destructive">{error}</p>
                )}

                {/* Approve button */}
                {currentStatus === "pending" && (
                    <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {isApproving ? (
                            <>
                                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                Applying Changes...
                            </>
                        ) : (
                            <>
                                <Check className="mr-1.5 h-3 w-3" />
                                Approve & Apply Changes
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};
