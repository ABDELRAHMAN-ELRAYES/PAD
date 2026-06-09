"use client";

import { useParams } from "next/navigation";
import { WorkflowPage } from "@/features/workflow";

export default function WorkflowRoutePage() {
    const params = useParams();
    const ideaId = params.id as string;

    return <WorkflowPage ideaId={ideaId} />;
}
