import { useState, useEffect, useRef, useCallback } from "react";
import { ideaApi } from "../api/ideas.api";
import { Idea } from "../types/models/idea";

export interface ResearchLog {
  timestamp: string;
  message: string;
}

export function useResearchStream(
  ideaId: string,
  onComplete: (updatedIdea: Idea) => void
) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("init");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [status, setStatus] = useState<"pending" | "running" | "completed" | "failed">("pending");
  const [error, setError] = useState<string | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll status endpoint
  const pollStatus = useCallback(async () => {
    try {
      const data = await ideaApi.getResearchStatus(ideaId);
      if (data.job) {
        setProgress(data.job.progress);
        setPhase(data.job.currentPhase || "searching");
        const dbLogs = (data.job.logs as ResearchLog[]) || [];
        setLogs(dbLogs);
        if (dbLogs.length > 0) {
          setMessage(dbLogs[dbLogs.length - 1].message);
        }
        setStatus(data.job.status);
        setError(data.job.error);

        if (data.job.status === "completed" || data.ideaStatus === "research_complete") {
          stopPolling();
          // Fetch the updated idea and fire onComplete
          const updatedIdea = await ideaApi.getById(ideaId);
          onCompleteRef.current(updatedIdea);
        } else if (data.job.status === "failed") {
          stopPolling();
        }
      }
    } catch (err) {
      console.error("Error polling research status:", err);
    }
  }, [ideaId, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 2500);
  }, [pollStatus]);

  // Start research stream (SSE via fetch)
  const startResearch = useCallback(async (isReconnect = false) => {
    setError(null);
    setStatus("running");
    if (!isReconnect) {
      setProgress(5);
      setPhase("init");
      setLogs([{ timestamp: new Date().toISOString(), message: "Initializing Deep Research..." }]);
    }

    try {
      abortControllerRef.current = new AbortController();
      const response = await ideaApi.startResearchStream(ideaId);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream reader not available.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep last incomplete line
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Strip SSE "data: " prefix if present
          let rawData = trimmed;
          if (trimmed.startsWith("data: ")) {
            rawData = trimmed.substring(6);
          }

          try {
            const parsed = JSON.parse(rawData);
            if (parsed.type === "progress") {
              setProgress(parsed.progress);
              setPhase(parsed.phase);
              setMessage(parsed.message);
              setLogs((prev) => [
                ...prev,
                { timestamp: new Date().toISOString(), message: parsed.message },
              ]);
            } else if (parsed.type === "complete") {
              setProgress(100);
              setPhase("complete");
              setStatus("completed");
              setLogs((prev) => [
                ...prev,
                { timestamp: new Date().toISOString(), message: "Deep Research complete!" },
              ]);
              if (parsed.idea) {
                onCompleteRef.current(parsed.idea);
              } else {
                const updatedIdea = await ideaApi.getById(ideaId);
                onCompleteRef.current(updatedIdea);
              }
            } else if (parsed.type === "error") {
              setError(parsed.message);
              setStatus("failed");
              setLogs((prev) => [
                ...prev,
                { timestamp: new Date().toISOString(), message: `Error: ${parsed.message}` },
              ]);
            }
          } catch (e) {
            // Non-JSON line from stream
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Research stream error:", err);
      setError(err?.message || "Failed to establish stream. Falling back to status polling.");
      // Fallback to polling
      startPolling();
    }
  }, [ideaId, startPolling]);

  // Check initial status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await ideaApi.getResearchStatus(ideaId);
        if (data.job) {
          setStatus(data.job.status);
          setProgress(data.job.progress);
          setPhase(data.job.currentPhase || "searching");
          const dbLogs = (data.job.logs as ResearchLog[]) || [];
          setLogs(dbLogs);
          if (dbLogs.length > 0) {
            setMessage(dbLogs[dbLogs.length - 1].message);
          }
          setError(data.job.error);

          if (data.job.status === "running" || data.job.status === "pending") {
            startResearch(true);
          } else if (data.job.status === "failed") {
            setStatus("failed");
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial research status:", err);
      }
    };

    checkStatus();

    return () => {
      stopPolling();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [ideaId]);

  return {
    progress,
    phase,
    message,
    logs,
    status,
    error,
    startResearch,
  };
}
