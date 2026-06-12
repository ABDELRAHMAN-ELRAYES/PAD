"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGuidelines,
  useCreateGuideline,
  useUploadGuideline,
  useDeleteGuideline,
} from "@/features/guidelines/api/guidelineQueries";
import { guidelineApi } from "@/features/guidelines/api/guideline.api";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Plus,
  Loader2,
  BookOpen,
  Calendar,
  AlertTriangle,
  Info,
} from "lucide-react";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-5xl w-full p-0 rounded-3xl overflow-hidden sm:max-h-[85vh] sm:h-[85vh]"
      >
        <Tabs defaultValue="account" className="flex h-full flex-col sm:flex-row sm:min-h-0 w-full">
          {/* Left navigation sidebar */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border bg-muted/20 flex flex-col p-5 space-y-4 shrink-0">
            <div className="px-2 py-1">
              <h2 className="text-base font-bold tracking-tight">Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your workspace preferences</p>
            </div>
            <TabsList className="flex flex-row sm:flex-col items-stretch justify-start bg-transparent p-0 w-full gap-1 h-auto">
              <TabsTrigger
                value="account"
                className="justify-start px-3 py-2 h-9 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground w-full transition-all text-xs font-semibold"
              >
                Account
              </TabsTrigger>
              <TabsTrigger
                value="guidelines"
                className="justify-start px-3 py-2 h-9 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground w-full transition-all text-xs font-semibold"
              >
                Design Guidelines
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content panes */}
          <main className="flex-1 min-h-0 overflow-y-auto px-8 py-6 sm:min-h-0">
            <TabsContent value="account" className="m-0 border-none p-0 outline-none">
              <AccountSettingsPane />
            </TabsContent>
            <TabsContent value="guidelines" className="m-0 border-none p-0 outline-none">
              <GuidelinesSettingsPane />
            </TabsContent>
          </main>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AccountSettingsPane() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreview, setPhotoPreview] = useState("/avatar-profile.jpg");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const handleRequestPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setPhotoPreview(nextUrl);
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });
  };

  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const email = user?.email || "";

  return (
    <div className="space-y-8">
      <div>
        <DialogTitle className="text-xl font-bold">Account</DialogTitle>
        <DialogDescription className="mt-1 text-muted-foreground">
          Manage your personal information and account preferences.
        </DialogDescription>
      </div>

      <Separator />

      <SettingSection title="Information">
        <SettingRow
          label="Profile photo"
          description="This image appears across your workspace."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={photoPreview} />
              <AvatarFallback className="text-lg font-bold">
                {firstName.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleRequestPhoto}
              >
                Change photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                aria-label="Upload profile photo"
              />
            </div>
          </div>
        </SettingRow>
        <SettingRow label="Full name">
          <Input
            defaultValue={`${firstName} ${lastName}`.trim()}
            className="h-9 text-sm"
          />
        </SettingRow>
        <SettingRow
          label="Email address"
          description="Notifications will be sent to this address."
        >
          <Input
            defaultValue={email}
            type="email"
            className="h-9 text-sm bg-muted/40"
            readOnly
          />
        </SettingRow>
        <SettingRow label="Password" description="Last changed 2 months ago.">
          <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <span>••••••••</span>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              Set password
            </Button>
          </div>
        </SettingRow>
      </SettingSection>

      <Separator />

      <SettingSection title="Appearance">
        <SettingRow label="Theme">
          <Select
            value={isMounted ? (theme ?? "system") : "system"}
            onValueChange={(value) => setTheme(value)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System default</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingSection>
    </div>
  );
}

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,250px)_minmax(0,1fr)] sm:items-center sm:gap-6">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

function GuidelinesSettingsPane() {
  const { toast } = useToast();
  const { data: guidelines, isLoading, error } = useGuidelines();
  const createMutation = useCreateGuideline();
  const uploadMutation = useUploadGuideline();
  const deleteMutation = useDeleteGuideline();

  const [activeFormTab, setActiveFormTab] = useState<"file" | "text">("file");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // File drag & drop handlers
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    // validate file extension (.txt, .md)
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "md") {
      toast({
        title: "Invalid file type",
        description: "Please upload a text (.txt) or markdown (.md) file.",
        variant: "destructive",
      });
      return;
    }

    // validate size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadMutation.mutateAsync(file);
      toast({
        title: "Guideline Indexed",
        description: `"${file.name}" uploaded and parsed successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to process the guideline file.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({ title, content });
      toast({
        title: "Guideline Created",
        description: `"${title}" has been successfully indexed.`,
      });
      setTitle("");
      setContent("");
    } catch (err: any) {
      toast({
        title: "Error Creating Guideline",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "Guideline Deleted",
        description: "Guideline was successfully removed.",
      });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete guideline.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (fileId: string, originalName: string) => {
    setDownloadingId(fileId);
    try {
      const blob = await guidelineApi.download(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Failed to download the original file.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Design Guidelines</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Index architecture documents, system designs, or coding conventions to guide the AI model during generation.
        </p>
      </div>

      <Separator />

      {/* Spacious Form Card */}
      <Card className="shadow-sm border border-border/80 overflow-hidden bg-card/40">
        <div className="flex border-b border-border/60 bg-muted/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveFormTab("file")}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all",
              activeFormTab === "file"
                ? "bg-background text-foreground shadow-sm animate-in fade-in duration-150"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Document
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab("text")}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all",
              activeFormTab === "text"
                ? "bg-background text-foreground shadow-sm animate-in fade-in duration-150"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Write Custom Guideline
          </button>
        </div>

        <CardContent className="p-6">
          {activeFormTab === "file" ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Dropzone (span 7) */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "md:col-span-7 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] gap-3",
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/5"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploadMutation.isPending ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-foreground animate-pulse">Processing document...</p>
                    <p className="text-xs text-muted-foreground">Generating vector embeddings using Ollama</p>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 hover:scale-110">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Drag & drop your files here</p>
                      <p className="text-xs text-muted-foreground">or click to browse from your device</p>
                    </div>
                    <div className="text-[10px] bg-muted px-2.5 py-1 rounded text-muted-foreground font-mono">
                      Supports .md and .txt (max 5MB)
                    </div>
                  </>
                )}
              </div>

              {/* Informational guide (span 5) */}
              <div className="md:col-span-5 bg-muted/30 border border-border/40 rounded-xl p-5 flex flex-col justify-center gap-3.5">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Knowledge Base</span>
                </div>
                <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    Uploading standard rules allows the AI to automatically structure layouts, schema designs, and logic according to your needs.
                  </p>
                  <p className="text-[11px] italic">
                    All documents are split into semantic chunks and embedded locally using <span className="font-semibold text-foreground font-mono">nomic-embed-text</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Metadata Inputs (span 4) */}
              <div className="md:col-span-4 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground" htmlFor="guideline-title">
                      Guideline Title
                    </label>
                    <Input
                      id="guideline-title"
                      placeholder="e.g. PostgreSQL Schema Standard"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9 text-xs"
                      disabled={createMutation.isPending}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Provide a distinct title to identify your custom design rules.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 text-xs font-semibold mt-auto"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Save Guideline
                    </>
                  )}
                </Button>
              </div>

              {/* Textarea Content Input (span 8) */}
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-foreground" htmlFor="guideline-content">
                  Guideline Content
                </label>
                <Textarea
                  id="guideline-content"
                  placeholder="e.g. Every database table must contain 'created_at' and 'updated_at' columns..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[160px] text-xs resize-none"
                  disabled={createMutation.isPending}
                />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Active Guidelines Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b pb-2 border-border/40">
          <span className="text-sm font-bold text-foreground">
            Indexed Guidelines ({guidelines?.length ?? 0})
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Active and loaded in vector store
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 border rounded-xl bg-muted/5 animate-pulse">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading your guidelines...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border border-destructive/20 rounded-xl bg-destructive/5 text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-xs font-semibold">Failed to load guidelines</p>
          </div>
        ) : !guidelines || guidelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 border border-dashed rounded-xl bg-muted/5">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-foreground">No guidelines indexed yet</p>
              <p className="text-[10px] text-muted-foreground max-w-[280px]">
                Upload design guidelines or paste architecture rules to enhance generation.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
            {guidelines.map((guideline) => (
              <div
                key={guideline.id}
                className="flex items-start justify-between p-4 border rounded-xl hover:border-primary/40 hover:bg-muted/10 bg-card/60 transition-all gap-4 shadow-sm group animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10 mt-0.5">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-foreground truncate pr-1" title={guideline.title}>
                      {guideline.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{new Date(guideline.createdAt).toLocaleDateString()}</span>
                      {guideline.file && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span>{(guideline.file.size / 1024).toFixed(1)} KB</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[8px] truncate max-w-[80px]">
                            {guideline.file.mimetype === "text/markdown" ? "markdown" : "text"}
                          </span>
                        </>
                      )}
                    </p>

                    {!guideline.file && (
                      <p className="text-[10px] text-muted-foreground/90 mt-2 line-clamp-2 italic pr-2">
                        "{guideline.content}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {guideline.file && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/80"
                      disabled={downloadingId === guideline.file.id}
                      onClick={() => handleDownload(guideline.file!.id, guideline.file!.originalname)}
                      aria-label="Download guideline file"
                    >
                      {downloadingId === guideline.file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Download className="h-4.5 w-4.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-background/80"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeletingId(guideline.id)}
                    aria-label="Delete guideline"
                  >
                    {deleteMutation.isPending && deletingId === guideline.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="h-4.5 w-4.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action will remove the guideline permanentely from database storage and purge all indexes from Qdrant vector index.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="h-8 text-xs font-semibold rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs text-white font-semibold bg-destructive hover:bg-destructive/90 rounded-lg"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
