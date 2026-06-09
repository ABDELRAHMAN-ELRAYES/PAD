import { Feature } from "../models/features";

export interface CreateFeatureDialogProps {
    ideaId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFeatureCreated: (feature: Feature) => void;
}
