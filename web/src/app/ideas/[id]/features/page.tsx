"use client";

import { useParams } from "next/navigation";
import { FeaturesPage } from "@/features/features";

export default function FeaturesRoutePage() {
    const params = useParams();
    const ideaId = params.id as string;

    return <FeaturesPage ideaId={ideaId} />;
}
