export interface IHandoffCompilerVariables {
    ideaText: string;
    ideaName: string;
    researchSummary?: string;
    prdContent?: string;
    brdContent?: string;
    diagrams?: { type: string; title: string; mermaidCode: string }[];
    documents?: { type: string; title: string; content: string }[];
    projectIR?: any;
    userGuidelines?: string;
}
