"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function IteratePage() {
    const params = useParams();
    const router = useRouter();
    const ideaId = params.id as string;

    useEffect(() => {
        // Deprecated: Chat has been unified into workspace layout split pane.
        // Redirect to unified workspace layout.
        router.replace(`/ideas/${ideaId}`);
    }, [ideaId, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}
