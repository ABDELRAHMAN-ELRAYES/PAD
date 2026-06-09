"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

import { InputPanelProps } from "./InputPanel.types"

export default function InputPanel({ value, onChange, onGenerate, isLoading }: InputPanelProps) {
  return (
    <div className="w-full border-b lg:border-b-0 lg:border-r border-border/40 flex flex-col p-4 sm:p-6 lg:p-8 gap-6 bg-secondary/5 overflow-auto h-full">
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Describe Your Business Idea</label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
            placeholder="Example: A SaaS platform that helps freelancers manage projects, track time, invoice clients, and collaborate with team members in real-time..."
            className="w-full h-48 sm:h-56 lg:h-64 p-3 sm:p-4 bg-card border border-border/40 rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all disabled:opacity-50 text-sm sm:text-base"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Button
          onClick={onGenerate}
          disabled={isLoading || !value.trim()}
          className="w-full py-5 sm:py-6 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "Generating SDLC..." : "Generate SDLC"}
        </Button>

        {isLoading && (
          <div className="p-3 sm:p-4 bg-card border border-border/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Analyzing your idea...</p>
                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!value && !isLoading && (
        <div className="p-3 sm:p-4 bg-secondary/20 border border-border/40 rounded-xl">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Describe your product, target users, key features, and main problems you're solving for best
            results.
          </p>
        </div>
      )}
    </div>
  )
}
