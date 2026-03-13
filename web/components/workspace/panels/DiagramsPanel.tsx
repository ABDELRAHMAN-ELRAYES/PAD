"use client";

import { FC, useEffect, useState, useCallback } from "react";
import { diagramApi } from "@/lib/api";
import { Diagram, DiagramType } from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    RefreshCw,
    Save,
    Sparkles,
    Database,
    GitBranch,
    Workflow,
} from "lucide-react";

import dynamic from "next/dynamic";

const MermaidPreview = dynamic(
    () => import("@/components/mermaid-preview").then((mod) => mod.default),
    { ssr: false, loading: () => <div className="p-4 text-center text-sm text-muted-foreground">Loading preview...</div> }
);

const DIAGRAM_ICONS: Record<DiagramType, React.ReactNode> = {
    ERD: <Database className="h-4 w-4" />,
    SEQUENCE: <GitBranch className="h-4 w-4" />,
    SCHEMA: <Workflow className="h-4 w-4" />,
    FLOWCHART: <Sparkles className="h-4 w-4" />,
};

const DIAGRAM_LABELS: Record<DiagramType, string> = {
    ERD: "ERD",
    SEQUENCE: "Sequence",
    SCHEMA: "Architecture",
    FLOWCHART: "Flowchart",
};

interface DiagramsPanelProps {
    ideaId: string;
}

export const DiagramsPanel: FC<DiagramsPanelProps> = ({ ideaId }) => {
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [editedCode, setEditedCode] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<string>("ERD");

    const fetchData = useCallback(async () => {
        try {
            const diagramsData = await diagramApi.getByIdeaId(ideaId);
            setDiagrams(diagramsData);

            const codeMap: Record<string, string> = {};
            diagramsData.forEach((d) => {
                codeMap[d.id] = d.mermaidCode;
            });
            setEditedCode(codeMap);

            if (diagramsData.length > 0) {
                setActiveTab(diagramsData[0].type);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load diagrams");
        } finally {
            setIsLoading(false);
        }
    }, [ideaId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const generated = await diagramApi.generate(ideaId);
            setDiagrams(generated);

            const codeMap: Record<string, string> = {};
            generated.forEach((d) => {
                codeMap[d.id] = d.mermaidCode;
            });
            setEditedCode(codeMap);

            if (generated.length > 0) setActiveTab(generated[0].type);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate diagrams");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (diagram: Diagram) => {
        const newCode = editedCode[diagram.id];
        if (newCode === diagram.mermaidCode) return;

        setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
        try {
            const updated = await diagramApi.update(diagram.id, {
                mermaidCode: newCode,
                changelog: "Manual edit",
            });
            setDiagrams((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
        }
    };

    const handleRegenerate = async (diagram: Diagram) => {
        setIsSaving((prev) => ({ ...prev, [diagram.id]: true }));
        try {
            const updated = await diagramApi.regenerate(diagram.id);
            setDiagrams((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            setEditedCode((prev) => ({ ...prev, [diagram.id]: updated.mermaidCode }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to regenerate");
        } finally {
            setIsSaving((prev) => ({ ...prev, [diagram.id]: false }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    const getDiagramByType = (type: string): Diagram | undefined =>
        diagrams.find((d) => d.type === type);

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Diagrams</h2>
                {diagrams.length === 0 && (
                    <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
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
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {diagrams.length === 0 && !isGenerating ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <h3 className="text-base font-medium mb-1">No Diagrams Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Generate diagrams to visualize your architecture.
                        </p>
                        <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Diagrams
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-3">
                        {(["ERD", "SEQUENCE", "SCHEMA"] as DiagramType[]).map(
                            (type) => {
                                const diagram = getDiagramByType(type);
                                return (
                                    <TabsTrigger
                                        key={type}
                                        value={type}
                                        disabled={!diagram}
                                        className="flex items-center gap-1.5 text-xs"
                                    >
                                        {DIAGRAM_ICONS[type]}
                                        {DIAGRAM_LABELS[type]}
                                    </TabsTrigger>
                                );
                            }
                        )}
                    </TabsList>

                    {(["ERD", "SEQUENCE", "SCHEMA"] as DiagramType[]).map(
                        (type) => {
                            const diagram = getDiagramByType(type);
                            if (!diagram) return null;

                            const hasChanges =
                                editedCode[diagram.id] !== diagram.mermaidCode;
                            const saving = isSaving[diagram.id];

                            return (
                                <TabsContent key={type} value={type}>
                                    <Card>
                                        <CardHeader className="pb-2 px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    {DIAGRAM_ICONS[type]}
                                                    {diagram.title}
                                                </CardTitle>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleRegenerate(diagram)
                                                        }
                                                        disabled={saving}
                                                        className="h-7 text-xs"
                                                    >
                                                        <RefreshCw
                                                            className={`h-3 w-3 mr-1 ${saving ? "animate-spin" : ""}`}
                                                        />
                                                        Regen
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleSave(diagram)
                                                        }
                                                        disabled={saving || !hasChanges}
                                                        className="h-7 text-xs"
                                                    >
                                                        <Save className="h-3 w-3 mr-1" />
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <Separator />
                                        <CardContent className="p-0">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                                                <div className="p-3">
                                                    <h4 className="text-xs font-medium mb-1.5 text-muted-foreground">
                                                        Mermaid Code
                                                    </h4>
                                                    <textarea
                                                        className="w-full h-[400px] font-mono text-xs p-2 border rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                                        value={editedCode[diagram.id] || ""}
                                                        onChange={(e) =>
                                                            setEditedCode((prev) => ({
                                                                ...prev,
                                                                [diagram.id]: e.target.value,
                                                            }))
                                                        }
                                                        spellCheck={false}
                                                    />
                                                </div>
                                                <div className="p-3">
                                                    <h4 className="text-xs font-medium mb-1.5 text-muted-foreground">
                                                        Preview
                                                    </h4>
                                                    <div className="border rounded-md bg-white dark:bg-gray-950 p-3 min-h-[400px] overflow-auto">
                                                        <MermaidPreview
                                                            code={
                                                                editedCode[diagram.id] || ""
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            );
                        }
                    )}
                </Tabs>
            )}
        </div>
    );
};
