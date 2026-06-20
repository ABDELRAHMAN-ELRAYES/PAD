-- AlterTable
ALTER TABLE "feature_versions" ADD COLUMN     "acceptance_criteria" JSONB,
ADD COLUMN     "business_value" TEXT,
ADD COLUMN     "complexity" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "dependencies" JSONB,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "suggested_task_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "technical_scope" TEXT,
ADD COLUMN     "user_value" TEXT;

-- AlterTable
ALTER TABLE "features" ADD COLUMN     "acceptance_criteria" JSONB,
ADD COLUMN     "business_value" TEXT,
ADD COLUMN     "complexity" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "dependencies" JSONB,
ADD COLUMN     "suggested_task_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "technical_scope" TEXT,
ADD COLUMN     "user_value" TEXT;
