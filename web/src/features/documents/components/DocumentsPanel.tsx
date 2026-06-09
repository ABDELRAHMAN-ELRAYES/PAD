"use client";

import { FC, useEffect, useState } from "react";
import { documentApi } from "../api/documents.api";
import { Document } from "../types/models/documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DocumentDetailPanel } from "./DocumentDetailPanel";

import { useStreaming } from "@/components/providers/StreamingProvider";

import { DocumentsPanelProps } from "../types/components/DocumentsPanel.types";

export const DocumentsPanel: FC<DocumentsPanelProps> = ({ ideaId, idea }) => {
  const { setPhaseStreaming } = useStreaming();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [openDocId, setOpenDocId] = useState<string | null>(null);

  const [streamingDocs, setStreamingDocs] = useState<
    Record<string, { title: string; fullText: string }>
  >({});

  useEffect(() => {
    if (generating) {
      setPhaseStreaming("documents", true);
    } else {
      setPhaseStreaming("documents", false);
    }
  }, [generating, setPhaseStreaming]);

  useEffect(() => {
    fetchDocuments();
  }, [ideaId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentApi.getByIdeaId(ideaId);
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setStreamingDocs({});
      setPhaseStreaming("documents", true);

      await documentApi.generateStream(ideaId, (data) => {
        if (data.chunk && data.type) {
          setStreamingDocs((prev) => ({
            ...prev,
            [data.type]: {
              title:
                data.type === "PRD"
                  ? "Product Requirements Document"
                  : "Business Requirements Document",
              fullText: data.fullText || (prev[data.type]?.fullText || "") + data.chunk,
            },
          }));
        }

        if (data.status === "final") {
          setGenerating(false);
          setStreamingDocs({});
          if (data.documents) setDocuments(data.documents);
          setPhaseStreaming("documents", false);
          toast.success("Documents generated successfully!");
        }

        if (data.status === "error") {
          setGenerating(false);
          setPhaseStreaming("documents", false);
          toast.error(data.message || "Failed to generate documents");
        }
      });
    } catch (err) {
      setGenerating(false);
      setPhaseStreaming("documents", false);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate documents",
      );
    }
  };

  // If a document is open, show the detail panel
  if (openDocId) {
    return (
      <DocumentDetailPanel
        docId={openDocId}
        ideaId={ideaId}
        onBack={() => setOpenDocId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Documents</h2>
        {idea.status === "confirmed" && documents.length === 0 && (
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Documents
              </>
            )}
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            {idea.status !== "confirmed" ? (
              <>
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-medium mb-1">
                  Idea Not Confirmed
                </h3>
                <p className="text-sm text-muted-foreground">
                  Confirm the idea first from the Overview panel.
                </p>
              </>
            ) : (
              <>
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-medium mb-1">No Documents Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate PRD and BRD documents from your confirmed idea.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  size="sm"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Documents
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {/* Streaming Documents */}
          {Object.entries(streamingDocs).map(([type, doc]) => (
            <Card
              key={type}
              className="border-primary/20 bg-primary/5 animate-pulse"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {type === "PRD" ? (
                      <FileText className="h-6 w-6 text-blue-500" />
                    ) : (
                      <FileSpreadsheet className="h-6 w-6 text-green-500" />
                    )}
                    <div>
                      <CardTitle className="text-base">
                        {doc.title} (Generating...)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        AI is writing the {type}...
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] animate-pulse"
                  >
                    Generating
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground line-clamp-2 italic">
                  {doc.fullText.substring(doc.fullText.length - 100)}...
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Existing Documents */}
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setOpenDocId(doc.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {doc.type === "PRD" ? (
                      <FileText className="h-6 w-6 text-blue-500" />
                    ) : (
                      <FileSpreadsheet className="h-6 w-6 text-green-500" />
                    )}
                    <div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {doc.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {doc.type === "PRD"
                          ? "Product Requirements Document"
                          : "Business Requirements Document"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.status === "published" ? "default" : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
