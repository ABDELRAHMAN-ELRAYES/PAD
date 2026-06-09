"use client"

import { Button } from "@/components/ui/button"
import { Edit2, Check, X } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { EditableContentProps } from "./editable-content.types"

export default function EditableContent({ content, isEditing, onEdit, onSave, onCancel }: EditableContentProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {!isEditing && (
          <Button onClick={onEdit} variant="outline" size="sm" className="gap-2 h-9 bg-transparent">
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => onEdit()} // Parent handles state
            className="w-full h-96 p-4 bg-card border border-border/40 rounded-xl font-mono text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            defaultValue={content}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              onSave(target.value)
            }}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => onSave(content)}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Check className="w-4 h-4" />
              Save
            </Button>
            <Button onClick={onCancel} variant="outline" className="gap-2 bg-transparent">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="pad-content-block prose prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-3" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-foreground mt-5 mb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-foreground mt-4 mb-2" {...props} />,
              p: ({ node, ...props }) => <div className="text-foreground/90 mb-3 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="text-foreground/90" {...props} />,
              code: ({ node, className, ...props }) => {
                const match = /language-(\w+)/.exec(className || "")
                return !match ? (
                  <code className="bg-secondary/30 px-2 py-1 rounded font-mono text-sm text-accent" {...props} />
                ) : (
                  <code
                    className="block bg-secondary/20 p-3 rounded-lg font-mono text-sm text-foreground overflow-x-auto"
                    {...props}
                  />
                )
              },
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-accent/50 pl-4 italic text-foreground/70" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
