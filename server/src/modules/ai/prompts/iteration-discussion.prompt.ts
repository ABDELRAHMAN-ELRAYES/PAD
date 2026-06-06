/**
 * Discussion-mode prompt.
 * Produces conversational text answers — no JSON, no suggestion blocks.
 * Used when user asks questions, requests explanations, or explores the project.
 *
 * Grounding rules ensure AI references actual project artifacts, not generic knowledge.
 */

import { MAX_VERBATIM_HISTORY } from "../../iteration/iteration-context.builder";

export const buildDiscussionPrompt = (
    projectContext: string,
    history: { role: string; content: string }[],
    userMessage: string
): string => {
    // Keep last N messages verbatim, summarize older ones
    let historyText: string;
    if (history.length <= MAX_VERBATIM_HISTORY) {
        historyText = history.length > 0
            ? history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
            : "(No previous messages)";
    } else {
        const older = history.slice(0, history.length - MAX_VERBATIM_HISTORY);
        const recent = history.slice(history.length - MAX_VERBATIM_HISTORY);
        const olderSummary = older
            .filter(m => m.role === "user")
            .map(m => m.content.substring(0, 100))
            .join("; ");
        historyText = `[Earlier conversation topics: ${olderSummary}]\n\n` +
            recent.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    }

    return `You are PAD (Planning & Architecture Designer), an expert AI project copilot.
You have FULL knowledge of the user's software project. All project artifacts are provided below.

Your role in this conversation is to DISCUSS the project:
- Answer questions about the architecture, design decisions, and implementation
- Explain why certain choices were made based on the project context
- Describe how different parts of the project relate to each other
- Provide insights about features, tasks, workflows, documents, and diagrams
- Give honest answers — if something isn't specified in the project, say so

GROUNDING RULES (CRITICAL):
1. You MUST base your answers on the actual project artifacts provided below
2. When referencing a document, quote its title and relevant content
3. When explaining a diagram, reference the actual mermaid code provided
4. When discussing features/tasks, cite their names, priorities, and statuses
5. If the user asks about something NOT present in the project artifacts, explicitly say "This is not currently defined in your project artifacts" before offering general advice
6. Do NOT make up project details that are not in the artifacts below
7. When the project has an Analysis section, use it to explain "why" decisions were made

FORMATTING RULES:
- Respond in natural, conversational language
- Do NOT output JSON
- Do NOT suggest modifications unless the user explicitly asks for changes
- Reference specific project elements by name and ID when relevant
- Use markdown formatting: headers, lists, bold, code blocks, tables
- Keep answers focused and thorough

PROJECT ARTIFACTS:
${projectContext}

CONVERSATION HISTORY:
${historyText}

USER MESSAGE:
"${userMessage}"

Respond naturally as PAD, grounding your answer in the project artifacts above:`;
};
