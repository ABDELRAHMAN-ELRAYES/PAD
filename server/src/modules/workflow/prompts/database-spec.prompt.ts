import { IHandoffCompilerVariables } from "./handoff-variables";

export const buildDatabaseSpecPrompt = (vars: IHandoffCompilerVariables): string => {
    const erdDiagram = vars.diagrams?.find(
        (d) => d.type === "DATABASE_ERD" || d.type === "ERD"
    );

    return `You are a senior database architect. Generate a complete \`database-specification.md\` document.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

${vars.prdContent ? `## Requirements Data Model Expectations\n${vars.prdContent.substring(0, 2000)}` : ""}

${
    erdDiagram
        ? `## ERD Diagram (Mermaid)
The following ERD was previously generated for this project. Use it as the primary source of truth for entity definitions:
\`\`\`mermaid
${erdDiagram.mermaidCode}
\`\`\``
        : "## Note: No ERD diagram available. Infer entities from project requirements."
}

## Output Requirements
Return ONLY the raw markdown document. No JSON. No preamble.
Start directly with: # Database Specification

The document MUST cover:
1. **Overview** — database engine choice and rationale
2. **Entity Definitions** — for EACH entity: table name, columns (name, type, constraints, description), primary key, indexes
3. **Relationships** — foreign keys, cardinality, cascade rules
4. **Schema Definition** — provide standard SQL DDL (and ORM/Schema syntax if applicable) for all tables
5. **Seeding Strategy** — initial data requirements and seed order
6. **Migration Notes** — any multi-step migration concerns
`;
};
