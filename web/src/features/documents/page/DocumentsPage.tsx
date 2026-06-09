"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import { useDocumentsPage } from "../hook/useDocumentsPage";

interface DocumentsPageProps {
    ideaId: string;
}

export function DocumentsPage({ ideaId }: DocumentsPageProps) {
    const router = useRouter();
    const {
        idea,
        documents,
        loading,
        generating,
        error,
        handleGenerateDocuments,
    } = useDocumentsPage(ideaId);

    if (loading) {
        return (
            <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading documents...</p>
                </div>
            </div>
        );
    }

    if (error || !idea) {
        return (
            <div className="container mx-auto py-8">
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error || "Idea not found"}</p>
                        <Link href="/ideas">
                            <Button variant="outline" className="mt-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Ideas
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href={`/ideas/${ideaId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Idea
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Documents</h1>
                </div>
                {idea.status === "confirmed" && documents.length === 0 && (
                    <Button onClick={handleGenerateDocuments} disabled={generating}>
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Documents
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Idea Summary */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">Idea Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground line-clamp-3">
                        {idea.refinedText || idea.rawText}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <Badge variant={idea.status === "confirmed" ? "default" : "secondary"}>
                            {idea.status}
                        </Badge>
                        {idea.analysisResult && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                                AI Analyzed
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Documents List */}
            {documents.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        {idea.status !== "confirmed" ? (
                            <>
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium mb-2">Idea Not Confirmed</h3>
                                <p className="text-muted-foreground mb-4">
                                    You need to confirm the idea before generating documents.
                                </p>
                                <Link href={`/ideas/${ideaId}`}>
                                    <Button>Go to Idea Details</Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    Generate PRD and BRD documents from your confirmed idea.
                                </p>
                                <Button onClick={handleGenerateDocuments} disabled={generating}>
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Generate Documents
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {documents.map((doc) => (
                        <Card
                            key={doc.id}
                            className="hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/ideas/${ideaId}/documents/${doc.id}`)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {doc.type === "PRD" ? (
                                            <FileText className="h-8 w-8 text-blue-500" />
                                        ) : (
                                            <FileSpreadsheet className="h-8 w-8 text-green-500" />
                                        )}
                                        <div>
                                            <CardTitle className="text-lg">{doc.title}</CardTitle>
                                            <CardDescription>
                                                {doc.type === "PRD"
                                                    ? "Product Requirements Document"
                                                    : "Business Requirements Document"}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={doc.status === "published" ? "default" : "secondary"}>
                                            {doc.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-muted-foreground text-sm line-clamp-2"
                                    dangerouslySetInnerHTML={{
                                        __html: doc.content.replace(/<[^>]*>/g, ' ').slice(0, 200) + '...'
                                    }}
                                />
                                <p className="text-xs text-muted-foreground mt-3">
                                    Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
