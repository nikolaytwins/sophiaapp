-- AlterTable
ALTER TABLE "habit_definitions" ADD COLUMN "category" TEXT;
ALTER TABLE "habit_definitions" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "habit_definitions" ADD COLUMN "trackMode" TEXT NOT NULL DEFAULT 'toggle';
ALTER TABLE "habit_definitions" ADD COLUMN "countMin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "habit_definitions" ADD COLUMN "countMax" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "habit_check_ins" ADD COLUMN "count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "daily_logs" ADD COLUMN "selfAuditNote" TEXT;
