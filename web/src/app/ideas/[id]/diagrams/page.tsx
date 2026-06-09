"use client";

import { useParams } from "next/navigation";
import { DiagramsPage } from "@/features/diagrams";

export default function DiagramsRoutePage() {
    const params = useParams();
    const ideaId = params.id as string;

    return <DiagramsPage ideaId={ideaId} />;
}
