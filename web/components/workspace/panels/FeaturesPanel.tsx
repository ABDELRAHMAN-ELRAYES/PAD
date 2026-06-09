"use client";

import { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { featureApi } from "@/lib/api";
import { Feature } from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/features/PriorityBadge";
import { CreateFeatureDialog } from "@/components/features/CreateFeatureDialog";
import {
    Sparkles,
    Plus,
    Loader2,
    PackagePlus,
    AlertCircle,
} from "lucide-react";
import { useStreaming } from "@/components/streaming-provider";

import { FeaturesPanelProps } from "./FeaturesPanel.types";

export const FeaturesPanel: FC<FeaturesPanelProps> = ({ ideaId }) => {
    const router = useRouter();
    const { setPhaseStreaming } = useStreaming();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExtracting, setIsExtracting] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [streamingText, setStreamingText] = useState("");

    useEffect(() => {
        loadFeatures();
    }, [ideaId]);

    useEffect(() => {
        if (isExtracting) {
            setPhaseStreaming("features", true);
        } else {
            setPhaseStreaming("features", false);
        }
    }, [isExtracting, setPhaseStreaming]);

    const loadFeatures = async () => {
        try {
            setIsLoading(true);
            const data = await featureApi.getByIdea(ideaId);
            setFeatures(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load features");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExtract = async () => {
        try {
            setIsExtracting(true);
            setError(null);
            setStreamingText("");
            setPhaseStreaming("features", true);

            await featureApi.extractStream(ideaId, (data) => {
                if (data.chunk) {
                    setStreamingText(data.fullText || (prevText => prevText + data.chunk));
                }

                if (data.status === "final") {
                    setIsExtracting(false);
                    setStreamingText("");
                    if (data.features) setFeatures(data.features);
                    setPhaseStreaming("features", false);
                }

                if (data.status === "error") {
                    setIsExtracting(false);
                    setError(data.message || "Failed to extract features");
                    setPhaseStreaming("features", false);
                }
            });
        } catch (err) {
            setIsExtracting(false);
            setError(err instanceof Error ? err.message : "Failed to extract features");
            setPhaseStreaming("features", false);
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
                    <h2 className="text-xl font-bold">Features</h2>
                    <p className="text-sm text-muted-foreground">
                        Define and manage the core features of your idea.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExtract}
                        disabled={isExtracting}
                    >
                        {isExtracting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Extracting...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                AI Extract
                            </>
                        )}
                    </Button>
                    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Feature
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {isExtracting && streamingText && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                            AI is extracting features...
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="bg-muted/50 rounded-md p-3 font-mono text-xs max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                            {streamingText}
                        </div>
                    </CardContent>
                </Card>
            )}

            {features.length === 0 && !isExtracting ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <PackagePlus className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <h3 className="text-base font-medium mb-1">No Features Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Start by extracting features from your PRD using AI.
                        </p>
                        <Button onClick={handleExtract} variant="outline" size="sm">
                            <Sparkles className="mr-2 h-4 w-4 text-primary" />
                            Extract from PRD
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature) => (
                        <Card
                            key={feature.id}
                            className="hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/ideas/${ideaId}/features/${feature.id}`)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-sm line-clamp-1">
                                        {feature.title}
                                    </CardTitle>
                                    <PriorityBadge priority={feature.priority} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                    {feature.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CreateFeatureDialog
                ideaId={ideaId}
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onFeatureCreated={loadFeatures}
            />
        </div>
    );
};
