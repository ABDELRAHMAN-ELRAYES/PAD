"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ideaApi, workflowApi } from "@/lib/api";
import { Idea, Workflow, WorkflowStep, WorkflowStepStatus, UpdateWorkflowStepInput } from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Bot, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, Download, Loader2, PlayCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const WorkflowPage = () => {
    const params = useParams();
    const router = useRouter();
    const ideaId = params.id as string;

    const [idea, setIdea] = useState<Idea | null>(null);
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [editingStep, setEditingStep] = useState<string | null>(null);
    const [editInstructions, setEditInstructions] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if idea is valid and confirmed
            const ideaData = await ideaApi.getById(ideaId);
            setIdea(ideaData);

            if (ideaData.status !== "confirmed") {
                setError("This idea must be confirmed before creating a workflow.");
                setIsLoading(false);
                return;
            }

            // Try to fetch workflow
            try {
                const workflowData = await workflowApi.getByIdeaId(ideaId);
                setWorkflow(workflowData);
            } catch (err: any) {
                // If it's a 404, that's fine, it just hasn't been generated yet
                if (err.message && err.message.includes("404")) {
                    console.log("No workflow found yet.");
                } else {
                    throw err; // Re-throw other errors
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const data = await workflowApi.generate(ideaId);
            setWorkflow(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate workflow. Ensure features and tasks exist (Module 4).");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateStepStatus = async (stepId: string, newStatus: WorkflowStepStatus) => {
        setError(null);
        try {
            const result = await workflowApi.updateStep(stepId, { status: newStatus });

            // Update local state to reflect the change
            if (workflow && workflow.steps) {
                const updatedSteps = workflow.steps.map(step =>
                    step.id === stepId ? { ...step, status: newStatus } : step
                );
                setWorkflow({ ...workflow, steps: updatedSteps });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update step status");
        }
    };

    const handleSaveInstructions = async (stepId: string) => {
        setIsSaving(true);
        setError(null);
        try {
            await workflowApi.updateStep(stepId, {
                instructions: editInstructions,
                changelog: "Manual edit to AI instructions"
            });

            // Update local state
            if (workflow && workflow.steps) {
                const updatedSteps = workflow.steps.map(step =>
                    step.id === stepId ? { ...step, instructions: editInstructions } : step
                );
                setWorkflow({ ...workflow, steps: updatedSteps });
            }
            setEditingStep(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save instructions");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!workflow) return;
        try {
            const markdown = await workflowApi.export(workflow.id);
            // Quick copy to clipboard
            await navigator.clipboard.writeText(markdown);
            alert("Workflow instructions copied to clipboard! You can paste this directly into Cursor or GitHub Copilot.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export workflow");
        }
    };

    const getStatusIcon = (status: WorkflowStepStatus) => {
        switch (status) {
            case "completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case "in_progress": return <PlayCircle className="w-5 h-5 text-blue-500" />;
            case "blocked": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case "failed": return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />;
        }
    };

    const getStatusBadge = (status: WorkflowStepStatus) => {
        switch (status) {
            case "completed": return <Badge variant="default" className="bg-green-500">Completed</Badge>;
            case "in_progress": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">In Progress</Badge>;
            case "blocked": return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Blocked</Badge>;
            case "failed": return <Badge variant="destructive">Failed</Badge>;
            default: return <Badge variant="outline" className="text-slate-500">Pending</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!idea) {
        return (
            <div className="container py-8 max-w-4xl space-y-6">
                <Button variant="ghost" onClick={() => router.push("/ideas")} className="pl-0 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Idea not found.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" onClick={() => router.push(`/ideas/${ideaId}`)} className="pl-0 text-muted-foreground hover:text-foreground mb-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Idea
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">AI Implementation Workflow</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Generate actionable, AI IDE instructions (Cursor/Copilot) based on your tasks.</p>
                </div>
                {workflow && (
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export to IDE
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
                <Card className="border-primary/20 bg-primary/5 text-center py-12">
                    <CardContent className="space-y-6 flex flex-col items-center">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <Bot className="w-12 h-12 text-primary" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h2 className="text-xl font-semibold">Ready to code?</h2>
                            <p className="text-muted-foreground">
                                We will generate a step-by-step workflow customized for AI coding assistants. Each step includes exact instructions on what to write and where.
                            </p>
                            <p className="text-xs text-muted-foreground pt-2">
                                * Requires features and tasks to be defined first (Module 4)
                            </p>
                        </div>
                        <Button
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating || idea.status !== "confirmed"}
                            className="w-full max-w-xs gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating Workflow...
                                </>
                            ) : (
                                <>
                                    <Bot className="w-4 h-4" />
                                    Generate AI Workflow
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground px-2">
                        <span className="w-20 hidden md:inline-block">Order</span>
                        <span className="flex-1">Task & Title</span>
                        <span className="w-32 text-right">Status</span>
                    </div>

                    <div className="space-y-3">
                        {workflow.steps?.map((step) => {
                            const isExpanded = expandedStep === step.id;
                            const isEditing = editingStep === step.id;

                            return (
                                <Card key={step.id} className={`transition-all duration-200 border-l-4 ${step.status === "completed" ? "border-l-green-500" :
                                        step.status === "in_progress" ? "border-l-blue-500 shadow-md" :
                                            step.status === "blocked" ? "border-l-yellow-500" :
                                                step.status === "failed" ? "border-l-red-500" :
                                                    "border-l-slate-300 dark:border-l-slate-700"
                                    }`}>
                                    <div
                                        className="flex items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                        onClick={() => !isEditing && setExpandedStep(isExpanded ? null : step.id)}
                                    >
                                        <div className="w-8 shrink-0 hidden md:flex items-center justify-center text-muted-foreground font-mono">
                                            {step.order}
                                        </div>
                                        <div className="shrink-0 mr-4">
                                            {getStatusIcon(step.status)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h3 className="font-semibold text-lg truncate">{step.title}</h3>
                                            <p className="text-sm text-muted-foreground truncate">{step.description}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center space-x-4">
                                            <div className="hidden sm:block">
                                                {getStatusBadge(step.status)}
                                            </div>
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 pt-2 border-t">

                                            <div className="flex items-center justify-between mb-4 mt-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium">Update Status:</span>
                                                    <Select
                                                        value={step.status}
                                                        onValueChange={(val) => handleUpdateStepStatus(step.id, val as WorkflowStepStatus)}
                                                    >
                                                        <SelectTrigger className="w-[180px] h-8 text-xs">
                                                            <SelectValue placeholder="Status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pending">Pending</SelectItem>
                                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                                            <SelectItem value="completed">Completed</SelectItem>
                                                            <SelectItem value="blocked">Blocked</SelectItem>
                                                            <SelectItem value="failed">Failed</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {!isEditing && (
                                                    <Button variant="outline" size="sm" onClick={() => {
                                                        setEditInstructions(step.instructions);
                                                        setEditingStep(step.id);
                                                    }}>
                                                        Edit Instructions
                                                    </Button>
                                                )}
                                            </div>

                                            {step.dependencies && step.dependencies.length > 0 && (
                                                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-900/50">
                                                    <div className="flex items-center text-amber-800 dark:text-amber-400 text-sm font-medium mb-1">
                                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                                        Dependencies
                                                    </div>
                                                    <ul className="list-disc pl-8 text-sm text-amber-700 dark:text-amber-500">
                                                        {step.dependencies.map(dep => (
                                                            <li key={dep.id}>{dep.dependsOn?.title || `Step ID: ${dep.dependsOnStepId}`}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <h4 className="font-medium text-sm text-foreground flex items-center">
                                                    <Bot className="w-4 h-4 mr-2 text-primary" />
                                                    AI IDE Instructions
                                                </h4>

                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <Textarea
                                                            value={editInstructions}
                                                            onChange={(e) => setEditInstructions(e.target.value)}
                                                            className="min-h-[200px] font-mono text-sm leading-relaxed"
                                                        />
                                                        <div className="flex justify-end space-x-2">
                                                            <Button variant="ghost" onClick={() => setEditingStep(null)} disabled={isSaving}>Cancel</Button>
                                                            <Button onClick={() => handleSaveInstructions(step.id)} disabled={isSaving}>
                                                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                                Save Changes
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto relative group">
                                                        <pre className="text-sm font-mono whitespace-pre-wrap">{step.instructions}</pre>
                                                        <Button
                                                            size="icon"
                                                            variant="secondary"
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                await navigator.clipboard.writeText(step.instructions);
                                                                // Toast is better here, but alert for simplicity
                                                                alert("Copied to clipboard!");
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
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
                </div>
            )}
        </div>
    );
};

export default WorkflowPage;
