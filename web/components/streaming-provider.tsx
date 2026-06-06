"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type WorkspaceSection =
  | "overview"
  | "documents"
  | "diagrams"
  | "features"
  | "workflow"
  | "history";

type StreamingStatus = Record<string, boolean>;

interface StreamingContextType {
  streamingStatus: StreamingStatus;
  setPhaseStreaming: (phase: string, isStreaming: boolean) => void;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

export const StreamingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>({});

  const setPhaseStreaming = useCallback((phase: string, isStreaming: boolean) => {
    setStreamingStatus((prev) => ({
      ...prev,
      [phase]: isStreaming,
    }));
  }, []);

  return (
    <StreamingContext.Provider value={{ streamingStatus, setPhaseStreaming }}>
      {children}
    </StreamingContext.Provider>
  );
};

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (context === undefined) {
    throw new Error("useStreaming must be used within a StreamingProvider");
  }
  return context;
};
