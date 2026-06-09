"use client";

import { FC, useState, useEffect, useCallback } from "react";
import { workflowApi } from "@/lib/api";
import {
    Idea,
    Workflow,
    WorkflowStepStatus,
} from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    Download,
    Loader2,
    PlayCircle,
    AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStreaming } from "@/components/streaming-provider";

import { WorkflowPanelProps } from "./WorkflowPanel.types";

export const WorkflowPanel: FC<WorkflowPanelProps> = ({ ideaId, idea }) => {
    const { setPhaseStreaming } = useStreaming();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [editingStep, setEditingStep] = useState<string | null>(null);
    const [editInstructions, setEditInstructions] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [streamingText, setStreamingText] = useState("");

    const fetchWorkflow = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await workflowApi.getByIdeaId(ideaId);
            setWorkflow(data);
        } catch (err: any) {
            if (err.message && err.message.includes("404")) {
                setWorkflow(null);
            } else {
                setError(err instanceof Error ? err.message : "Failed to load workflow");
            }
        } finally {
            setIsLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        fetchWorkflow();
    }, [fetchWorkflow]);

    useEffect(() => {
        if (isGenerating) {
            setPhaseStreaming("workflow", true);
        } else {
            setPhaseStreaming("workflow", false);
        }
    }, [isGenerating, setPhaseStreaming]);

    const handleGenerate = async () => {
        try {
            setIsGenerating(true);
            setError(null);
            setStreamingText("");
            setPhaseStreaming("workflow", true);

            await workflowApi.generateStream(ideaId, (data) => {
                if (data.chunk) {
                    setStreamingText(data.fullText || (prevText => prevText + data.chunk));
                }

                if (data.status === "final") {
                    setIsGenerating(false);
                    setStreamingText("");
                    if (data.workflow) setWorkflow(data.workflow);
                    setPhaseStreaming("workflow", false);
                }

                if (data.status === "error") {
                    setIsGenerating(false);
                    setError(data.message || "Failed to generate workflow");
                    setPhaseStreaming("workflow", false);
                }
            });
        } catch (err) {
            setIsGenerating(false);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to generate workflow. Ensure features and tasks exist."
            );
            setPhaseStreaming("workflow", false);
        }
    };

    const handleUpdateStepStatus = async (
        stepId: string,
        newStatus: WorkflowStepStatus
    ) => {
        try {
            await workflowApi.updateStep(stepId, { status: newStatus });
            if (workflow?.steps) {
                const updatedSteps = workflow.steps.map((step) =>
                    step.id === stepId ? { ...step, status: newStatus } : step
                );
                setWorkflow({ ...workflow, steps: updatedSteps });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status");
        }
    };

    const handleSaveInstructions = async (stepId: string) => {
        setIsSaving(true);
        try {
            await workflowApi.updateStep(stepId, {
                instructions: editInstructions,
                changelog: "Manual edit",
            });
            if (workflow?.steps) {
                const updatedSteps = workflow.steps.map((step) =>
                    step.id === stepId
                        ? { ...step, instructions: editInstructions }
                        : step
                );
                setWorkflow({ ...workflow, steps: updatedSteps });
            }
            setEditingStep(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to save instructions"
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!workflow) return;
        try {
            const markdown = await workflowApi.export(workflow.id);
            await navigator.clipboard.writeText(markdown);
            alert(
                "Copied to clipboard! Paste into Cursor or GitHub Copilot."
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export");
        }
    };

    const getStatusIcon = (status: WorkflowStepStatus) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case "in_progress":
                return <PlayCircle className="w-4 h-4 text-blue-500" />;
            case "blocked":
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case "failed":
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return (
                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                );
        }
    };

    const getStatusBadge = (status: WorkflowStepStatus) => {
        switch (status) {
            case "completed":
                return (
                    <Badge variant="default" className="bg-green-500 text-[10px]">
                        Done
                    </Badge>
                );
            case "in_progress":
                return (
                    <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px]"
                    >
                        Active
                    </Badge>
                );
            case "blocked":
                return (
                    <Badge
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 text-[10px]"
                    >
                        Blocked
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="destructive" className="text-[10px]">
                        Failed
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-slate-500 text-[10px]">
                        Pending
                    </Badge>
                );
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
                <h2 className="text-xl font-bold">AI Workflow</h2>
                {workflow && (
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!workflow ? (
                <Card className="border-primary/20 bg-primary/5 text-center py-10">
                    <CardContent className="space-y-4 flex flex-col items-center">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Bot className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                            <h3 className="text-base font-semibold">Ready to code?</h3>
                            <p className="text-sm text-muted-foreground">
                                Generate step-by-step AI IDE instructions from your tasks.
                            </p>
                            {isGenerating && streamingText && (
                                <div className="mt-4 p-3 bg-slate-950 text-slate-50 rounded-md text-left w-full overflow-hidden h-32 opacity-80">
                                    <p className="text-[10px] text-primary/70 mb-1 animate-pulse font-mono">AI is writing steps...</p>
                                    <pre className="text-[10px] font-mono whitespace-pre-wrap">
                                        {streamingText}
                                    </pre>
                                </div>
                            )}
                            {!isGenerating && (
                                <p className="text-[10px] text-muted-foreground pt-1">
                                    * Requires features and tasks first
                                </p>
                            )}
                        </div>
                        <Button
                            onClick={handleGenerate}
                            disabled={
                                isGenerating || idea.status !== "confirmed"
                            }
                            className="gap-2"
                            size="sm"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Bot className="w-4 h-4" />
                                    Generate Workflow
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {workflow.steps?.map((step) => {
                        const isExpanded = expandedStep === step.id;
                        const isEditing = editingStep === step.id;

                        return (
                            <Card
                                key={step.id}
                                className={`transition-all duration-200 border-l-4 ${
                                    step.status === "completed"
                                        ? "border-l-green-500"
                                        : step.status === "in_progress"
                                          ? "border-l-blue-500 shadow-md"
                                          : step.status === "blocked"
                                            ? "border-l-yellow-500"
                                            : step.status === "failed"
                                              ? "border-l-red-500"
                                              : "border-l-slate-300 dark:border-l-slate-700"
                                }`}
                            >
                                <div
                                    className="flex items-center p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() =>
                                        !isEditing &&
                                        setExpandedStep(
                                            isExpanded ? null : step.id
                                        )
                                    }
                                >
                                    <div className="shrink-0 mr-3">
                                        {getStatusIcon(step.status)}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-3">
                                        <h3 className="font-semibold text-sm truncate">
                                            {step.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {step.description}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        {getStatusBadge(step.status)}
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t">
                                        <div className="flex items-center justify-between mb-3 mt-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium">
                                                    Status:
                                                </span>
                                                <Select
                                                    value={step.status}
                                                    onValueChange={(val) =>
                                                        handleUpdateStepStatus(
                                                            step.id,
                                                            val as WorkflowStepStatus
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-[140px] h-7 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">
                                                            Pending
                                                        </SelectItem>
                                                        <SelectItem value="in_progress">
                                                            In Progress
                                                        </SelectItem>
                                                        <SelectItem value="completed">
                                                            Completed
                                                        </SelectItem>
                                                        <SelectItem value="blocked">
                                                            Blocked
                                                        </SelectItem>
                                                        <SelectItem value="failed">
                                                            Failed
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {!isEditing && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        setEditInstructions(
                                                            step.instructions
                                                        );
                                                        setEditingStep(step.id);
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                        </div>

                                        {step.dependencies &&
                                            step.dependencies.length > 0 && (
                                                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-900/50">
                                                    <div className="flex items-center text-amber-800 dark:text-amber-400 text-xs font-medium mb-1">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Dependencies
                                                    </div>
                                                    <ul className="list-disc pl-6 text-xs text-amber-700 dark:text-amber-500">
                                                        {step.dependencies.map(
                                                            (dep) => (
                                                                <li key={dep.id}>
                                                                    {dep.dependsOn
                                                                        ?.title ||
                                                                        `Step ${dep.dependsOnStepId}`}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            )}

                                        <div className="space-y-1.5">
                                            <h4 className="font-medium text-xs flex items-center">
                                                <Bot className="w-3 h-3 mr-1 text-primary" />
                                                AI Instructions
                                            </h4>

                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <Textarea
                                                        value={editInstructions}
                                                        onChange={(e) =>
                                                            setEditInstructions(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="min-h-[150px] font-mono text-xs"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setEditingStep(null)
                                                            }
                                                            disabled={isSaving}
                                                            className="h-7 text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleSaveInstructions(
                                                                    step.id
                                                                )
                                                            }
                                                            disabled={isSaving}
                                                            className="h-7 text-xs"
                                                        >
                                                            {isSaving && (
                                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            )}
                                                            Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-950 text-slate-50 p-3 rounded-md overflow-x-auto relative group">
                                                    <pre className="text-xs font-mono whitespace-pre-wrap">
                                                        {step.instructions}
                                                    </pre>
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await navigator.clipboard.writeText(
                                                                step.instructions
                                                            );
                                                        }}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="12"
                                                            height="12"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <rect
                                                                width="14"
                                                                height="14"
                                                                x="8"
                                                                y="8"
                                                                rx="2"
                                                                ry="2"
                                                            />
                                                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                                        </svg>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
