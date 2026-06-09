"use client";

import { FC, useEffect, useState } from "react";
import { planApi } from "@/lib/api";
import { ModificationPlan } from "@/lib/types/idea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    History,
    Loader2,
    Undo2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    FileText,
} from "lucide-react";
import { HistoryPanelProps } from "./HistoryPanel.types";
import { statusBadgeStyles, moduleIcons } from "@/lib/constants/history";

export const HistoryPanel: FC<HistoryPanelProps> = ({ ideaId, onArtifactUpdated }) => {
    const [plans, setPlans] = useState<ModificationPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rollingBackId, setRollingBackId] = useState<string | null>(null);
    const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await planApi.getHistory(ideaId);
            setPlans(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load history");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [ideaId]);

    const handleRollback = async (planId: string) => {
        setRollingBackId(planId);
        setError(null);
        try {
            await planApi.rollback(ideaId, planId);
            await loadHistory();
            onArtifactUpdated?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rollback plan");
        } finally {
            setRollingBackId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <History className="h-5 w-5 text-amber-500" />
                        Change History
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        View previous modification plans and rollback updates.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadHistory}>
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {plans.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <h3 className="text-base font-medium mb-1">No Changes Recorded</h3>
                        <p className="text-sm text-muted-foreground">
                            As you refine your project through chat, modifications will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4 max-w-3xl">
                    {plans.map((plan) => {
                        const isExpanded = expandedPlanId === plan.id;
                        const isRollingBack = rollingBackId === plan.id;
                        const appliedCount = plan.actions.filter(a => a.status === "applied").length;
                        const totalCount = plan.actions.length;

                        return (
                            <Card key={plan.id} className="overflow-hidden hover:border-border/80 transition-colors">
                                <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between gap-4">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <CardTitle className="text-sm font-semibold truncate text-foreground">
                                            {plan.summary || `Modification Plan #${plan.id.slice(-6)}`}
                                        </CardTitle>
                                        <CardDescription className="text-[11px] text-muted-foreground">
                                            Prompt: "{plan.userMessage}" &middot; {new Date(plan.createdAt).toLocaleString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant="secondary"
                                            className={`text-[10px] px-2 py-0.5 capitalize border ${statusBadgeStyles[plan.status] || ""}`}
                                        >
                                            {plan.status.replace("_", " ")}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                                        >
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="p-4 space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Applied Actions ({appliedCount}/{totalCount})
                                            </h4>
                                            <div className="space-y-1.5">
                                                {plan.actions.map((action) => {
                                                    const Icon = moduleIcons[action.module] || FileText;
                                                    return (
                                                        <div
                                                            key={action.id}
                                                            className="flex items-center justify-between gap-3 text-xs bg-muted/30 dark:bg-muted/10 border border-border/40 rounded-lg p-2"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                <span className="font-semibold text-primary uppercase text-[9px] px-1 py-0.5 bg-primary/5 rounded border border-primary/10">
                                                                    {action.actionType}
                                                                </span>
                                                                <span className="font-medium text-foreground truncate">
                                                                    {action.module} ({action.targetId.slice(-6)})
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {action.status === "applied" && (
                                                                    <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                                                                )}
                                                                {action.status === "failed" && (
                                                                    <XCircle className="h-4.5 w-4.5 text-red-500" />
                                                                )}
                                                                <span className="text-[10px] text-muted-foreground capitalize font-medium">
                                                                    {action.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {(plan.status === "applied" || plan.status === "failed") && (
                                            <div className="flex justify-end pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRollback(plan.id)}
                                                    disabled={isRollingBack}
                                                    className="h-8 text-xs border-amber-200 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/30 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5 shadow-sm"
                                                >
                                                    {isRollingBack ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Undo2 className="h-3 w-3" />
                                                    )}
                                                    Rollback this plan
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
