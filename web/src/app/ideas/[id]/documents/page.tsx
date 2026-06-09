"use client";

import { useParams } from "next/navigation";
import { DocumentsPage } from "@/features/documents";

export default function IdeaDocumentsRoutePage() {
    const params = useParams();
    const ideaId = params.id as string;

    return <DocumentsPage ideaId={ideaId} />;
}
