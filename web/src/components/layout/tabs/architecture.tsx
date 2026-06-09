"use client"

import { useState } from "react"
import EditableContent from "../EditableContent"

interface ArchitectureProps {
  data: string
}

export default function Architecture({ data }: ArchitectureProps) {
  const [content, setContent] = useState(data)
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">System Architecture</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent bg-accent/10 px-3 py-1 rounded-full">AI generated</span>
        </div>
      </div>
      <EditableContent
        content={content}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={(newContent: string) => {
          setContent(newContent)
          setIsEditing(false)
        }}
        onCancel={() => setIsEditing(false)}
      />
    </div>
  )
}
