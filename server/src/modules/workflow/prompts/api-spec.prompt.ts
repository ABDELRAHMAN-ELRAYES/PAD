import { IHandoffCompilerVariables } from "./handoff-variables";

export const buildApiSpecPrompt = (
    vars: IHandoffCompilerVariables,
    techSpec: string
): string => {
    const featureList = vars.features
        .map((f) => {
            const taskList = f.tasks.map((t) => `  - ${t.title}`).join("\n");
            return `### ${f.title}\n${f.description}\nTasks:\n${taskList}`;
        })
        .join("\n\n");

    const seqDiagram = vars.diagrams?.find((d) => d.type === "SEQUENCE");

    return `You are a senior backend architect. Generate a complete \`api-specification.md\` document.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

## Technical Stack (Already Decided)
${techSpec.substring(0, 1500)}

## Feature & Task Breakdown
${featureList}

${
    seqDiagram
        ? `## Sequence Diagram Reference
\`\`\`mermaid
${seqDiagram.mermaidCode}
\`\`\``
        : ""
}

## Output Requirements
Return ONLY the raw markdown document. No JSON. No preamble.
Start directly with: # API Specification

The document MUST cover:
1. **Base URL & Versioning** — e.g., \`/api/v1/\`
2. **Authentication** — auth mechanism (JWT/session), header format, token refresh strategy
3. **Error Format** — standard error response JSON structure
4. **Endpoints** — for EACH feature, a table with: Method | Path | Description | Auth Required | Request Body | Response Shape
5. **Payload Examples** — JSON request/response examples for at least 3 key endpoints
6. **Rate Limiting** — if applicable
7. **Pagination** — strategy for list endpoints (cursor/offset)
`;
};
