"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft,
    Sparkles,
    Plus,
    Loader2,
    ListTodo,
    AlertCircle,
    MoreVertical,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { useFeatureDetailPage } from "../hook/useFeatureDetailPage";

export interface FeatureDetailPageProps {
    ideaId: string;
    featureId: string;
}

export function FeatureDetailPage({ ideaId, featureId }: FeatureDetailPageProps) {
    const router = useRouter();
    const {
        feature,
        tasks,
        isLoading,
        isSuggesting,
        isRegenerating,
        error,
        handleSuggestTasks,
        handleRegenerateFeature,
        handleUpdateTaskStatus,
        handleDeleteTask,
    } = useFeatureDetailPage(featureId);

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!feature) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Feature not found</h2>
                    <Button onClick={() => router.push(`/ideas/${ideaId}/features`)}>
                        Back to Features
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            {/* Header */}
            <Link
                href={`/ideas/${ideaId}/features`}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Features
            </Link>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* Feature Details */}
            <Card className="mb-6 shadow-sm border">
                <CardHeader className="pb-4 border-b">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-2xl font-bold mb-2">{feature.title}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                                <PriorityBadge priority={feature.priority} />
                                {feature.complexity && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 capitalize">
                                        Complexity: {feature.complexity}
                                    </span>
                                )}
                                <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                                    Source: {feature.source.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <Button
                            onClick={handleRegenerateFeature}
                            disabled={isRegenerating}
                            variant="outline"
                            className="shrink-0"
                        >
                            {isRegenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 text-amber-500 animate-pulse" />
                                    Regenerate Feature with AI
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Description */}
                    <div>
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Description</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">{feature.description}</p>
                    </div>

                    {/* Business Value & User Value Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Business Value</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">{feature.businessValue || "No business value specification provided."}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-1.5">User Value</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">{feature.userValue || "No user value specification provided."}</p>
                        </div>
                    </div>

                    {/* Acceptance Criteria */}
                    {feature.acceptanceCriteria && Array.isArray(feature.acceptanceCriteria) && feature.acceptanceCriteria.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Acceptance Criteria</h4>
                            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                                {feature.acceptanceCriteria.map((criteria: string, idx: number) => (
                                    <li key={idx} className="leading-relaxed">{criteria}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Technical Scope */}
                    {feature.technicalScope && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Suggested Technical Scope</h4>
                            <div className="bg-muted/50 p-3.5 rounded-lg border text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {feature.technicalScope}
                            </div>
                        </div>
                    )}

                    {/* Dependencies */}
                    {feature.dependencies && Array.isArray(feature.dependencies) && feature.dependencies.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Depends On</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {feature.dependencies.map((dep: string, idx: number) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded border">
                                        {dep}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tasks Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ListTodo className="h-6 w-6" />
                        Tasks
                    </h2>
                    <div className="flex gap-2">
                        <Button onClick={handleSuggestTasks} disabled={isSuggesting}>
                            {isSuggesting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Suggesting...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Suggest Tasks with AI
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => alert("Manual task creation coming soon!")}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Task
                        </Button>
                    </div>
                </div>

                {/* Tasks List */}
                {tasks.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-12">
                            <div className="text-center space-y-3">
                                <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                <div>
                                    <h3 className="font-semibold mb-1">No tasks yet</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Let AI suggest tasks or create them manually.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {tasks
                            .sort((a, b) => a.order - b.order)
                            .map((task) => (
                                <Card key={task.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold mb-1">{task.title}</h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {task.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <StatusBadge status={task.status} />
                                                    <PriorityBadge priority={task.priority} />
                                                    {task.estimatedEffort && (
                                                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                                                            {task.estimatedEffort}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                                                    >
                                                        Mark In Progress
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                                                    >
                                                        Mark Completed
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleUpdateTaskStatus(task.id, "blocked")}
                                                    >
                                                        Mark Blocked
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="text-destructive"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
