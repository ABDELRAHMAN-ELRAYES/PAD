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
    onBack?: () => void;
}

export function FeatureDetailPage({ ideaId, featureId, onBack }: FeatureDetailPageProps) {
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
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!feature) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">Feature Not Found</h3>
                <p className="text-muted-foreground mb-6">The feature you are looking for does not exist or was deleted.</p>
                <Button onClick={onBack || (() => router.push(`/ideas/${ideaId}/features`))} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Features
                </Button>
            </div>
        );
    }

    return (
        <div className="grow flex flex-col min-h-0 h-full overflow-hidden bg-background">
            {/* Sticky Header */}
            <div className="shrink-0 flex items-center justify-between border-b px-6 py-3.5 bg-background">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {onBack ? (
                        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full shrink-0 cursor-pointer">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Link href={`/ideas/${ideaId}/features`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0 cursor-pointer">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                    <div className="truncate space-y-0.5">
                        <h2 className="text-sm font-bold tracking-tight text-foreground truncate">{feature.title}</h2>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <PriorityBadge priority={feature.priority} />
                            {feature.complexity && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 capitalize">
                                    Complexity: {feature.complexity}
                                </span>
                            )}
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                Source: {feature.source.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={handleRegenerateFeature}
                        disabled={isRegenerating}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted/50 cursor-pointer"
                    >
                        {isRegenerating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                        )}
                        <span>Regenerate Feature</span>
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 w-full space-y-6">
                {/* Error Message */}
                {error && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}

                {/* Feature Details Card */}
                <Card className="shadow-xs border rounded-2xl">
                    <CardContent className="p-6 space-y-6">
                        {/* Description */}
                        <div>
                            <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-xs">{feature.description}</p>
                        </div>

                        {/* Business Value & User Value Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t">
                            <div>
                                <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Business Value</h4>
                                <p className="text-foreground/90 text-xs leading-relaxed">{feature.businessValue || "No business value specification provided."}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">User Value</h4>
                                <p className="text-foreground/90 text-xs leading-relaxed">{feature.userValue || "No user value specification provided."}</p>
                            </div>
                        </div>

                        {/* Acceptance Criteria */}
                        {feature.acceptanceCriteria && Array.isArray(feature.acceptanceCriteria) && feature.acceptanceCriteria.length > 0 && (
                            <div className="pt-5 border-t">
                                <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Acceptance Criteria</h4>
                                <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground/80">
                                    {feature.acceptanceCriteria.map((criteria: string, idx: number) => (
                                        <li key={idx} className="leading-relaxed">{criteria}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Technical Scope */}
                        {feature.technicalScope && (
                            <div className="pt-5 border-t">
                                <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Suggested Technical Scope</h4>
                                <div className="bg-muted/50 p-4 rounded-xl border text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {feature.technicalScope}
                                </div>
                            </div>
                        )}

                        {/* Dependencies */}
                        {feature.dependencies && Array.isArray(feature.dependencies) && feature.dependencies.length > 0 && (
                            <div className="pt-5 border-t">
                                <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Depends On</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {feature.dependencies.map((dep: string, idx: number) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-lg border">
                                            {dep}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tasks Section */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                            <ListTodo className="h-5 w-5 text-indigo-500" />
                            <h3 className="text-sm font-bold text-foreground">Tasks</h3>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSuggestTasks}
                                disabled={isSuggesting}
                                size="sm"
                                className="h-8 text-xs gap-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
                            >
                                {isSuggesting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                )}
                                <span>Suggest Tasks</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted/50 cursor-pointer"
                                onClick={() => alert("Manual task creation coming soon!")}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Task</span>
                            </Button>
                        </div>
                    </div>

                    {/* Tasks List */}
                    {tasks.length === 0 ? (
                        <Card className="border-dashed rounded-2xl border-border/80 bg-muted/5">
                            <CardContent className="py-12">
                                <div className="text-center space-y-3">
                                    <div className="p-3 rounded-2xl bg-muted/60 text-muted-foreground/80 w-fit mx-auto">
                                        <ListTodo className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-xs text-foreground">No tasks yet</h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
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
                                    <Card key={task.id} className="hover:border-primary/40 transition-colors shadow-none border">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <h4 className="text-xs font-bold text-foreground leading-snug">{task.title}</h4>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                        {task.description}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 pt-2">
                                                        <StatusBadge status={task.status} />
                                                        <PriorityBadge priority={task.priority} />
                                                        {task.estimatedEffort && (
                                                            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                                                {task.estimatedEffort}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full shrink-0 cursor-pointer">
                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            Mark In Progress
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            Mark Completed
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateTaskStatus(task.id, "blocked")}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            Mark Blocked
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
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
        </div>
    );
}