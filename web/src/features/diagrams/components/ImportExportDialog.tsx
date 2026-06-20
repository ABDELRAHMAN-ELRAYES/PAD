import { FC, useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogHeader,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, Upload, FileText, Image as ImageIcon, FileCode, CheckCircle2 } from "lucide-react";
import { Diagram } from "../types/models/diagrams";
import { toast } from "sonner";

interface ImportExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    diagram: Diagram | null;
    onImport: (code: string) => Promise<void>;
}

export const ImportExportDialog: FC<ImportExportDialogProps> = ({
    open,
    onOpenChange,
    diagram,
    onImport,
}) => {
    const [importTab, setImportTab] = useState<"upload" | "paste">("upload");
    const [pastedCode, setPastedCode] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!diagram) return null;

    // Export raw Mermaid (.mmd)
    const handleExportMMD = () => {
        const blob = new Blob([diagram.mermaidCode], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.mmd`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Mermaid source code exported");
    };

    // Export SVG
    const handleExportSVG = () => {
        const svgEl = document.querySelector(".mermaid-preview svg");
        if (!svgEl) {
            toast.error("Diagram preview not rendered yet. Please wait.");
            return;
        }

        const svgString = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("SVG diagram exported");
    };

    // Export high-resolution PNG
    const handleExportPNG = () => {
        const svgEl = document.querySelector(".mermaid-preview svg") as SVGElement;
        if (!svgEl) {
            toast.error("Diagram preview not rendered yet. Please wait.");
            return;
        }

        try {
            const svgString = new XMLSerializer().serializeToString(svgEl);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement("canvas");
                const rect = svgEl.getBoundingClientRect();
                // 2x resolution enhancement
                canvas.width = (rect.width || 800) * 2;
                canvas.height = (rect.height || 600) * 2;
                const context = canvas.getContext("2d");

                if (context) {
                    context.fillStyle = "#ffffff";
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);

                    const png = canvas.toDataURL("image/png");
                    const link = document.createElement("a");
                    link.download = `${diagram.title.toLowerCase().replace(/\s+/g, "_")}.png`;
                    link.href = png;
                    link.click();
                    toast.success("PNG image exported");
                } else {
                    toast.error("Failed to acquire 2D canvas context");
                }
                URL.revokeObjectURL(url);
            };
            image.onerror = () => {
                toast.error("Failed to render diagram image");
                URL.revokeObjectURL(url);
            };
            image.src = url;
        } catch (err) {
            console.error("Export PNG failed", err);
            toast.error("Failed to export PNG");
        }
    };

    // File Import handler
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (text) {
                setIsImporting(true);
                try {
                    await onImport(text);
                    toast.success("Diagram code imported successfully");
                    onOpenChange(false);
                } catch (err) {
                    toast.error("Failed to import diagram code");
                } finally {
                    setIsImporting(false);
                }
            }
        };
        reader.readAsText(file);
    };

    // Paste Import handler
    const handlePasteImport = async () => {
        if (!pastedCode.trim()) {
            toast.error("Please paste valid Mermaid code first");
            return;
        }

        setIsImporting(true);
        try {
            await onImport(pastedCode);
            toast.success("Diagram code imported successfully");
            onOpenChange(false);
            setPastedCode("");
        } catch (err) {
            toast.error("Failed to import diagram code");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <span>Import / Export Diagram</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Manage code import or format export for: <strong>{diagram.title}</strong>
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="export" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/65 border p-1 rounded-xl">
                        <TabsTrigger value="export" className="rounded-lg text-xs font-semibold">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Export
                        </TabsTrigger>
                        <TabsTrigger value="import" className="rounded-lg text-xs font-semibold">
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            Import
                        </TabsTrigger>
                    </TabsList>

                    {/* Export Tab */}
                    <TabsContent value="export" className="space-y-4 pt-4 outline-none">
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={handleExportPNG}
                                className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-primary/5 hover:border-primary/45 transition-all text-center gap-2"
                            >
                                <ImageIcon className="h-6 w-6 text-indigo-500" />
                                <span className="text-xs font-bold text-foreground">PNG Image</span>
                                <span className="text-[10px] text-muted-foreground">High-Res Image</span>
                            </button>
                            <button
                                onClick={handleExportSVG}
                                className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-primary/5 hover:border-primary/45 transition-all text-center gap-2"
                            >
                                <FileCode className="h-6 w-6 text-sky-500" />
                                <span className="text-xs font-bold text-foreground">SVG Vector</span>
                                <span className="text-[10px] text-muted-foreground">Scalable Graphics</span>
                            </button>
                            <button
                                onClick={handleExportMMD}
                                className="flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-primary/5 hover:border-primary/45 transition-all text-center gap-2"
                            >
                                <FileText className="h-6 w-6 text-emerald-500" />
                                <span className="text-xs font-bold text-foreground">Mermaid Code</span>
                                <span className="text-[10px] text-muted-foreground">Raw MMD Text</span>
                            </button>
                        </div>
                    </TabsContent>

                    {/* Import Tab */}
                    <TabsContent value="import" className="space-y-4 pt-4 outline-none">
                        <div className="flex bg-muted/30 p-1 border rounded-lg gap-1">
                            <button
                                type="button"
                                onClick={() => setImportTab("upload")}
                                className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                                    importTab === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                                }`}
                            >
                                File Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => setImportTab("paste")}
                                className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                                    importTab === "paste" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                                }`}
                            >
                                Paste Syntax
                            </button>
                        </div>

                        {importTab === "upload" ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all flex flex-col items-center justify-center gap-2 min-h-[140px]"
                            >
                                <Upload className="h-8 w-8 text-muted-foreground/60 mb-1" />
                                <span className="text-xs font-semibold text-foreground">Click to upload Mermaid file</span>
                                <span className="text-[10px] text-muted-foreground">Supports .mmd or .txt files</span>
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".mmd,.txt"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Textarea
                                    value={pastedCode}
                                    onChange={(e) => setPastedCode(e.target.value)}
                                    placeholder="Paste your raw erDiagram or flowchart code here..."
                                    className="min-h-[140px] font-mono text-xs"
                                />
                                <Button
                                    onClick={handlePasteImport}
                                    disabled={isImporting}
                                    className="w-full text-xs font-semibold"
                                >
                                    {isImporting ? "Importing..." : "Confirm Import"}
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
