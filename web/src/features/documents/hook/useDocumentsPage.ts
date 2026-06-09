import { useState, useEffect, useCallback } from "react";
import { Idea, ideaApi } from "@/features/ideas";
import { documentApi } from "../api/documents.api";
import { Document } from "../types/models/documents";
import { toast } from "sonner";

export interface UseDocumentsPageReturn {
    idea: Idea | null;
    documents: Document[];
    loading: boolean;
    generating: boolean;
    error: string | null;
    handleGenerateDocuments: () => Promise<void>;
}

export function useDocumentsPage(ideaId: string): UseDocumentsPageReturn {
    const [idea, setIdea] = useState<Idea | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ideaData, docsData] = await Promise.all([
                ideaApi.getById(ideaId),
                documentApi.getByIdeaId(ideaId),
            ]);
            setIdea(ideaData as any);
            setDocuments(docsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        if (ideaId) {
            fetchData();
        }
    }, [ideaId, fetchData]);

    const handleGenerateDocuments = async () => {
        try {
            setGenerating(true);
            const generatedDocs = await documentApi.generate(ideaId);
            setDocuments(generatedDocs);
            toast.success("Documents generated successfully!");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to generate documents");
        } finally {
            setGenerating(false);
        }
    };

    return {
        idea,
        documents,
        loading,
        generating,
        error,
        handleGenerateDocuments,
    };
}
