"use client";

import { useParams } from "next/navigation";
import { WorkspaceLayout } from "@/features/ideas/components/WorkspaceLayout";

export default function IdeaDetailPage() {
    const params = useParams();
    const ideaId = params.id as string;

    return <WorkspaceLayout initialIdeaId={ideaId} />;
}
