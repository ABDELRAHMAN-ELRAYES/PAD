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

interface FeaturesPanelProps {
    ideaId: string;
}

export const FeaturesPanel: FC<FeaturesPanelProps> = ({ ideaId }) => {
    const router = useRouter();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExtracting, setIsExtracting] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFeatures();
    }, [ideaId]);

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
        setIsExtracting(true);
        setError(null);
        try {
            const extracted = await featureApi.extractFromDocuments(ideaId);
            setFeatures(extracted);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to extract features");
        } finally {
            setIsExtracting(false);
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
                <h2 className="text-xl font-bold">Features & Tasks</h2>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex gap-2">
                <Button onClick={handleExtract} disabled={isExtracting} size="sm">
                    {isExtracting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extracting...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Extract with AI
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Manually
                </Button>
            </div>

            <CreateFeatureDialog
                ideaId={ideaId}
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onFeatureCreated={(newFeature) => {
                    setFeatures((prev) => [...prev, newFeature]);
                }}
            />

            {features.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <PackagePlus className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <h3 className="text-base font-medium mb-1">No features yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Extract features from your documents using AI, or create
                            them manually.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {features.map((feature) => (
                        <Card
                            key={feature.id}
                            className="hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() =>
                                router.push(`/ideas/${ideaId}/features/${feature.id}`)
                            }
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm group-hover:text-primary transition-colors">
                                        {feature.title}
                                    </CardTitle>
                                    <PriorityBadge priority={feature.priority} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {feature.description}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="capitalize">
                                        {feature.source.replace("_", " ")}
                                    </span>
                                    <span>
                                        {new Date(feature.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
