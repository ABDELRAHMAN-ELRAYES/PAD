import { useState, useEffect, useCallback } from "react";
import { featureApi } from "../api/features.api";
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
    const [features, setFeatures] = useState<Feature[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExtracting, setIsExtracting] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFeatures = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await featureApi.getByIdea(ideaId);
            setFeatures(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load features");
        } finally {
            setIsLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        if (ideaId) {
            loadFeatures();
        }
    }, [ideaId, loadFeatures]);

    const handleExtractFeatures = async () => {
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

    const addFeatureOptimistically = (feature: Feature) => {
        setFeatures((prev) => [...prev, feature]);
    };

    return {
        features,
        isLoading,
        isExtracting,
        createDialogOpen,
        error,
        setCreateDialogOpen,
        setError,
        loadFeatures,
        handleExtractFeatures,
        addFeatureOptimistically,
    };
}
