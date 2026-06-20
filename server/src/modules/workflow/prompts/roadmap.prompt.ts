import { IHandoffCompilerVariables } from "./handoff-variables";
import { ITask } from "../../task/types/ITask";
import { IFeature } from "../../feature/types/IFeature";

export const buildRoadmapPrompt = (
    vars: IHandoffCompilerVariables,
    allSpecs: { techSpec: string; dbSpec: string; apiSpec: string; codingStandards: string }
): string => {
    const featureContext = vars.features
        .map((f: IFeature & { tasks: ITask[] }) => {
            const taskList = f.tasks
                .map((t: ITask) => {
                    const deps = vars.taskDependenciesMap?.[t.id] || [];
                    const depsStr = deps.length > 0 ? ` | depends_on: [${deps.join(", ")}]` : "";
                    return `  - [${t.id}] ${t.title} (${t.priority})${depsStr}\n    ${t.description}`;
                })
                .join("\n");
            return `### Feature: ${f.title}\n${f.description}\nTasks:\n${taskList}`;
        })
        .join("\n\n");

    return `You are a senior technical lead. Generate a complete \`implementation-roadmap.md\` document.

## Project Context
**Project Name**: ${vars.ideaName}
**Description**: ${vars.ideaText}

## Feature & Task Breakdown (with dependencies)
${featureContext}

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
2. **Phase Breakdown** — group tasks into logical phases (e.g., Foundation → Backend → API → Frontend → Testing)
3. **For EACH Phase**:
   - Phase name and goal
   - Ordered task list with task IDs from the breakdown above
   - Exact dependency order — list which tasks must complete before others
   - Precise implementation instructions referencing actual file paths and entity names from specs
4. **Execution Rules** — compile/test gate between phases, no orphan code policy
5. **Definition of Done** — per-phase completion criteria
`;
};
