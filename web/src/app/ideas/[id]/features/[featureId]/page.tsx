"use client";

import { useParams } from "next/navigation";
import { FeatureDetailPage } from "@/features/features";

export default function FeatureDetailRoutePage() {
    const params = useParams();
    const ideaId = params.id as string;
    const featureId = params.featureId as string;

    return <FeatureDetailPage ideaId={ideaId} featureId={featureId} />;
}
