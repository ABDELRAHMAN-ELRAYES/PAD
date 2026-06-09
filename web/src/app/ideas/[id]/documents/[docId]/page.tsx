"use client";

import { useParams } from "next/navigation";
import { DocumentDetailPage } from "@/features/documents";

export default function DocumentDetailRoutePage() {
    const params = useParams();
    const ideaId = params.id as string;
    const docId = params.docId as string;

    return <DocumentDetailPage ideaId={ideaId} docId={docId} />;
}
