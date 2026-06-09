"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "../components/PriorityBadge";
import { CreateFeatureDialog } from "../components/CreateFeatureDialog";
import {
    ArrowLeft,
    Sparkles,
    Plus,
    Loader2,
    PackagePlus,
    AlertCircle
} from "lucide-react";
import { useFeaturesPage } from "../hook/useFeaturesPage";

interface FeaturesPageProps {
    ideaId: string;
}

export function FeaturesPage({ ideaId }: FeaturesPageProps) {
    const router = useRouter();
    const {
        features,
        isLoading,
        isExtracting,
        createDialogOpen,
        error,
        setCreateDialogOpen,
        handleExtractFeatures,
        addFeatureOptimistically,
    } = useFeaturesPage(ideaId);

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            {/* Header */}
            <Link
                href={`/ideas/${ideaId}`}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Idea
            </Link>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Features &amp; Tasks</h1>
                    <p className="text-muted-foreground">
                        Break down your idea into manageable features and actionable tasks
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <Button
                    onClick={handleExtractFeatures}
                    disabled={isExtracting}
                    size="lg"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Extracting Features...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Extract Features with AI
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCreateDialogOpen(true)}
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Feature Manually
                </Button>
            </div>

            {/* Create Feature Dialog */}
            <CreateFeatureDialog
                ideaId={ideaId}
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onFeatureCreated={addFeatureOptimistically}
            />

            {/* Features Grid */}
            {features.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-16">
                        <div className="text-center space-y-4">
                            <PackagePlus className="h-16 w-16 mx-auto text-muted-foreground/50" />
                            <div>
                                <h3 className="font-semibold text-lg mb-1">No features yet</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Extract features from your PRD/BRD documents using AI, or create them manually.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature) => (
                        <Card
                            key={feature.id}
                            className="hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => router.push(`/ideas/${ideaId}/features/${feature.id}`)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                                        {feature.title}
                                    </CardTitle>
                                    <PriorityBadge priority={feature.priority} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                    {feature.description}
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="capitalize">{feature.source.replace('_', ' ')}</span>
                                    <span>{new Date(feature.createdAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
