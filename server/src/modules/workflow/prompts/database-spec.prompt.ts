import { IHandoffCompilerVariables } from "./handoff-variables";

export const buildDatabaseSpecPrompt = (vars: IHandoffCompilerVariables): string => {
    const erdDiagram = vars.diagrams?.find(
        (d) => d.type === "DATABASE_ERD" || d.type === "ERD"
    );

    const featureList = vars.features
        .map((f) => {
            const taskList = f.tasks.map((t) => `  - ${t.title}: ${t.description}`).join("\n");
            return `### ${f.title}\n${f.description}\nTasks:\n${taskList}`;
        })
        .join("\n\n");

    return `You are a senior database architect. Generate a complete \`database-specification.md\` document.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

## Feature & Task Breakdown
${featureList}

${
    erdDiagram
        ? `## ERD Diagram (Mermaid)
The following ERD was previously generated for this project. Use it as the primary source of truth for entity definitions:
\`\`\`mermaid
${erdDiagram.mermaidCode}
\`\`\``
        : "## Note: No ERD diagram available. Infer entities from features and tasks."
}

## Output Requirements
Return ONLY the raw markdown document. No JSON. No preamble.
Start directly with: # Database Specification

The document MUST cover:
1. **Overview** — database engine choice and rationale
2. **Entity Definitions** — for EACH entity: table name, columns (name, type, constraints, description), primary key, indexes
3. **Relationships** — foreign keys, cardinality, cascade rules
4. **Schema Definition** — provide Prisma schema format for all models
5. **Seeding Strategy** — initial data requirements and seed order
6. **Migration Notes** — any multi-step migration concerns
`;
};
