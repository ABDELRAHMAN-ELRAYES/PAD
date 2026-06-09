"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function ExportButton() {
  const handleExport = () => {
    // Simulate PDF export
    alert("PDF export functionality would be implemented with a library like jsPDF or html2pdf")
  }

  return (
    <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm p-4 flex justify-end">
      <Button
        onClick={handleExport}
        className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg"
      >
        <Download className="w-4 h-4" />
        Export to PDF
      </Button>
    </div>
  )
}
