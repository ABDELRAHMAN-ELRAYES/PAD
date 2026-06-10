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
import { FileText, FileSpreadsheet, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentDetailPanel } from "./DocumentDetailPanel";

import { DocumentsPanelProps } from "../types/components/DocumentsPanel.types";

export const DocumentsPanel: FC<DocumentsPanelProps> = ({ ideaId, idea }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<"PRD" | "BRD" | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [autoStream, setAutoStream] = useState(false);

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

  const handleGenerate = async (type: "PRD" | "BRD") => {
    try {
      setGeneratingType(type);
      const doc = await documentApi.createPlaceholder(ideaId, type);
      setAutoStream(true);
      setOpenDocId(doc.id);
      toast.success(`${type} document initialized!`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to generate ${type}`,
      );
    } finally {
      setGeneratingType(null);
    }
  };

  const handleDelete = async (docId: string, type: "PRD" | "BRD", e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the ${type} document? This will permanently delete all its version history.`)) {
      return;
    }
    try {
      await documentApi.delete(docId);
      toast.success(`${type} deleted successfully`);
      fetchDocuments();
    } catch (err) {
      toast.error(`Failed to delete ${type}`);
    }
  };

  const renderDocumentSlot = (type: "PRD" | "BRD", doc: Document | undefined) => {
    const isGeneratingThis = generatingType === type;
    const isGeneratingAny = generatingType !== null;

    if (isGeneratingThis) {
      return (
        <Card className="border-primary/20 bg-primary/5 animate-pulse min-h-[180px] flex flex-col justify-between">
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
                    {type === "PRD" ? "Product Requirements Document" : "Business Requirements Document"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Initializing document...
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] animate-pulse">
                Initializing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </CardContent>
        </Card>
      );
    }

    if (doc) {
      return (
        <Card
          className="hover:border-primary/50 transition-colors cursor-pointer group relative min-h-[180px] flex flex-col justify-between"
          onClick={() => {
            setAutoStream(false);
            setOpenDocId(doc.id);
          }}
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
                  <CardTitle className="text-base group-hover:text-primary transition-colors pr-8">
                    {doc.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {type === "PRD"
                      ? "Product Requirements Document"
                      : "Business Requirements Document"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Badge
                  variant={doc.status === "published" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {doc.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  onClick={(e) => handleDelete(doc.id, type, e)}
                  disabled={isGeneratingAny}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xs text-muted-foreground">
              Updated {new Date(doc.updatedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      );
    }

    // Empty state for this slot
    return (
      <Card className="border-dashed min-h-[180px] flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            {type === "PRD" ? (
              <FileText className="h-6 w-6 text-muted-foreground/50" />
            ) : (
              <FileSpreadsheet className="h-6 w-6 text-muted-foreground/50" />
            )}
            <div>
              <CardTitle className="text-base text-muted-foreground/80">
                {type === "PRD" ? "Product Requirements Document" : "Business Requirements Document"}
              </CardTitle>
              <CardDescription className="text-xs">
                {type === "PRD"
                  ? "Define features, user stories, and technical specs."
                  : "Define business goals, scope, and target values."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4 pt-2 flex justify-end">
          {idea.status !== "confirmed" ? (
            <span className="text-xs text-muted-foreground italic">Idea not confirmed</span>
          ) : (
            <Button
              onClick={() => handleGenerate(type)}
              disabled={isGeneratingAny}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Generate {type}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // If a document is open, show the detail panel
  if (openDocId) {
    return (
      <DocumentDetailPanel
        docId={openDocId}
        ideaId={ideaId}
        autoStream={autoStream}
        onBack={() => {
          setOpenDocId(null);
          setAutoStream(false);
          fetchDocuments();
        }}
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

  const prdDoc = documents.find((doc) => doc.type === "PRD");
  const brdDoc = documents.find((doc) => doc.type === "BRD");

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Documents</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderDocumentSlot("PRD", prdDoc)}
        {renderDocumentSlot("BRD", brdDoc)}
      </div>
    </div>
  );
};
