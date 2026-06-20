import { IHandoffCompilerVariables } from "./handoff-variables";

export const buildCodingStandardsPrompt = (
    vars: IHandoffCompilerVariables,
    techSpec: string
): string => {
    const archDiagram = vars.diagrams?.find(
        (d) => d.type === "SYSTEM_ARCHITECTURE" || d.type === "ARCHITECTURE" || d.type === "COMPONENT"
    );

    return `You are a senior engineering lead. Generate a complete \`coding-standards.md\` document for AI coding agents.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

## Technical Stack
${techSpec.substring(0, 1000)}

${
    archDiagram
        ? `## Architecture Reference
\`\`\`mermaid
${archDiagram.mermaidCode}
\`\`\``
        : ""
}

${vars.userGuidelines ? `## User-Defined Guidelines (HIGHEST PRIORITY)\n${vars.userGuidelines}` : ""}

## Output Requirements
Return ONLY the raw markdown document. No JSON. No preamble.
Start directly with: # Coding Standards

The document MUST cover:
1. **Directory Structure** — folder layout with explanation of each directory's purpose
2. **Naming Conventions** — files, functions, variables, classes, DB columns (specify case for each)
3. **Module Pattern** — controller/service/repository separation rules
4. **Error Handling** — error class hierarchy, middleware pattern, response format
5. **Dependency Injection** — singleton pattern rules, instantiation strategy
6. **Testing Requirements** — test file location, naming, coverage expectations
7. **Import Order** — module import ordering rules
8. **Async Patterns** — async/await rules, Promise chaining policy
9. **AI Agent Execution Rules** — compile-check cycle, no orphan code rule, dependency enforcement
`;
};
