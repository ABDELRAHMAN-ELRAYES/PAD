"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ideaApi } from "@/lib/api";
import { Idea } from "@/lib/types/idea";
import { IterationChat } from "@/components/features/iteration/IterationChat";

export default function IteratePage() {
    const params = useParams();
    const router = useRouter();
    const ideaId = params.id as string;

    const [idea, setIdea] = useState<Idea | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchIdea() {
            try {
                const data = await ideaApi.getById(ideaId);
                setIdea(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load idea");
            } finally {
                setIsLoading(false);
            }
        }
        fetchIdea();
    }, [ideaId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!idea) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <h2 className="text-2xl font-bold mb-2">Idea not found</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                    onClick={() => router.push("/ideas")}
                    className="text-primary underline"
                >
                    Back to Ideas
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <header className="flex items-center gap-3 border-b px-4 py-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <Link
                    href={`/ideas/${ideaId}`}
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Back to idea details"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare className="h-5 w-5 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold truncate">
                            Iterate & Refine
                        </h1>
                        <p className="text-xs text-muted-foreground truncate">
                            {idea.refinedText
                                ? idea.refinedText.substring(0, 80) + (idea.refinedText.length > 80 ? "..." : "")
                                : idea.rawText.substring(0, 80) + (idea.rawText.length > 80 ? "..." : "")}
                        </p>
                    </div>
                </div>

                <Badge variant={idea.status === "confirmed" ? "default" : "secondary"} className="shrink-0">
                    {idea.status}
                </Badge>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-hidden">
                <IterationChat ideaId={ideaId} />
            </main>
        </div>
    );
}
