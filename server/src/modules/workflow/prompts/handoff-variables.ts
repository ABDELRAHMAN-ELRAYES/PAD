import { IFeature } from "../../feature/types/IFeature";
import { ITask } from "../../task/types/ITask";

export interface IHandoffCompilerVariables {
    ideaText: string;
    ideaName: string;
    features: (IFeature & { tasks: ITask[] })[];
    researchSummary?: string;
    prdContent?: string;
    brdContent?: string;
    diagrams?: { type: string; title: string; mermaidCode: string }[];
    taskDependenciesMap?: Record<string, string[]>;
    userGuidelines?: string;
}
