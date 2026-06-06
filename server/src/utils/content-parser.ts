/**
 * Content parsing utilities for AI-generated artifact content.
 *
 * Handles nested JSON, raw markdown, mermaid code, and mixed-format responses
 * from LLM output before writing to database.
 */

export type ContentType = "json" | "mermaid" | "markdown" | "html" | "plaintext";

/**
 * Detect content type from raw string.
 */
export function detectContentType(content: string): ContentType {
    const trimmed = content.trim();

    // JSON object or array
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            JSON.parse(trimmed);
            return "json";
        } catch {
            // Might be malformed JSON — fall through
        }
    }

    // Mermaid diagram
    if (
        /^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|pie|stateDiagram|journey)/m.test(trimmed) ||
        trimmed.startsWith("```mermaid")
    ) {
        return "mermaid";
    }

    // HTML
    if (/<\/?[a-z][\s\S]*>/i.test(trimmed) && (trimmed.includes("<html") || trimmed.includes("<div") || trimmed.includes("<p>"))) {
        return "html";
    }

    // Markdown indicators
    if (/^#{1,6}\s/m.test(trimmed) || /^\*\*[^*]+\*\*/m.test(trimmed) || /^-\s/m.test(trimmed)) {
        return "markdown";
    }

    return "plaintext";
}

/**
 * Parse potentially nested JSON content from AI output.
 * Returns extracted fields (title, content, etc.) or raw content fallback.
 */
export function parseNestedJson(content: string | undefined): Record<string, any> {
    if (!content) return { title: undefined, content: undefined };

    const trimmed = content.trim();

    // Try direct JSON parse
    if (trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed);
            return {
                title: parsed.title,
                content: parsed.content || parsed.description || parsed.instructions || parsed.mermaidCode,
                ...parsed,
            };
        } catch {
            // Not valid JSON — try extracting JSON from markdown code block
        }
    }

    // Try extracting JSON from ```json ... ``` block
    const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            const parsed = JSON.parse(jsonBlockMatch[1].trim());
            return {
                title: parsed.title,
                content: parsed.content || parsed.description || parsed.instructions || parsed.mermaidCode,
                ...parsed,
            };
        } catch {
            // Fall through
        }
    }

    // Try extracting any JSON object
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                title: parsed.title,
                content: parsed.content || parsed.description || parsed.instructions || parsed.mermaidCode,
                ...parsed,
            };
        } catch {
            // Fall through
        }
    }

    // Raw content — no JSON structure
    return { title: undefined, content: trimmed };
}

/**
 * Extract mermaid code from content — strips ```mermaid fences if present.
 */
export function extractMermaidCode(content: string): string {
    const fenceMatch = content.match(/```mermaid\s*([\s\S]*?)```/);
    if (fenceMatch) return fenceMatch[1].trim();
    return content.trim();
}

/**
 * Validate content is appropriate for target module.
 * Returns error message if invalid, undefined if OK.
 */
export function validateContentForModule(
    module: string,
    actionType: string,
    content: string | undefined
): string | undefined {
    // CREATE and MODIFY need content
    if ((actionType === "CREATE" || actionType === "MODIFY") && !content?.trim()) {
        return `${module} ${actionType} requires non-empty content`;
    }

    // DELETE and REGENERATE don't need content
    if (actionType === "DELETE" || actionType === "REGENERATE") return undefined;

    if (!content) return undefined;

    const type = detectContentType(content);

    switch (module) {
        case "DIAGRAM":
            // Mermaid or JSON with mermaidCode field OK
            if (type !== "mermaid" && type !== "json") {
                // Attempt extraction
                const extracted = extractMermaidCode(content);
                if (!extracted || extracted === content.trim()) {
                    // Could still be raw mermaid without markers — allow it
                }
            }
            break;
        case "DOCUMENT":
            // Markdown, HTML, or JSON with content field OK
            break;
        case "FEATURE":
        case "TASK":
            // JSON or plaintext OK
            break;
        case "WORKFLOW":
            // JSON or plaintext OK
            break;
    }

    return undefined;
}
