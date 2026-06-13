/*
  Warnings:

  - You are about to drop the column `applied_action_count` on the `iteration_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `failure_reason` on the `iteration_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `plan_id` on the `iteration_suggestions` table. All the data in the column will be lost.
  - You are about to drop the column `total_action_count` on the `iteration_suggestions` table. All the data in the column will be lost.
  - You are about to drop the `artifact_change_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `modification_plan_actions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `modification_plans` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "artifact_change_records" DROP CONSTRAINT "artifact_change_records_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "iteration_suggestions" DROP CONSTRAINT "iteration_suggestions_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "modification_plan_actions" DROP CONSTRAINT "modification_plan_actions_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "modification_plans" DROP CONSTRAINT "modification_plans_session_id_fkey";

-- AlterTable
ALTER TABLE "iteration_suggestions" DROP COLUMN "applied_action_count",
DROP COLUMN "failure_reason",
DROP COLUMN "plan_id",
DROP COLUMN "total_action_count";

-- DropTable
DROP TABLE "artifact_change_records";

-- DropTable
DROP TABLE "modification_plan_actions";

-- DropTable
DROP TABLE "modification_plans";
