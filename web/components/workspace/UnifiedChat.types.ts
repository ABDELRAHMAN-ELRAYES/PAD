export interface UnifiedChatProps {
    /** null = new idea mode; string = iteration mode for existing idea */
    ideaId: string | null;
    onIdeaCreated?: (ideaId: string) => void;
    onArtifactUpdated?: () => void;
}
