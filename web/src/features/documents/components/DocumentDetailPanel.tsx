"use client";

import { FC, useEffect, useState, useRef } from "react";
import { documentApi } from "../api/documents.api";
import { DocumentWithVersions } from "../types/models/documents";
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
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
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
    Trash2,
    Edit,
    X,
    MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useStreaming } from "@/components/providers/StreamingProvider";
import { cn } from "@/lib/utils";

import { DocumentDetailPanelProps } from "../types/components/DocumentDetailPanel.types";

export const DocumentDetailPanel: FC<DocumentDetailPanelProps> = ({
    docId,
    ideaId,
    onBack,
    autoStream = false,
}) => {
    const { setPhaseStreaming } = useStreaming();
    const [docData, setDocData] = useState<DocumentWithVersions | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isEditMode, setIsEditMode] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    const headerRef = useRef<HTMLDivElement>(null);
    const [headerWidth, setHeaderWidth] = useState(700);

    useEffect(() => {
        if (!headerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setHeaderWidth(entry.contentRect.width);
            }
        });
        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    const [showHistory, setShowHistory] = useState(false);
    const [reverting, setReverting] = useState<number | null>(null);
    const [hasStartedAutoStream, setHasStartedAutoStream] = useState(false);

    useEffect(() => {
        fetchDocument();
    }, [docId]);

    useEffect(() => {
        if (!loading && autoStream && !hasStartedAutoStream && docData) {
            setHasStartedAutoStream(true);
            setIsEditMode(false); // Make sure we view the autostream first
            handleRegenerate();
        }
    }, [loading, autoStream, hasStartedAutoStream, docData]);

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
            setIsEditMode(false); // Switch to View Mode
            toast.success("Document saved successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save document");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (docData) {
            setTitle(docData.title);
            setContent(docData.content);
        }
        setHasChanges(false);
        setIsEditMode(false);
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

    const handleDelete = async () => {
        if (!docData) return;
        if (!window.confirm(`Are you sure you want to delete this ${docData.type} document? This will permanently delete all its version history.`)) {
            return;
        }

        setDeleting(true);
        try {
            await documentApi.delete(docId);
            toast.success("Document deleted successfully");
            onBack();
        } catch (err) {
            toast.error("Failed to delete document");
        } finally {
            setDeleting(false);
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
        <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div ref={headerRef} className="flex items-center justify-between border-b px-6 py-3 shrink-0">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 max-w-xl min-w-0">
                        <Input
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setHasChanges(true);
                            }}
                            readOnly={!isEditMode}
                            className={cn(
                                "bg-transparent text-lg font-bold p-0 h-auto focus-visible:ring-0 shadow-none focus:outline-none w-full truncate text-foreground transition-all duration-200 pb-0.5",
                                isEditMode 
                                    ? "border-b border-border/80 cursor-text" 
                                    : "border-none cursor-default select-none pointer-events-none"
                            )}
                            placeholder="Document Title"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="mr-1 capitalize text-[10px] font-semibold shrink-0">
                        {docData.type}
                    </Badge>
                    
                    {/* View Mode Actions */}
                    {!isEditMode && (
                        headerWidth >= 650 ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowHistory(true)}
                                    className="h-8 text-xs gap-1.5 hover:bg-muted/60"
                                >
                                    <History className="h-3.5 w-3.5" />
                                    History
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 hover:bg-muted/60">
                                            <Download className="h-3.5 w-3.5" />
                                            Export
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleExport("markdown")} className="cursor-pointer">
                                            <FileCode className="h-4 w-4 mr-2" />
                                            Markdown (.md)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport("html")} className="cursor-pointer">
                                            <FileText className="h-4 w-4 mr-2" />
                                            HTML (.html)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRegenerate}
                                    disabled={regenerating || deleting}
                                    className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted/50 cursor-pointer"
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
                                    Regenerate
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={deleting || regenerating}
                                    className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                    {deleting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                    Delete
                                </Button>
                            </>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted/50 cursor-pointer">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setShowHistory(true)} className="cursor-pointer">
                                        <History className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Version History
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem onClick={() => handleExport("markdown")} className="cursor-pointer">
                                        <FileCode className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Export Markdown
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("html")} className="cursor-pointer">
                                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Export HTML
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem 
                                        onClick={handleRegenerate} 
                                        disabled={regenerating || deleting}
                                        className="cursor-pointer"
                                    >
                                        <RefreshCw className={cn("h-4 w-4 mr-2 text-muted-foreground", regenerating && "animate-spin")} />
                                        Regenerate
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem 
                                        onClick={handleDelete} 
                                        disabled={deleting || regenerating}
                                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Document
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )
                    )}

                    {/* Edit Mode Controls */}
                    {isEditMode ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="h-8 text-xs gap-1.5 hover:bg-muted/60 cursor-pointer shrink-0"
                            >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shrink-0"
                            >
                                {saving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                Save
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => setIsEditMode(true)}
                            disabled={regenerating || deleting}
                            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shrink-0"
                        >
                            <Edit className="h-3.5 w-3.5" />
                            <span>Edit Document</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden bg-background">
                {/* Scrollable Document Area (Borderless Full-Page Layout) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <RichTextEditor
                        value={content}
                        onChange={(val) => {
                            setContent(val);
                            setHasChanges(true);
                        }}
                        disabled={!isEditMode || regenerating}
                        placeholder="Write your document details here..."
                        className="w-full"
                        borderless={true}
                    />
                </div>

                {/* AI Generation Full-Page Overlay */}
                {regenerating && (
                    <div className="absolute inset-0 bg-background/75 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300 select-none">
                        <div className="flex flex-col items-center gap-3.5 max-w-sm text-center px-6 py-8 rounded-2xl border bg-card/90 shadow-lg border-border/60">
                            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="font-semibold text-sm">PAD is writing...</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    AI is generating specification details and updating version records. Please wait.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Version History Sheet */}
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
                <SheetContent className="w-[400px] sm:w-[540px] custom-scrollbar overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Version History</SheetTitle>
                        <SheetDescription>
                            View and revert to previous versions of this document.
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-4">
                        {(() => {
                            const currentVersion = docData.versions?.[0]?.version || 0;
                            return docData.versions?.map((version) => (
                                <Card key={version.id} className="relative group overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">v{version.version}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(version.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            {version.version === currentVersion && (
                                                <Badge variant="default" className="bg-green-500 text-[10px] border-none text-white hover:bg-green-600">
                                                    Current
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs font-semibold mb-1 line-clamp-2 leading-relaxed text-foreground/90">
                                            {version.changelog || "No changelog provided"}
                                        </p>
                                        <div className="flex justify-between items-center mt-3 border-t pt-2 border-border/30">
                                            <div className="text-[10px] text-muted-foreground">
                                                {version.content.length} characters
                                            </div>
                                            {version.version !== currentVersion && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                                                            <RotateCcw className="h-3 w-3" />
                                                            Revert
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="rounded-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle>Revert to Version {version.version}</DialogTitle>
                                                            <DialogDescription className="text-xs">
                                                                This will overwrite the current working document with version {version.version}. Any unsaved changes in your current view will be lost.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter className="gap-2">
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" className="rounded-xl text-xs h-9 cursor-pointer">Cancel</Button>
                                                            </DialogTrigger>
                                                            <Button 
                                                                onClick={() => handleRevert(version.version)}
                                                                disabled={reverting !== null}
                                                                className="rounded-xl text-xs h-9 cursor-pointer"
                                                            >
                                                                {reverting === version.version && (
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
                            ));
                        })()}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};
