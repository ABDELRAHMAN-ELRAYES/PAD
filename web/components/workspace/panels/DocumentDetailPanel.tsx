"use client";

import { FC, useEffect, useState } from "react";
import { documentApi } from "@/lib/api";
import { DocumentWithVersions, UpdateDocumentInput } from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/editor/text-editor";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Save,
    Loader2,
    History,
    Download,
    RefreshCw,
    FileText,
    FileCode,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentDetailPanelProps {
    docId: string;
    ideaId: string;
    onBack: () => void;
}

export const DocumentDetailPanel: FC<DocumentDetailPanelProps> = ({
    docId,
    ideaId,
    onBack,
}) => {
    const [docData, setDocData] = useState<DocumentWithVersions | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    const [showHistory, setShowHistory] = useState(false);
    const [reverting, setReverting] = useState<number | null>(null);

    useEffect(() => {
        if (docId) fetchDocument();
    }, [docId]);

    const fetchDocument = async () => {
        try {
            setLoading(true);
            const doc = await documentApi.getWithVersions(docId);
            setDocData(doc);
            setTitle(doc.title);
            setContent(doc.content);
            setHasChanges(false);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load document"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        setHasChanges(
            newTitle !== docData?.title || content !== docData?.content
        );
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setHasChanges(
            title !== docData?.title || newContent !== docData?.content
        );
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
            toast.success("Document saved!");
            fetchDocument();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to save"
            );
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
            toast.success("Document regenerated!");
            fetchDocument();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to regenerate"
            );
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
            toast.success(`Reverted to v${version}`);
            fetchDocument();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to revert"
            );
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
                        <div style="padding: 20px; font-family: system-ui, sans-serif; color: #000;">
                            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${title || "Document"}</h1>
                            <div style="font-size: 14px; line-height: 1.6;">${content}</div>
                        </div>
                    `;
                    const opt = {
                        margin: [10, 10, 10, 10],
                        filename: `${title.replace(/[^a-zA-Z0-9]/g, "_") || "document"}.pdf`,
                        image: { type: "jpeg", quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: {
                            unit: "mm",
                            format: "a4",
                            orientation: "portrait",
                        },
                    };
                    toast.info("Generating PDF...");
                    await html2pdf().set(opt).from(element).save();
                    toast.success("PDF downloaded!");
                    return;
                } catch {
                    throw new Error("PDF generation failed");
                }
            }

            const blob = await documentApi.export(docId, format);
            const url = URL.createObjectURL(blob);
            const anchor = window.document.createElement("a");
            anchor.href = url;
            anchor.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "markdown" ? "md" : "html"}`;
            anchor.click();
            URL.revokeObjectURL(url);
            toast.success("Exported!");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Export failed"
            );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !docData) {
        return (
            <div className="p-6 text-center">
                <p className="text-destructive mb-4">{error || "Document not found"}</p>
                <Button variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Documents
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
                        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                        Back
                    </Button>
                    <Badge variant={docData.type === "PRD" ? "default" : "secondary"} className="text-[10px]">
                        {docData.type}
                    </Badge>
                    {hasChanges && (
                        <Badge variant="destructive" className="text-[10px]">Unsaved</Badge>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <Sheet open={showHistory} onOpenChange={setShowHistory}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                <History className="h-3 w-3 mr-1" />
                                History
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Version History</SheetTitle>
                                <SheetDescription>
                                    View and restore previous versions
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                                {docData.versions?.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8 text-sm">
                                        No version history yet
                                    </p>
                                ) : (
                                    docData.versions?.map((version) => (
                                        <Card key={version.id}>
                                            <CardContent className="py-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            Version {version.version}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {version.changelog || "No changelog"}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {new Date(version.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7"
                                                        onClick={() => handleRevert(version.version)}
                                                        disabled={reverting !== null}
                                                    >
                                                        {reverting === version.version ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                <Download className="h-3 w-3 mr-1" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExport("markdown")}>
                                <FileText className="h-4 w-4 mr-2" />
                                Markdown
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("html")}>
                                <FileCode className="h-4 w-4 mr-2" />
                                HTML
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("pdf")}>
                                <FileText className="h-4 w-4 mr-2" />
                                PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Regen
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Regenerate Document?</DialogTitle>
                                <DialogDescription>
                                    AI will generate new content. Current version saved in
                                    history.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button onClick={handleRegenerate} disabled={regenerating}>
                                    {regenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Regenerating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Regenerate
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        size="sm"
                        className="h-7 text-xs"
                    >
                        {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                            <Save className="h-3 w-3 mr-1" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            {/* Document Editor */}
            <div className="flex-1 overflow-y-auto workspace-panel p-4">
                <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-xl font-bold border-none focus-visible:ring-0 px-0 mb-3"
                    placeholder="Document Title"
                />
                <Card className="py-0">
                    <CardContent className="p-0">
                        <RichTextEditor
                            value={content}
                            onChange={handleContentChange}
                            placeholder="Start writing your document..."
                        />
                    </CardContent>
                </Card>
                <div className="mt-4 text-xs text-muted-foreground">
                    <p>Created: {new Date(docData.createdAt).toLocaleString()}</p>
                    <p>Updated: {new Date(docData.updatedAt).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};
