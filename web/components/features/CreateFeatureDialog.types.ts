import { Feature } from "@/lib/types/idea";

export interface CreateFeatureDialogProps {
    ideaId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFeatureCreated: (feature: Feature) => void;
}
