"use client";

import { WorkspaceLayout } from "@/features/ideas";


export default function IdeasPage() {
    // The ideas list is now in the sidebar.
    // This page renders the same workspace layout with no idea selected.
    return <WorkspaceLayout initialIdeaId={null} />;
}
