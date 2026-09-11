import { IHandoffCompilerVariables } from "./handoff-variables";

export const buildRoadmapPrompt = (
    vars: IHandoffCompilerVariables,
    allSpecs: { techSpec: string; dbSpec: string; apiSpec: string; codingStandards: string }
): string => {
    return `You are a senior technical lead. Generate a complete \`implementation-roadmap.md\` document.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

${vars.prdContent ? `## Requirements Scope\n${vars.prdContent.substring(0, 1500)}` : ""}

## Technical Specification Summary
${allSpecs.techSpec.substring(0, 800)}

## Database Specification Summary
${allSpecs.dbSpec.substring(0, 800)}

## API Specification Summary
${allSpecs.apiSpec.substring(0, 800)}

## Coding Standards Summary
${allSpecs.codingStandards.substring(0, 600)}

## Output Requirements
Return ONLY the raw markdown document. No JSON. No preamble.
Start directly with: # Implementation Roadmap

The document MUST include:
1. **Overview** — total phases, estimated scope
2. **Phase Breakdown** — group tasks into logical phases (e.g., Foundation → Database & Repositories → API & Services → Frontend UI → Integration Testing)
3. **For EACH Phase**:
   - Phase name and goal
   - Ordered implementation task checklist
   - Exact dependency order — list which components must complete before others
   - Precise implementation instructions referencing actual file paths and entity names from specs
4. **Execution Rules** — compile/test gate between phases, no orphan code policy
5. **Definition of Done** — per-phase completion criteria
`;
};
