import { useState, useEffect } from "react";
import {
    useDocumentWithVersions,
    useUpdateDocument,
    useRegenerateDocument,
    useRevertDocumentVersion,
    useExportDocument,
} from "../api/documentsQueries";
import { DocumentWithVersions, UpdateDocumentInput } from "../types/models/documents";
import { toast } from "sonner";

export interface UseDocumentDetailPageReturn {
    docData: DocumentWithVersions | null;
    loading: boolean;
    saving: boolean;
    regenerating: boolean;
    error: string | null;
    title: string;
    content: string;
    hasChanges: boolean;
    showHistory: boolean;
    reverting: number | null;
    setShowHistory: (show: boolean) => void;
    handleTitleChange: (newTitle: string) => void;
    handleContentChange: (newContent: string) => void;
    handleSave: () => Promise<void>;
    handleRegenerate: () => Promise<void>;
    handleRevert: (version: number) => Promise<void>;
    handleExport: (format: "markdown" | "html" | "pdf") => Promise<void>;
}

export function useDocumentDetailPage(ideaId: string, docId: string): UseDocumentDetailPageReturn {
    const { data: docData, isLoading: loading, refetch: refetchDocument } = useDocumentWithVersions(docId);

    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editable fields
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    // Version history
    const [showHistory, setShowHistory] = useState(false);
    const [reverting, setReverting] = useState<number | null>(null);

    const updateMutation = useUpdateDocument();
    const regenerateMutation = useRegenerateDocument();
    const revertMutation = useRevertDocumentVersion();
    const exportMutation = useExportDocument();

    // Sync state with query data
    useEffect(() => {
        if (docData) {
            setTitle(docData.title);
            setContent(docData.content);
            setHasChanges(false);
        }
    }, [docData]);

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        setHasChanges(newTitle !== docData?.title || content !== docData?.content);
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setHasChanges(title !== docData?.title || newContent !== docData?.content);
    };

    const handleSave = async () => {
        if (!docData) return;

        setSaving(true);
        setError(null);
        const updateData: UpdateDocumentInput = {
            title,
            content,
            changelog: "Manual edit",
        };

        updateMutation.mutate({
            id: docId,
            data: updateData
        }, {
            onSuccess: () => {
                setHasChanges(false);
                toast.success("Document saved successfully!");
                refetchDocument();
            },
            onError: (err: any) => {
                toast.error(err?.message || "Failed to save document");
            },
            onSettled: () => {
                setSaving(false);
            }
        });
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        setError(null);

        regenerateMutation.mutate(docId, {
            onSuccess: (regenerated) => {
                setTitle(regenerated.title);
                setContent(regenerated.content);
                setHasChanges(false);
                toast.success("Document regenerated successfully!");
                refetchDocument();
            },
            onError: (err: any) => {
                toast.error(err?.message || "Failed to regenerate document");
            },
            onSettled: () => {
                setRegenerating(false);
            }
        });
    };

    const handleRevert = async (version: number) => {
        setReverting(version);
        setError(null);

        revertMutation.mutate({
            id: docId,
            version
        }, {
            onSuccess: (reverted) => {
                setTitle(reverted.title);
                setContent(reverted.content);
                setHasChanges(false);
                refetchDocument();
            },
            onError: (err: any) => {
                toast.error(err?.message || "Failed to revert");
            },
            onSettled: () => {
                setReverting(null);
            }
        });
    };

    const handleExport = async (format: "markdown" | "html" | "pdf") => {
        if (format === "pdf") {
            try {
                // @ts-ignore
                const html2pdf = (await import("html2pdf.js")).default;

                const element = document.createElement("div");
                element.innerHTML = `
                    <div style="padding: 20px; font-family: system-ui, -apple-system, sans-serif; color: #000;">
                        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center;">${title || "Document"}</h1>
                        <div style="font-size: 14px; line-height: 1.6;">
                            ${content}
                        </div>
                    </div>
                `;

                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `${title.replace(/[^a-zA-Z0-9]/g, "_") || "document"}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                toast.info("Generating PDF...");
                await html2pdf().set(opt).from(element).save();
                toast.success("PDF downloaded!");
                return;
            } catch (pdfErr) {
                console.error("PDF generation failed:", pdfErr);
                toast.error("Failed to generate PDF");
                return;
            }
        }

        exportMutation.mutate({
            id: docId,
            format
        }, {
            onSuccess: (blob) => {
                const url = URL.createObjectURL(blob);
                const anchor = window.document.createElement("a");
                anchor.href = url;
                anchor.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "markdown" ? "md" : "html"}`;
                anchor.click();
                URL.revokeObjectURL(url);
            }
        });
    };

    return {
        docData: docData || null,
        loading,
        saving,
        regenerating,
        error,
        title,
        content,
        hasChanges,
        showHistory,
        reverting,
        setShowHistory,
        handleTitleChange,
        handleContentChange,
        handleSave,
        handleRegenerate,
        handleRevert,
        handleExport,
    };
}
