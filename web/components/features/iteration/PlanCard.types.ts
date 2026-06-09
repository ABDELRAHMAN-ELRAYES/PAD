import { ModificationPlan } from "@/lib/types/idea";

export interface PlanCardProps {
    plan: ModificationPlan;
    ideaId: string;
    onConfirm: (planId: string) => Promise<void>;
    onRollback?: (planId: string) => Promise<void>;
    onDismiss: () => void;
}
