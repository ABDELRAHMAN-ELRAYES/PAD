"use client"

import { useEffect, useRef } from "react"

import { ResizableDividerProps } from "./resizable-divider.types"

export default function ResizableDivider({ onResize }: ResizableDividerProps) {
  const dividerRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)

  useEffect(() => {
    const handleMouseDown = () => {
      isResizingRef.current = true
      console.log("[v0] Started dragging divider")
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = "default"
      document.body.style.userSelect = "auto"
      console.log("[v0] Stopped dragging divider")
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return

      const container = dividerRef.current?.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      console.log("[v0] Mouse position:", { clientX: e.clientX, newLeftWidth })

      if (newLeftWidth >= 30 && newLeftWidth <= 70) {
        onResize(newLeftWidth)
      }
    }

    const divider = dividerRef.current
    if (divider) {
      divider.addEventListener("mousedown", handleMouseDown)
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        divider.removeEventListener("mousedown", handleMouseDown)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [onResize])

  return (
    <div
      ref={dividerRef}
      className="hidden lg:block w-1.5 bg-border/40 hover:bg-accent/60 cursor-col-resize transition-colors duration-200 hover:w-2 shrink-0"
      style={{
        backgroundColor: "var(--color-border)",
      }}
      onMouseDown={() => {
        isResizingRef.current = true
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"
      }}
    />
  )
}
