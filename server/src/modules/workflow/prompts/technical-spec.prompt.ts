import { IHandoffCompilerVariables } from "./handoff-variables";

export const buildTechSpecPrompt = (vars: IHandoffCompilerVariables): string => {
    const featureList = vars.features
        .map((f) => `- **${f.title}**: ${f.description}`)
        .join("\n");

    const diagramTypes = vars.diagrams?.map((d) => d.type).join(", ") || "None";

    return `You are a senior software architect. Generate a complete \`technical-specification.md\` document for the project described below.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

## Features (${vars.features.length} total)
${featureList}

${vars.researchSummary ? `## Research Findings\n${vars.researchSummary}` : ""}

## Available Diagrams
Diagram types generated: ${diagramTypes}

## Output Requirements
Return ONLY the raw markdown document. No JSON wrapper. No preamble. No explanation.
Start directly with: # Technical Specification

The document MUST cover:
1. **Project Overview** — one paragraph description
2. **Technology Stack** — languages, runtime, frameworks, databases (be specific with versions where possible)
3. **Core Libraries** — list with purpose for each
4. **Environment Variables** — table with variable name, description, example value
5. **Directory Structure** — proposed monorepo or single-repo folder tree
6. **Constraints** — version requirements, forbidden dependencies, platform requirements
7. **Third-Party Services** — external APIs, auth providers, payment gateways if applicable
`;
};
