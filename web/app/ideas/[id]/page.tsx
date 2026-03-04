"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ideaApi } from "@/lib/api";
import { Idea, IQuestionAnswer } from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Brain,
    CheckCircle,
    Clock,
    Loader2,
    AlertTriangle,
    HelpCircle,
    Lightbulb,
    ListChecks,
    Send,
    GitBranch,
    Bot
} from "lucide-react";
import Link from "next/link";

export default function IdeaDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ideaId = params.id as string;

    const [idea, setIdea] = useState<Idea | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [hasSubmittedAnswers, setHasSubmittedAnswers] = useState(false);

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

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const updated = await ideaApi.analyze(ideaId);
            setIdea(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to analyze idea");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirm = async () => {
        setIsConfirming(true);
        setError(null);
        try {
            const updated = await ideaApi.confirm(ideaId);
            setIdea(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm idea");
        } finally {
            setIsConfirming(false);
        }
    };

    const handleSubmitAnswers = async () => {
        if (!idea?.analysisResult?.clarifyingQuestions) return;

        // Build answers array from state
        const answersArray: IQuestionAnswer[] = idea.analysisResult.clarifyingQuestions
            .map((question, idx) => ({
                question,
                answer: answers[idx] || "",
            }))
            .filter((qa) => qa.answer.trim().length > 0);

        if (answersArray.length === 0) {
            setError("Please provide at least one answer");
            return;
        }

        setIsSubmittingAnswers(true);
        setError(null);
        try {
            console.log("Submitting answers:", answersArray);
            const updated = await ideaApi.refine(ideaId, { answers: answersArray });
            console.log("Refine response:", updated);
            setIdea(updated);
            setAnswers({}); // Reset answers after successful submission
            setHasSubmittedAnswers(true); // Mark that answers have been submitted
        } catch (err) {
            console.error("Submit error:", err);
            setError(err instanceof Error ? err.message : "Failed to submit answers");
        } finally {
            setIsSubmittingAnswers(false);
        }
    };

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((prev) => ({ ...prev, [index]: value }));
    };

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
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => router.push("/ideas")}>Back to Ideas</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Link
                href="/ideas"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Ideas
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold">Idea Details</h1>
                        <Badge
                            variant={idea.status === "confirmed" ? "default" : "secondary"}
                        >
                            {idea.status === "confirmed" ? (
                                <>
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Confirmed
                                </>
                            ) : (
                                <>
                                    <Clock className="mr-1 h-3 w-3" />
                                    Draft
                                </>
                            )}
                        </Badge>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Idea Content */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">Your Idea</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap">{idea.refinedText || idea.rawText}</p>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            {idea.status === "draft" && (
                <div className="flex gap-3 mb-6">
                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        variant={idea.analysisResult ? "outline" : "default"}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Brain className="mr-2 h-4 w-4" />
                                {idea.analysisResult ? "Re-Analyze" : "Analyze with AI"}
                            </>
                        )}
                    </Button>

                    {idea.analysisResult && (
                        // Only show confirm button if there are no clarifying questions OR answers have been submitted
                        (idea.analysisResult.clarifyingQuestions.length === 0 || hasSubmittedAnswers) && (
                            <Button onClick={handleConfirm} disabled={isConfirming}>
                                {isConfirming ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Confirm Idea
                                    </>
                                )}
                            </Button>
                        )
                    )}
                </div>
            )}

            {/* Documents and Diagrams Sections - for confirmed ideas */}
            {idea.status === "confirmed" && (
                <>
                    <Card className="mb-6 border-primary/20 bg-primary/5">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ListChecks className="h-8 w-8 text-primary" />
                                    <div>
                                        <h3 className="font-medium">Generate Documents</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Create PRD and BRD documents from this confirmed idea
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/ideas/${ideaId}/documents`}>
                                    <Button>
                                        View Documents
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Diagrams Section */}
                    <Card className="mb-6 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <GitBranch className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <h3 className="font-medium">Generate Diagrams</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Create ERD, Sequence, and Architecture diagrams
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/ideas/${ideaId}/diagrams`}>
                                    <Button variant="outline">
                                        View Diagrams
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Features & Tasks Section */}
                    <Card className="mb-6 border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ListChecks className="h-8 w-8 text-green-500" />
                                    <div>
                                        <h3 className="font-medium">Features & Tasks</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Break down into features and actionable tasks
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/ideas/${ideaId}/features`}>
                                    <Button variant="outline">
                                        View Features & Tasks
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Workflow Section */}
                    <Card className="mb-6 border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Bot className="h-8 w-8 text-purple-500" />
                                    <div>
                                        <h3 className="font-medium">AI IDE Workflow</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Generate code execution workflow steps for Cursor/Copilot
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/ideas/${ideaId}/workflow`}>
                                    <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-100 hover:text-purple-700 dark:border-purple-800 dark:hover:bg-purple-900/50">
                                        View Workflow
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* AI Analysis Results */}
            {idea.analysisResult && (
                <div className="space-y-4">
                    <Separator />
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        AI Analysis
                    </h2>

                    {/* Missing Details */}
                    {idea.analysisResult.missingDetails.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                                    <ListChecks className="h-4 w-4" />
                                    Missing Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {idea.analysisResult.missingDetails.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-orange-500 mt-1">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Complementary Suggestions */}
                    {idea.analysisResult.complementarySuggestions.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                                    <Lightbulb className="h-4 w-4" />
                                    Complementary Suggestions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {idea.analysisResult.complementarySuggestions.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Constraints & Risks */}
                    {idea.analysisResult.constraintsAndRisks.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    Constraints & Risks
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {idea.analysisResult.constraintsAndRisks.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-yellow-500 mt-1">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Clarifying Questions with Answers */}
                    {idea.analysisResult.clarifyingQuestions.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                                    <HelpCircle className="h-4 w-4" />
                                    Clarifying Questions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {idea.analysisResult.clarifyingQuestions.map((question, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-1 font-medium">Q{idx + 1}:</span>
                                            <span className="font-medium">{question}</span>
                                        </div>
                                        {idea.status === "draft" && (
                                            <textarea
                                                className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-y"
                                                placeholder="Type your answer here..."
                                                value={answers[idx] || ""}
                                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                                disabled={isSubmittingAnswers}
                                            />
                                        )}
                                    </div>
                                ))}
                                {idea.status === "draft" && (
                                    <Button
                                        onClick={handleSubmitAnswers}
                                        disabled={isSubmittingAnswers || Object.values(answers).every((a) => !a?.trim())}
                                        className="w-full mt-4"
                                        variant="secondary"
                                    >
                                        {isSubmittingAnswers ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting & Re-analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Submit Answers & Re-analyze
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Confirmed Success */}
            {idea.status === "confirmed" && (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="py-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div>
                                <h3 className="font-semibold text-green-700 dark:text-green-400">
                                    Idea Confirmed!
                                </h3>
                                <p className="text-sm text-green-600 dark:text-green-500">
                                    This idea is ready for document generation in Module 2.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
