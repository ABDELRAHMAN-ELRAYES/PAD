import React from "react";

export type StreamingStatus = Record<string, boolean>;

export interface StreamingContextType {
  streamingStatus: StreamingStatus;
  setPhaseStreaming: (phase: string, isStreaming: boolean) => void;
}

export interface StreamingProviderProps {
  children: React.ReactNode;
}
