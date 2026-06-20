"use client";

import { useRouter } from "next/navigation";
import { useIdea } from "@/features/ideas/api/ideasQueries";
import { useHandoffByIdea } from "../api/workflowQueries";
import { useHandoffStream } from "../hook/useHandoffStream";
import { HandoffWorkspace } from "../components/HandoffWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft,
    Bot,
    Loader2,
    Package,
    FileText,
    Database,
    Code2,
    MapPin,
    AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";


interface WorkflowPageProps {
    ideaId: string;
    isEmbedded?: boolean;
}

const PACKAGE_CONTENTS = [
    { icon: FileText, label: "Technical Specification", desc: "Stack, libraries, env vars" },
    { icon: Database, label: "Database Specification", desc: "Schema, entities, relations" },
    { icon: Code2, label: "API Specification", desc: "Routes, payloads, auth model" },
    { icon: Code2, label: "Coding Standards", desc: "Patterns, naming, structure" },
    { icon: MapPin, label: "Implementation Roadmap", desc: "Ordered, dependency-aware phases" },
];

export function WorkflowPage({ ideaId, isEmbedded = false }: WorkflowPageProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: idea, isLoading: isIdeaLoading } = useIdea(ideaId);
    const { data: handoffPkg, isLoading: isPkgLoading } = useHandoffByIdea(ideaId);

    const { isCompiling, progress, compileLogs, startCompile } = useHandoffStream();

    const isLoading = isIdeaLoading || isPkgLoading;

    const handleCompile = () => {
        startCompile(ideaId, () => {
            queryClient.invalidateQueries({ queryKey: ["handoff", "idea", ideaId] });
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!idea) {
        return (
            <div className={isEmbedded ? "p-4 space-y-4" : "container py-8 max-w-4xl space-y-6"}>
                {!isEmbedded && (
                    <Button variant="ghost" onClick={() => router.push("/ideas")} className="pl-0 text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                )}
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Idea not found.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className={isEmbedded ? "flex flex-col h-full space-y-4 p-4 min-h-0 overflow-hidden" : "container py-6 max-w-7xl space-y-6"}>
            {/* Header */}
            <div className="flex items-start justify-between shrink-0">
                <div>
                    {!isEmbedded && (
                        <Button
                            variant="ghost"
                            onClick={() => router.push(`/ideas/${ideaId}`)}
                            className="pl-0 text-muted-foreground hover:text-foreground mb-2"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Idea
                        </Button>
                    )}
                    <h1 className="text-lg font-bold tracking-tight">AI IDE Handoff Workspace</h1>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        Compile a complete implementation package for AI coding assistants
                    </p>
                </div>
                {handoffPkg && (
                    <div className="text-right text-xs text-muted-foreground mt-1 font-mono">
                        v{handoffPkg.version} ({handoffPkg.status})
                    </div>
                )}
            </div>

            {/* States */}
            {handoffPkg ? (
                // WORKSPACE STATE
                <div className="flex-1 min-h-0" style={isEmbedded ? {} : { height: "calc(100vh - 200px)", minHeight: "500px" }}>
                    <HandoffWorkspace
                        pkg={handoffPkg}
                        isCompiling={isCompiling}
                        progress={progress}
                        compileLogs={compileLogs}
                        onRegenerate={handleCompile}
                    />
                </div>
            ) : (
                // INTAKE STATE
                <ScrollArea className="flex-1 min-h-0">
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
                        <CardContent className="py-12">
                            <div className="max-w-xl mx-auto space-y-8">
                                <div className="text-center space-y-4">
                                    <div className="inline-flex p-4 bg-primary/10 rounded-2xl">
                                        <Package className="w-12 h-12 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold">Compile AI Handoff Package</h2>
                                        <p className="text-muted-foreground mt-1 text-sm max-w-md mx-auto">
                                            PAD will gather all your project artifacts and generate a complete, structured implementation bundle for Cursor, Windsurf, or any AI coding assistant.
                                        </p>
                                    </div>
                                </div>

                                {/* What will be compiled */}
                                <div className="grid gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center mb-1">
                                        What gets compiled
                                    </p>
                                    {PACKAGE_CONTENTS.map(({ icon: Icon, label, desc }) => (
                                        <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border">
                                            <Icon className="w-4 h-4 text-primary shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium leading-tight">{label}</p>
                                                <p className="text-xs text-muted-foreground">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border">
                                        <Bot className="w-4 h-4 text-primary shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium leading-tight">AI_IDE_START_HERE.md + .cursorrules</p>
                                            <p className="text-xs text-muted-foreground">Master entry point and Cursor rules config</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border text-muted-foreground">
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium leading-tight">Research, Documents, Diagrams, Tasks</p>
                                            <p className="text-xs">Packaged verbatim from Modules 1–4</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Compiler log during compile */}
                                {isCompiling && (
                                    <div className="rounded-lg bg-slate-950 p-4 space-y-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            <span className="text-xs text-green-400 font-mono font-semibold">COMPILING</span>
                                            <span className="ml-auto text-xs text-slate-400 font-mono">{progress}%</span>
                                        </div>
                                        {compileLogs.slice(-5).map((log, i) => (
                                            <p key={i} className="text-xs font-mono text-slate-300">{log}</p>
                                        ))}
                                    </div>
                                )}

                                <div className="text-center">
                                    <Button
                                        size="lg"
                                        onClick={handleCompile}
                                        disabled={isCompiling || idea.status !== "confirmed"}
                                        className="gap-2 min-w-[220px]"
                                    >
                                        {isCompiling ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Compiling Package...
                                            </>
                                        ) : (
                                            <>
                                                <Package className="w-4 h-4" />
                                                Compile Handoff Package
                                            </>
                                        )}
                                    </Button>
                                    {idea.status !== "confirmed" && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Idea must be confirmed before compiling
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </ScrollArea>
            )}
        </div>
    );
}
