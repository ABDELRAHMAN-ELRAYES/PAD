export interface IIterationSession {
    id: string;
    ideaId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    messages?: IIterationMessage[];
}

export interface IIterationMessage {
    id: string;
    sessionId: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    suggestion?: IIterationSuggestion;
}

export interface IIterationSuggestion {
    id: string;
    messageId: string;
    title: string;
    summary: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    actions?: IIterationSuggestionAction[];
}

export interface IIterationSuggestionAction {
    id: string;
    suggestionId: string;
    module: "DOCUMENT" | "DIAGRAM" | "FEATURE" | "TASK" | "WORKFLOW";
    targetId: string;
    actionType: "CREATE" | "MODIFY" | "DELETE" | "REGENERATE";
    newContent?: string;
    createdAt: Date;
}

export interface ICreateIterationSessionData {
    ideaId: string;
}

export interface ICreateIterationMessageData {
    sessionId: string;
    role: "user" | "assistant";
    content: string;
}

export interface ICreateIterationSuggestionData {
    messageId: string;
    title: string;
    summary: string;
    actions: ICreateIterationSuggestionActionData[];
}

export interface ICreateIterationSuggestionActionData {
    module: "DOCUMENT" | "DIAGRAM" | "FEATURE" | "TASK" | "WORKFLOW";
    targetId: string;
    actionType: "CREATE" | "MODIFY" | "DELETE" | "REGENERATE";
    newContent?: string;
}

export interface IUpdateIterationSuggestionStatusData {
    status: "pending" | "approved" | "rejected" | "applied" | "partial" | "failed";
}

export interface IIterationRepository {
    createSession(data: ICreateIterationSessionData): Promise<IIterationSession>;
    getSessionByIdeaId(ideaId: string): Promise<IIterationSession | null>;
    addMessage(data: ICreateIterationMessageData): Promise<IIterationMessage>;
    createSuggestion(data: ICreateIterationSuggestionData): Promise<IIterationSuggestion>;
    updateSuggestionStatus(id: string, status: string): Promise<IIterationSuggestion>;
    getMessagesBySessionId(sessionId: string): Promise<IIterationMessage[]>;
    getSuggestionById(id: string): Promise<IIterationSuggestion | null>;
    getMessageById(id: string): Promise<IIterationMessage | null>;
    getSessionBySessionId(id: string): Promise<IIterationSession | null>;
    getSessionByMessageId(messageId: string): Promise<IIterationSession | null>;
}
