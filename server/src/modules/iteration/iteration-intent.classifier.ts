import AiService from "../ai/ai.service";

/**
 * Hybrid LLM + heuristic intent classifier for iteration messages.
 * Determines whether user wants a discussion (Q&A) or a modification (change request).
 */

export type IterationIntent = "discussion" | "modification" | "ir_modification";

// Patterns that strongly indicate modification intent
const MODIFICATION_PATTERNS: RegExp[] = [
    /\b(add|create|insert|include|introduce)\b.*\b(feature|table|column|field|endpoint|route|page|component|module|step|task|diagram|document|section|entity|relationship|workflow)\b/i,
    /\b(remove|delete|drop|eliminate|get rid of)\b/i,
    /\b(update|change|modify|edit|alter|revise|refactor|rename|replace|rewrite|restructure)\b/i,
    /\b(move|reorder|reorganize|rearrange|swap)\b/i,
    /\b(split|merge|combine|separate|extract)\b/i,
    /\b(regenerate|redo|rebuild)\b/i,
    /\b(set|make)\b.*\b(to|as|into)\b/i,
    /\bcan you (add|change|update|modify|remove|delete|create|rename|replace)\b/i,
    /\bplease (add|change|update|modify|remove|delete|create|rename|replace)\b/i,
    /\bi (want|need|would like)\b.*\b(to add|to change|to update|to modify|to remove|to delete|to create|added|changed|updated)\b/i,
];

// Patterns that strongly indicate discussion intent
const DISCUSSION_PATTERNS: RegExp[] = [
    /\b(explain|describe|tell me about|walk me through|what is|what are|what does|what do)\b/i,
    /\b(why|how come|what was the reason|reasoning behind|rationale)\b/i,
    /\b(how does|how do|how is|how are|how would|how can|how should)\b/i,
    /\b(compare|difference between|similarities|pros and cons|tradeoffs|trade-offs)\b/i,
    /\b(overview|summary|summarize|breakdown|outline)\b/i,
    /\b(is there|are there|does it|do we|do you|did you|will it|can it)\b/i,
    /\b(show me|list|what about)\b/i,
    /^(why|how|what|when|where|who|which|is|are|does|do|did|will|can|could|should|would)\b/i,
];

// Strong modification starters (imperative commands)
const IMPERATIVE_MODIFICATION: RegExp[] = [
    /^(add|create|remove|delete|update|change|modify|rename|replace|move|split|merge|regenerate|insert|drop)\b/i,
];

// Patterns specific to IR modifications (schema, tables, roles, business rules)
const IR_MOD_KEYWORDS = /\b(table|column|field|entity|relationship|business rule|db schema|role|logical module|data model)\b/i;

/**
 * Heuristic classifier - used as scoring fallback or quick check
 */
export function classifyHeuristic(message: string): IterationIntent {
    const trimmed = message.trim();

    // Check imperative commands first (strongest signal)
    for (const pattern of IMPERATIVE_MODIFICATION) {
        if (pattern.test(trimmed)) {
            if (IR_MOD_KEYWORDS.test(trimmed)) {
                return "ir_modification";
            }
            return "modification";
        }
    }

    // Score-based approach for mixed signals
    let modScore = 0;
    let irScore = 0;
    let discScore = 0;

    for (const pattern of MODIFICATION_PATTERNS) {
        if (pattern.test(trimmed)) {
            if (IR_MOD_KEYWORDS.test(trimmed)) {
                irScore++;
            } else {
                modScore++;
            }
        }
    }

    for (const pattern of DISCUSSION_PATTERNS) {
        if (pattern.test(trimmed)) {
            discScore++;
        }
    }

    if (irScore > 0 && irScore >= modScore && irScore > discScore) {
        return "ir_modification";
    }

    // Modification wins only if clearly stronger
    if (modScore > 0 && modScore > discScore) {
        return "modification";
    }

    // Default to discussion (safer)
    return "discussion";
}

/**
 * Classifies the intent of the message. First attempts LLM-based classification,
 * then falls back to heuristics on error or timeout.
 */
export async function classifyIntent(message: string): Promise<IterationIntent> {
    const trimmed = message.trim();
    if (!trimmed) {
        return "discussion";
    }

    try {
        const prompt = `You are a helper classifier. Classify the user message into one of three categories:
1. "ir_modification": User wants to add, create, edit, modify, update, remove, delete, drop, split, merge, or change schema structures, entities, tables, fields, relationships, logical modules, user roles, or business rules in the Intermediate Representation (IR). Examples: "add a transactions table with fields id and amount", "create a one-to-many relationship between users and posts", "add field status to user role", "add business rule for transaction limit", "add user role admin".
2. "modification": User wants to add, create, edit, modify, update, remove, delete, drop, split, merge, or change other artifacts like documents (PRD, BRD), diagrams (flowcharts, sequence diagrams), features, tasks, or workflows. Examples: "add a login feature", "update the flowchart", "delete task 4", "change the PRD".
3. "discussion": User is asking a question, seeking clarification, asking for explanation, outlining, discussing, or anything that does not directly request an edit to the project artifacts. Examples: "how does the payment flow work?", "explain the architecture", "what are the risks?".

Respond with a JSON object exactly like this:
{
  "intent": "ir_modification" | "modification" | "discussion"
}

User Message: "${trimmed.replace(/"/g, '\\"')}"

JSON:`;

        // We wrap the LLM call in a promise timeout to ensure it doesn't block request processing
        const classificationPromise = AiService.callLLM(prompt, true);
        const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("LLM Intent Classification Timeout")), 2500)
        );

        const responseText = await Promise.race([classificationPromise, timeoutPromise]);
        
        // Extract JSON structure if present, or search for string
        const cleanedResponse = responseText.toLowerCase();
        if (cleanedResponse.includes("ir_modification")) {
            return "ir_modification";
        }
        if (cleanedResponse.includes("modification")) {
            return "modification";
        }
        if (cleanedResponse.includes("discussion")) {
            return "discussion";
        }

        try {
            const startIdx = responseText.indexOf("{");
            const endIdx = responseText.lastIndexOf("}");
            if (startIdx !== -1 && endIdx !== -1) {
                const parsed = JSON.parse(responseText.substring(startIdx, endIdx + 1));
                if (parsed.intent === "ir_modification" || parsed.intent === "modification" || parsed.intent === "discussion") {
                    return parsed.intent;
                }
            }
        } catch {
            // Ignore JSON parse errors and proceed to fallback
        }
    } catch (error) {
        console.warn("[IntentClassifier] LLM classification failed/timed out, falling back to heuristics:", error instanceof Error ? error.message : error);
    }

    // Fallback to robust heuristic
    return classifyHeuristic(trimmed);
}
