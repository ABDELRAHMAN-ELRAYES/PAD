import { useState, useEffect, useCallback } from "react";
import { documentApi } from "../api/documents.api";
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
    const [docData, setDocData] = useState<DocumentWithVersions | null>(null);
    const [loading, setLoading] = useState(true);
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

    const fetchDocument = useCallback(async () => {
        try {
            setLoading(true);
            const doc = await documentApi.getWithVersions(docId);
            setDocData(doc);
            setTitle(doc.title);
            setContent(doc.content);
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load document");
        } finally {
            setLoading(false);
        }
    }, [docId]);

    useEffect(() => {
        if (docId) {
            fetchDocument();
        }
    }, [docId, fetchDocument]);

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

        try {
            setSaving(true);
            const updateData: UpdateDocumentInput = {
                title,
                content,
                changelog: "Manual edit",
            };
            const updated = await documentApi.update(docId, updateData);
            setDocData({ ...docData, ...updated });
            setHasChanges(false);
            toast.success("Document saved successfully!");
            fetchDocument();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save document");
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        try {
            setRegenerating(true);
            const regenerated = await documentApi.regenerate(docId);
            setDocData({ ...docData!, ...regenerated });
            setTitle(regenerated.title);
            setContent(regenerated.content);
            setHasChanges(false);
            toast.success("Document regenerated successfully!");
            fetchDocument();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to regenerate document");
        } finally {
            setRegenerating(false);
        }
    };

    const handleRevert = async (version: number) => {
        try {
            setReverting(version);
            const reverted = await documentApi.revertToVersion(docId, version);
            setDocData({ ...docData!, ...reverted });
            setTitle(reverted.title);
            setContent(reverted.content);
            setHasChanges(false);
            toast.success(`Reverted to version ${version}`);
            fetchDocument();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to revert");
        } finally {
            setReverting(null);
        }
    };

    const handleExport = async (format: "markdown" | "html" | "pdf") => {
        try {
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
                    throw new Error("Failed to generate PDF");
                }
            }

            const blob = await documentApi.export(docId, format);
            const url = URL.createObjectURL(blob);
            const anchor = window.document.createElement("a");
            anchor.href = url;
            anchor.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "markdown" ? "md" : "html"}`;
            anchor.click();
            URL.revokeObjectURL(url);
            toast.success("Document exported!");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        }
    };

    return {
        docData,
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
