import { useIdea } from "@/features/ideas/api/ideasQueries";
import { useDocumentsByIdea, useGenerateDocuments } from "../api/documentsQueries";
import { Document } from "../types/models/documents";
import { Idea } from "@/features/ideas";

export interface UseDocumentsPageReturn {
    idea: Idea | null;
    documents: Document[];
    loading: boolean;
    generating: boolean;
    error: string | null;
    handleGenerateDocuments: () => Promise<void>;
}

export function useDocumentsPage(ideaId: string): UseDocumentsPageReturn {
    const { data: idea, isLoading: isIdeaLoading } = useIdea(ideaId);
    const { data: documentsData, isLoading: isDocumentsLoading, refetch: refetchDocs } = useDocumentsByIdea(ideaId);

    const generateMutation = useGenerateDocuments();

    const documents = documentsData || [];
    const loading = isIdeaLoading || isDocumentsLoading;

    const handleGenerateDocuments = async () => {
        generateMutation.mutate(ideaId, {
            onSuccess: () => {
                refetchDocs();
            }
        });
    };

    return {
        idea: idea || null,
        documents,
        loading,
        generating: generateMutation.isPending,
        error: (generateMutation.error as Error)?.message || null,
        handleGenerateDocuments,
    };
}
