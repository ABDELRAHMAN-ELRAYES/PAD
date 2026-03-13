"use client";

import { FC, useState } from "react";
import { ideaApi } from "@/lib/api";
import { Idea, IQuestionAnswer } from "@/lib/types/idea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Brain,
    CheckCircle,
    Clock,
    Loader2,
    AlertTriangle,
    HelpCircle,
    Lightbulb,
    ListChecks,
    Send,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

interface OverviewPanelProps {
    idea: Idea;
    ideaId: string;
    onIdeaUpdate: (idea: Idea) => void;
}

export const OverviewPanel: FC<OverviewPanelProps> = ({
    idea,
    ideaId,
    onIdeaUpdate,
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [hasSubmittedAnswers, setHasSubmittedAnswers] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        missingDetails: true,
        suggestions: false,
        risks: false,
        questions: true,
    });

    const toggleSection = (key: string) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const updated = await ideaApi.analyze(ideaId);
            onIdeaUpdate(updated);
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
            onIdeaUpdate(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm idea");
        } finally {
            setIsConfirming(false);
        }
    };

    const handleSubmitAnswers = async () => {
        if (!idea?.analysisResult?.clarifyingQuestions) return;

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
            const updated = await ideaApi.refine(ideaId, { answers: answersArray });
            onIdeaUpdate(updated);
            setAnswers({});
            setHasSubmittedAnswers(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit answers");
        } finally {
            setIsSubmittingAnswers(false);
        }
    };

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((prev) => ({ ...prev, [index]: value }));
    };

    return (
        <div className="p-6 space-y-5 max-w-3xl mx-auto">
            {/* Status & Title */}
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Idea Overview</h2>
                <Badge variant={idea.status === "confirmed" ? "default" : "secondary"}>
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

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Idea Text */}
            <Card>
                <CardContent className="pt-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {idea.refinedText || idea.rawText}
                    </p>
                </CardContent>
            </Card>

            {/* Actions for Draft */}
            {idea.status === "draft" && (
                <div className="flex gap-3">
                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        variant={idea.analysisResult ? "outline" : "default"}
                        size="sm"
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

                    {idea.analysisResult &&
                        (idea.analysisResult.clarifyingQuestions.length === 0 ||
                            hasSubmittedAnswers) && (
                            <Button
                                onClick={handleConfirm}
                                disabled={isConfirming}
                                size="sm"
                            >
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
                        )}
                </div>
            )}

            {/* Confirmed Banner */}
            {idea.status === "confirmed" && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-green-700 dark:text-green-400 text-sm">
                            Idea Confirmed!
                        </h3>
                        <p className="text-xs text-green-600 dark:text-green-500">
                            Navigate to Documents, Diagrams, Features, or Workflow using the
                            sidebar.
                        </p>
                    </div>
                </div>
            )}

            {/* AI Analysis — Collapsible Sections */}
            {idea.analysisResult && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Brain className="h-4 w-4 text-primary" />
                        AI Analysis
                    </h3>

                    {/* Missing Details */}
                    {idea.analysisResult.missingDetails.length > 0 && (
                        <CollapsibleSection
                            title="Missing Details"
                            icon={<ListChecks className="h-4 w-4" />}
                            color="text-orange-600"
                            isOpen={expandedSections.missingDetails}
                            onToggle={() => toggleSection("missingDetails")}
                            count={idea.analysisResult.missingDetails.length}
                        >
                            <ul className="space-y-1.5">
                                {idea.analysisResult.missingDetails.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-orange-500 mt-0.5">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CollapsibleSection>
                    )}

                    {/* Complementary Suggestions */}
                    {idea.analysisResult.complementarySuggestions.length > 0 && (
                        <CollapsibleSection
                            title="Suggestions"
                            icon={<Lightbulb className="h-4 w-4" />}
                            color="text-green-600"
                            isOpen={expandedSections.suggestions}
                            onToggle={() => toggleSection("suggestions")}
                            count={idea.analysisResult.complementarySuggestions.length}
                        >
                            <ul className="space-y-1.5">
                                {idea.analysisResult.complementarySuggestions.map(
                                    (item, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <span className="text-green-500 mt-0.5">•</span>
                                            <span>{item}</span>
                                        </li>
                                    )
                                )}
                            </ul>
                        </CollapsibleSection>
                    )}

                    {/* Constraints & Risks */}
                    {idea.analysisResult.constraintsAndRisks.length > 0 && (
                        <CollapsibleSection
                            title="Risks"
                            icon={<AlertTriangle className="h-4 w-4" />}
                            color="text-yellow-600"
                            isOpen={expandedSections.risks}
                            onToggle={() => toggleSection("risks")}
                            count={idea.analysisResult.constraintsAndRisks.length}
                        >
                            <ul className="space-y-1.5">
                                {idea.analysisResult.constraintsAndRisks.map(
                                    (item, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span>{item}</span>
                                        </li>
                                    )
                                )}
                            </ul>
                        </CollapsibleSection>
                    )}

                    {/* Clarifying Questions with Inline Answers */}
                    {idea.analysisResult.clarifyingQuestions.length > 0 && (
                        <CollapsibleSection
                            title="Clarifying Questions"
                            icon={<HelpCircle className="h-4 w-4" />}
                            color="text-blue-600"
                            isOpen={expandedSections.questions}
                            onToggle={() => toggleSection("questions")}
                            count={idea.analysisResult.clarifyingQuestions.length}
                        >
                            <div className="space-y-4">
                                {idea.analysisResult.clarifyingQuestions.map(
                                    (question, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                <span className="text-blue-500 mt-0.5 font-medium text-xs">
                                                    Q{idx + 1}:
                                                </span>
                                                <span className="font-medium text-sm">
                                                    {question}
                                                </span>
                                            </div>
                                            {idea.status === "draft" && (
                                                <textarea
                                                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px] resize-y"
                                                    placeholder="Type your answer..."
                                                    value={answers[idx] || ""}
                                                    onChange={(e) =>
                                                        handleAnswerChange(idx, e.target.value)
                                                    }
                                                    disabled={isSubmittingAnswers}
                                                />
                                            )}
                                        </div>
                                    )
                                )}
                                {idea.status === "draft" && (
                                    <Button
                                        onClick={handleSubmitAnswers}
                                        disabled={
                                            isSubmittingAnswers ||
                                            Object.values(answers).every((a) => !a?.trim())
                                        }
                                        className="w-full"
                                        variant="secondary"
                                        size="sm"
                                    >
                                        {isSubmittingAnswers ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Submit Answers & Re-analyze
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CollapsibleSection>
                    )}
                </div>
            )}
        </div>
    );
};

/* — Collapsible Section Helper — */
interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    color: string;
    isOpen: boolean;
    onToggle: () => void;
    count: number;
    children: React.ReactNode;
}

const CollapsibleSection: FC<CollapsibleSectionProps> = ({
    title,
    icon,
    color,
    isOpen,
    onToggle,
    count,
    children,
}) => (
    <div className="border rounded-lg overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
            <span className={color}>{icon}</span>
            <span className={`text-sm font-medium ${color}`}>{title}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                {count}
            </Badge>
            {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
        </button>
        {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
);
