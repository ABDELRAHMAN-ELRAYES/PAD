"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArtifact } from "../api/workflowQueries";
import { useUpdateArtifact } from "../api/workflowQueries";
import { HandoffArtifact } from "../types/models/workflow";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";

const MermaidPreview = dynamic(() => import("@/components/layout/MermaidPreview"), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin" /></div>,
});

interface HandoffPreviewCanvasProps {
    artifactId: string | null;
    artifactMeta: HandoffArtifact | undefined;
}

export function HandoffPreviewCanvas({ artifactId, artifactMeta }: HandoffPreviewCanvasProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [copied, setCopied] = useState(false);

    const { data: artifact, isLoading, error } = useArtifact(artifactId);
    const updateMutation = useUpdateArtifact();

    const content = artifact?.content ?? "";

    const handleEdit = () => {
        setEditContent(content);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!artifactId) return;
        updateMutation.mutate(
            { artifactId, data: { content: editContent, changelog: "Manual edit" } },
            {
                onSuccess: () => {
                    setIsEditing(false);
                    toast.success("Saved");
                },
            }
        );
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!artifactId) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">Select a file from the tree</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !artifact) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Failed to load artifact</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground truncate">
                        {artifact.filePath}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide shrink-0">
                        {artifact.fileType}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {!isEditing && artifact.fileType !== "mermaid" && (
                        <>
                            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 gap-1">
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 px-2">
                                <span className="text-xs">Edit</span>
                            </Button>
                        </>
                    )}
                    {isEditing && (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 px-2">
                                <span className="text-xs">Cancel</span>
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="h-7 px-2">
                                <span className="text-xs">{updateMutation.isPending ? "Saving..." : "Save"}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {isEditing ? (
                    <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-full font-mono text-xs border-0 rounded-none resize-none focus-visible:ring-0"
                    />
                ) : artifact.fileType === "mermaid" ? (
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            <MermaidPreview code={content} />
                        </div>
                    </ScrollArea>
                ) : artifact.fileType === "json" ? (
                    <ScrollArea className="h-full">
                        <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950 whitespace-pre-wrap">
                            {(() => {
                                try {
                                    return JSON.stringify(JSON.parse(content), null, 2);
                                } catch {
                                    return content;
                                }
                            })()}
                        </pre>
                    </ScrollArea>
                ) : (
                    <ScrollArea className="h-full">
                        <article className="prose prose-sm dark:prose-invert max-w-none p-6">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </article>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
