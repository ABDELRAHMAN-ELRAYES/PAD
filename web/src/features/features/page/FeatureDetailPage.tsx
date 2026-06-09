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
        error,
        handleSuggestTasks,
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
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <CardTitle className="text-2xl mb-2">{feature.title}</CardTitle>
                            <div className="flex items-center gap-2">
                                <PriorityBadge priority={feature.priority} />
                                <span className="text-xs text-muted-foreground capitalize">
                                    {feature.source.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{feature.description}</p>
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
