import { useState } from "react";
import { useFeaturesByIdea, useExtractFeatures } from "../api/featuresQueries";
import { Feature } from "../types/models/features";

export interface UseFeaturesPageReturn {
    features: Feature[];
    isLoading: boolean;
    isExtracting: boolean;
    createDialogOpen: boolean;
    error: string | null;
    setCreateDialogOpen: (open: boolean) => void;
    setError: (error: string | null) => void;
    loadFeatures: () => Promise<void>;
    handleExtractFeatures: () => Promise<void>;
    addFeatureOptimistically: (feature: Feature) => void;
}

export function useFeaturesPage(ideaId: string): UseFeaturesPageReturn {
    const { data: featuresData, isLoading, refetch: refetchFeatures } = useFeaturesByIdea(ideaId);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extractMutation = useExtractFeatures();

    const features = featuresData || [];

    const loadFeatures = async () => {
        refetchFeatures();
    };

    const handleExtractFeatures = async () => {
        setError(null);
        extractMutation.mutate(ideaId, {
            onSuccess: () => {
                refetchFeatures();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to extract features");
            }
        });
    };

    const addFeatureOptimistically = (_feature: Feature) => {
        refetchFeatures();
    };

    return {
        features,
        isLoading,
        isExtracting: extractMutation.isPending,
        createDialogOpen,
        error: error || (extractMutation.error as Error)?.message || null,
        setCreateDialogOpen,
        setError,
        loadFeatures,
        handleExtractFeatures,
        addFeatureOptimistically,
    };
}
