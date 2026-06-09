"use client";

import Link from "next/link";
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
import { useDocumentDetailPage } from "../hook/useDocumentDetailPage";

interface DocumentDetailPageProps {
    ideaId: string;
    docId: string;
}

export function DocumentDetailPage({ ideaId, docId }: DocumentDetailPageProps) {
    const {
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
    } = useDocumentDetailPage(ideaId, docId);

    if (loading) {
        return (
            <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading document...</p>
                </div>
            </div>
        );
    }

    if (error || !docData) {
        return (
            <div className="container mx-auto py-8">
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error || "Document not found"}</p>
                        <Link href={`/ideas/${ideaId}/documents`}>
                            <Button variant="outline" className="mt-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Documents
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Top Bar */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/ideas/${ideaId}/documents`}>
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            </Link>
                            <Badge variant={docData.type === "PRD" ? "default" : "secondary"}>
                                {docData.type}
                            </Badge>
                            <Badge variant={docData.status === "published" ? "default" : "outline"}>
                                {docData.status}
                            </Badge>
                            {hasChanges && (
                                <Badge variant="destructive">Unsaved Changes</Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Version History */}
                            <Sheet open={showHistory} onOpenChange={setShowHistory}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <History className="h-4 w-4 mr-2" />
                                        History ({docData.versions?.length || 0})
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
                                            <p className="text-muted-foreground text-center py-8">
                                                No version history yet
                                            </p>
                                        ) : (
                                            docData.versions?.map((version) => (
                                                <Card key={version.id}>
                                                    <CardContent className="py-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium">
                                                                    Version {version.version}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {version.changelog || "No changelog"}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {new Date(version.createdAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRevert(version.version)}
                                                                disabled={reverting !== null}
                                                            >
                                                                {reverting === version.version ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="h-4 w-4" />
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

                            {/* Export */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleExport("markdown")}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Markdown (.md)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("html")}>
                                        <FileCode className="h-4 w-4 mr-2" />
                                        HTML (.html)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        PDF (.pdf)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Regenerate */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Regenerate
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Regenerate Document?</DialogTitle>
                                        <DialogDescription>
                                            This will use AI to generate new content for this document.
                                            Your current version will be saved in the history.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            onClick={handleRegenerate}
                                            disabled={regenerating}
                                        >
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

                            {/* Save */}
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Title */}
                <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-2xl font-bold border-none focus-visible:ring-0 px-0 mb-4"
                    placeholder="Document Title"
                />

                {/* Rich Text Editor */}
                <Card className="py-0">
                    <CardContent className="p-0">
                        <RichTextEditor
                            value={content}
                            onChange={handleContentChange}
                            placeholder="Start writing your document..."
                        />
                    </CardContent>
                </Card>

                {/* Metadata */}
                <div className="mt-6 text-sm text-muted-foreground">
                    <p>Created: {new Date(docData.createdAt).toLocaleString()}</p>
                    <p>Last updated: {new Date(docData.updatedAt).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
