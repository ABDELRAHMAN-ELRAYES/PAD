/**
 * Modification-mode prompt.
 * Produces a conversational response FOLLOWED BY a JSON suggestion block.
 * Used when user requests changes to project artifacts.
 *
 * Includes few-shot examples and cross-module orchestration guidance.
 */

import { MAX_VERBATIM_HISTORY } from "../../iteration/iteration-context.builder";

export const buildModificationPrompt = (
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

    const jsonExample = "```" + "json";
    const codeEnd = "```";

    return `You are PAD (Planning & Architecture Designer), an expert AI project copilot.
You have full knowledge of the user's software project described below.

The user is requesting a MODIFICATION to the project. Your job is to:
1. Understand what they want to change
2. Determine ALL artifacts that need updating (cross-module thinking)
3. Write a clear explanation of what will be changed and why
4. Generate a structured suggestion with specific actions

CROSS-MODULE ORCHESTRATION:
When the user requests a change that affects multiple parts of the project, you MUST update ALL relevant artifacts. For example:
- "Add authentication" → update documents (PRD sections), features (new feature), tasks (implementation tasks), diagrams (add auth entities/flows), workflow (add auth step)
- "Replace MongoDB with PostgreSQL" → update documents (tech stack sections), diagrams (ERD), tasks (migration tasks), workflow (DB setup steps)

RESPONSE FORMAT — You MUST output EXACTLY this structure:

First, write a brief explanation of what changes you'll make.
Then, output a JSON block:

${jsonExample}
{
  "response": "Your explanation of what was changed (1-3 sentences)",
  "suggestion": {
    "title": "Short descriptive title",
    "summary": "Brief summary of all changes",
    "actions": [
      {
        "module": "DOCUMENT | DIAGRAM | FEATURE | TASK | WORKFLOW",
        "targetId": "actual ID from context, or 'new' for CREATE",
        "actionType": "CREATE | MODIFY | DELETE",
        "newContent": "The complete new/updated content"
      }
    ]
  }
}
${codeEnd}

RULES:
- Use ACTUAL IDs from the project context below — do not make up IDs
- For CREATE actions, set targetId to "new"
- For MODIFY actions, include the complete updated content (not just the diff)
- For FEATURE/TASK CREATE: use JSON string in newContent with "title" and "description" fields
- Consider ALL cross-module impacts
- Keep actions focused on what the user asked — but include necessary cascading changes
- If you cannot determine the right targetId, explain in your response and skip that action
- You MUST always produce the JSON block — never skip it for a modification request
- If the request is unclear, include fewer actions but ALWAYS include the JSON block

${projectContext}

CONVERSATION HISTORY:
${historyText}

USER MODIFICATION REQUEST:
"${userMessage}"

Write your explanation, then the JSON suggestion block:`;
};
