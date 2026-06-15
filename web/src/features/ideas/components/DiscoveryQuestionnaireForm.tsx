import React, { FC, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight } from "lucide-react";

export interface IDiscoveryQuestion {
  id: string;
  type: "text" | "multiple_choice" | "checkbox" | "dropdown";
  label: string;
  description?: string;
  options?: string[];
  required: boolean;
}

interface DiscoveryQuestionnaireFormProps {
  ideaId: string;
  questions: IDiscoveryQuestion[];
  onSubmit: (responses: any[]) => Promise<void>;
}

export const DiscoveryQuestionnaireForm: FC<DiscoveryQuestionnaireFormProps> = ({
  ideaId,
  questions,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValueChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const current = (answers[questionId] as string[]) || [];
    let updated: string[];
    if (checked) {
      updated = [...current, option];
    } else {
      updated = current.filter((o) => o !== option);
    }
    handleValueChange(questionId, updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    const missingFields = questions.filter(
      (q) => q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))
    );

    if (missingFields.length > 0) {
      setError(`الرجاء الإجابة على جميع الأسئلة المطلوبة.`);
      setIsSubmitting(false);
      return;
    }

    // Map answers to the format expected by the backend
    const responses = questions.map((q) => ({
      questionId: q.id,
      label: q.label,
      value: answers[q.id] || "",
    }));

    try {
      await onSubmit(responses);
    } catch (err: any) {
      setError(err?.message || "فشل إرسال الإجابات. الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const answeredCount = questions.filter(
    (q) => answers[q.id] && (!Array.isArray(answers[q.id]) || answers[q.id].length > 0)
  ).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b pb-4 space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">Discovery Questionnaire</h3>
        <p className="text-xs text-muted-foreground">
          Answer these tailored questions to help the AI Deep Research system gather context.
        </p>
        
        {/* Progress Bar */}
        <div className="pt-3 space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Completed Questions</span>
            <span>{answeredCount} / {questions.length} ({progressPercent}%)</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs py-2.5 px-4 rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {questions.map((q, idx) => (
          <Card key={q.id} className="border-border/80 shadow-xs rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground flex items-start gap-1.5 leading-relaxed">
                  <span className="text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary rounded-lg px-2 py-0.5 mt-0.5">
                    Q{idx + 1}
                  </span>
                  <span>{q.label}</span>
                  {q.required && <span className="text-destructive">*</span>}
                </Label>
                {q.description && (
                  <p className="text-[10.5px] text-muted-foreground leading-relaxed pl-10">
                    {q.description}
                  </p>
                )}
              </div>

              <div className="pl-10">
                {q.type === "text" && (
                  <Textarea
                    className="text-xs min-h-[80px] rounded-xl focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/40"
                    placeholder="Enter your response..."
                    value={answers[q.id] || ""}
                    onChange={(e) => handleValueChange(q.id, e.target.value)}
                    required={q.required}
                  />
                )}

                {q.type === "multiple_choice" && q.options && (
                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) => handleValueChange(q.id, val)}
                    required={q.required}
                    className="space-y-2"
                  >
                    {q.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${q.id}-${option}`} className="h-4 w-4" />
                        <Label htmlFor={`${q.id}-${option}`} className="text-xs text-muted-foreground font-normal hover:text-foreground cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === "dropdown" && q.options && (
                  <Select
                    value={answers[q.id] || ""}
                    onValueChange={(val) => handleValueChange(q.id, val)}
                    required={q.required}
                  >
                    <SelectTrigger className="w-full text-xs rounded-xl h-9">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {q.options.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {q.type === "checkbox" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${q.id}-${option}`}
                          checked={((answers[q.id] as string[]) || []).includes(option)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(q.id, option, !!checked)
                          }
                          className="h-4 w-4 rounded-md"
                        />
                        <Label htmlFor={`${q.id}-${option}`} className="text-xs text-muted-foreground font-normal hover:text-foreground cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl py-3 font-semibold shadow-md hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] bg-primary text-primary-foreground text-xs"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting responses...
          </>
        ) : (
          <>
            Submit & Begin Deep Research
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
};
