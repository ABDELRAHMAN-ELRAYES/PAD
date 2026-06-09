import { ModificationPlan } from "../models/chat";

export interface PlanCardProps {
    plan: ModificationPlan;
    ideaId: string;
    onConfirm: (planId: string) => Promise<void>;
    onRollback?: (planId: string) => Promise<void>;
    onDismiss: () => void;
}
