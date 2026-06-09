"use client";

import { Diagram, DiagramType } from "../types/models/diagrams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Loader2,
    RefreshCw,
    Save,
    Sparkles,
    Database,
    GitBranch,
    Workflow,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useDiagramsPage } from "../hook/useDiagramsPage";

const MermaidPreview = dynamic(
    () => import("@/components/layout/MermaidPreview").then((mod) => mod.default),
    { ssr: false, loading: () => <div className="p-4 text-center">Loading preview...</div> }
);

const DIAGRAM_ICONS: Record<DiagramType, React.ReactNode> = {
    ERD: <Database className="h-4 w-4" />,
    SEQUENCE: <GitBranch className="h-4 w-4" />,
    SCHEMA: <Workflow className="h-4 w-4" />,
    FLOWCHART: <Sparkles className="h-4 w-4" />,
};

const DIAGRAM_LABELS: Record<DiagramType, string> = {
    ERD: "Entity Relationship",
    SEQUENCE: "Sequence Diagram",
    SCHEMA: "Architecture",
    FLOWCHART: "Flowchart",
};

interface DiagramsPageProps {
    ideaId: string;
}

export function DiagramsPage({ ideaId }: DiagramsPageProps) {
    const {
        idea,
        diagrams,
        isLoading,
        isGenerating,
        isSaving,
        error,
        editedCode,
        activeTab,
        streamingCode,
        setActiveTab,
        setError,
        handleGenerate,
        handleSave,
        handleRegenerate,
        handleCodeChange,
    } = useDiagramsPage(ideaId);

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (!idea) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Idea not found</h2>
                    <Link href="/ideas">
                        <Button>Back to Ideas</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const getDiagramByType = (type: string): Diagram | undefined =>
        diagrams.find((d) => d.type === type);

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <Link
                href={`/ideas/${ideaId}`}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Idea
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Diagrams</h1>
                    <p className="text-muted-foreground">
                        Visual representations of your software architecture
                    </p>
                </div>

                {diagrams.length === 0 && (
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Diagrams
                            </>
                        )}
                    </Button>
                )}
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {diagrams.length === 0 && !isGenerating ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">No Diagrams Yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Generate diagrams to visualize your software architecture
                        </p>
                        <Button onClick={handleGenerate} disabled={isGenerating}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Diagrams
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        {(["ERD", "SEQUENCE", "SCHEMA"] as DiagramType[]).map((type) => {
                            const diagram = getDiagramByType(type);
                            const streaming = streamingCode[type];
                            return (
                                <TabsTrigger
                                    key={type}
                                    value={type}
                                    disabled={!diagram && !streaming}
                                    className="flex items-center gap-2"
                                >
                                    {DIAGRAM_ICONS[type]}
                                    {DIAGRAM_LABELS[type]}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {(["ERD", "SEQUENCE", "SCHEMA"] as DiagramType[]).map((type) => {
                        const diagram = getDiagramByType(type);
                        const streaming = streamingCode[type];

                        if (!diagram && !streaming) return null;

                        const rawCode = streaming || (diagram ? editedCode[diagram.id] : "");
                        const code = rawCode;
                        const saving = diagram ? isSaving[diagram.id] : false;
                        const hasChanges = diagram ? editedCode[diagram.id] !== diagram.mermaidCode : false;

                        return (
                            <TabsContent key={type} value={type}>
                                <Card className={streaming ? "border-primary/20 bg-primary/5" : ""}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {DIAGRAM_ICONS[type]}
                                                {diagram ? diagram.title : `${DIAGRAM_LABELS[type]} (Generating...)`}
                                            </CardTitle>
                                            {diagram && !streaming && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRegenerate(diagram)}
                                                        disabled={saving || isGenerating}
                                                    >
                                                        <RefreshCw className={`h-4 w-4 mr-1 ${saving ? "animate-spin" : ""}`} />
                                                        Regenerate
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSave(diagram)}
                                                        disabled={saving || !hasChanges || isGenerating}
                                                    >
                                                        {saving ? (
                                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <Save className="h-4 w-4 mr-1" />
                                                        )}
                                                        Save
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <Separator />
                                    <CardContent className="p-0">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                                            {/* Editor */}
                                            <div className="p-4">
                                                <h4 className="text-sm font-medium mb-2">Mermaid Code {streaming && "(Streaming...)"}</h4>
                                                <textarea
                                                    className="w-full h-[500px] font-mono text-sm p-3 border rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                                    value={code}
                                                    onChange={(e) => {
                                                        if (diagram) {
                                                            handleCodeChange(diagram.id, e.target.value);
                                                        }
                                                    }}
                                                    disabled={!!streaming}
                                                    spellCheck={false}
                                                />
                                            </div>

                                            {/* Preview */}
                                            <div className="p-4">
                                                <h4 className="text-sm font-medium mb-2">Live Preview</h4>
                                                <div className="border rounded-md bg-white dark:bg-gray-950 p-4 min-h-[500px] overflow-auto">
                                                    <MermaidPreview code={code} />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            )}
        </div>
    );
}
