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
import { useStreaming } from "@/components/streaming-provider";

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
    const { setPhaseStreaming } = useStreaming();
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
        fetchDocument();
    }, [docId]);

    useEffect(() => {
        if (regenerating) {
            setPhaseStreaming("documents", true);
        } else {
            setPhaseStreaming("documents", false);
        }
    }, [regenerating, setPhaseStreaming]);

    const fetchDocument = async () => {
        try {
            setLoading(true);
            const data = await documentApi.getWithVersions(docId);
            setDocData(data);
            setTitle(data.title);
            setContent(data.content);
        } catch (err) {
            console.error("Failed to fetch document:", err);
            setError("Failed to load document details");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title || !content) return;

        setSaving(true);
        try {
            const updated = await documentApi.update(docId, {
                title,
                content,
                changelog: "Manual edit",
            });
            setDocData(prev => prev ? { ...prev, ...updated } : updated as any);
            setHasChanges(false);
            toast.success("Document saved successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save document");
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        try {
            setRegenerating(true);
            setPhaseStreaming("documents", true);
            
            await documentApi.regenerateStream(docId, (data) => {
                if (data.fullText) {
                    setContent(data.fullText);
                }

                if (data.status === "final") {
                    setRegenerating(false);
                    if (data.document) {
                        setDocData(prev => prev ? { ...prev, ...data.document } : data.document);
                        setTitle(data.document.title);
                        setContent(data.document.content);
                    }
                    setHasChanges(false);
                    setPhaseStreaming("documents", false);
                    toast.success("Document regenerated!");
                }

                if (data.status === "error") {
                    setRegenerating(false);
                    setPhaseStreaming("documents", false);
                    toast.error(data.message || "Regeneration failed");
                }
            });
        } catch (err) {
            setRegenerating(false);
            setPhaseStreaming("documents", false);
            toast.error(err instanceof Error ? err.message : "Regeneration failed");
        }
    };

    const handleRevert = async (versionNumber: number) => {
        setReverting(versionNumber);
        try {
            const updated = await documentApi.revertToVersion(docId, versionNumber);
            setDocData(prev => prev ? { ...prev, ...updated } : updated as any);
            setContent(updated.content);
            setHasChanges(false);
            setShowHistory(false);
            toast.success(`Reverted to version ${versionNumber}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to revert");
        } finally {
            setReverting(null);
        }
    };

    const handleExport = async (format: "markdown" | "html") => {
        try {
            const blob = await documentApi.export(docId, format);
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement("a");
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${format === "markdown" ? "md" : "html"}`;
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error("Export failed");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !docData) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6">
                <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Document</h3>
                <p className="text-muted-foreground mb-6">{error || "Document not found"}</p>
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Documents
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 max-w-xl">
                        <Input
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setHasChanges(true);
                            }}
                            className="bg-transparent border-none text-lg font-bold p-0 h-auto focus-visible:ring-0 shadow-none"
                            placeholder="Document Title"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="mr-2 capitalize">
                        {docData.type}
                    </Badge>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="h-8 text-xs gap-1.5"
                    >
                        <History className="h-3.5 w-3.5" />
                        History
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                                <Download className="h-3.5 w-3.5" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport("markdown")}>
                                <FileCode className="h-4 w-4 mr-2" />
                                Markdown (.md)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport("html")}>
                                <FileText className="h-4 w-4 mr-2" />
                                HTML (.html)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={regenerating || saving}
                        className="h-8 text-xs gap-1.5"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                        Regenerate
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!hasChanges || saving || regenerating}
                        className="h-8 text-xs gap-1.5"
                    >
                        {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-auto p-6 md:p-10 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="max-w-4xl mx-auto">
                    <Card className="shadow-sm border-none md:border">
                        <CardContent className="p-0">
                            <RichTextEditor
                                initialValue={content}
                                value={content}
                                onChange={(val) => {
                                    setContent(val);
                                    setHasChanges(true);
                                }}
                                disabled={regenerating}
                            />
                        </CardContent>
                    </Card>
                    
                    {regenerating && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20 animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            AI is rewriting this document...
                        </div>
                    )}
                </div>
            </div>

            {/* Version History Sheet */}
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle>Version History</SheetTitle>
                        <SheetDescription>
                            View and revert to previous versions of this document.
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-4">
                        {docData.versions?.map((version) => (
                            <Card key={version.id} className="relative group overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">v{version.versionNumber}</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(version.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {version.versionNumber === docData.versionNumber && (
                                            <Badge variant="default" className="bg-green-500 text-[10px]">
                                                Current
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium mb-1 line-clamp-1">
                                        {version.changelog || "No changelog provided"}
                                    </p>
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="text-[10px] text-muted-foreground">
                                            {version.content.length} characters
                                        </div>
                                        {version.versionNumber !== docData.versionNumber && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                                        <RotateCcw className="h-3 w-3" />
                                                        Revert
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Revert to Version {version.versionNumber}</DialogTitle>
                                                        <DialogDescription>
                                                            This will create a new version of the document with the content from version {version.versionNumber}. Any unsaved changes in the current version will be lost.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter>
                                                        <Button variant="ghost" onClick={() => {}}>Cancel</Button>
                                                        <Button 
                                                            onClick={() => handleRevert(version.versionNumber)}
                                                            disabled={reverting !== null}
                                                        >
                                                            {reverting === version.versionNumber && (
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            )}
                                                            Revert Now
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};
