"use client"

import { useState } from "react"
import TabNavigation from "./tab-navigation"
import Overview from "./tabs/overview"
import Requirements from "./tabs/requirements"
import Architecture from "./tabs/architecture"
import Diagrams from "./tabs/diagrams"
import TestPlan from "./tabs/test-plan"
import ExportButton from "./export-button"
import SkeletonLoader from "./skeleton-loader"
import { OutputPanelProps, TabType } from "./output-panel.types"

export default function OutputPanel({ data, isLoading }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview")

  const tabs: TabType[] = ["overview", "requirements", "architecture", "diagrams", "test-plan"]

  if (!data && !isLoading) {
    return (
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 text-center overflow-auto max-h-[calc(100vh-4rem)]">
        <div className="max-w-md">
          <div className="w-12 sm:w-16 h-12 sm:h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg
              className="w-6 sm:w-8 h-6 sm:h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7 20H5a2 2 0 01-2-2V5a2 2 0 012-2h6.5m6 0h2a2 2 0 012 2v14a2 2 0 01-2 2h-6.5"
              />
            </svg>
          </div>
          <h3 className="text-lg sm:text-lg font-semibold text-foreground mb-2">Generate Your SDLC</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Enter your business idea in the left panel and click "Generate SDLC" to see comprehensive system design
            documentation here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col bg-background overflow-hidden h-full">
      <TabNavigation activeTab={activeTab} onTabChange={(tab: string) => setActiveTab(tab as TabType)} tabs={tabs} />

      {isLoading ? (
        <div className="flex-1 overflow-auto p-6 sm:p-8">
          <SkeletonLoader />
        </div>
      ) : data ? (
        <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-6">
          {activeTab === "overview" && <Overview />}
          {activeTab === "requirements" && <Requirements data={data.requirements} />}
          {activeTab === "architecture" && <Architecture data={data.architecture} />}
          {activeTab === "diagrams" && <Diagrams data={data.diagrams} />}
          {activeTab === "test-plan" && <TestPlan data={data.testPlan} />}
        </div>
      ) : null}

      {data && <ExportButton />}
    </div>
  )
}
