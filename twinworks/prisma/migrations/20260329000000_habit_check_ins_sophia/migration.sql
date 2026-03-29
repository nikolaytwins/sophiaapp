-- AlterTable
ALTER TABLE "habit_definitions" ADD COLUMN "icon" TEXT;

-- CreateTable
CREATE TABLE "habit_check_ins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitDefinitionId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "habit_check_ins_habitDefinitionId_fkey" FOREIGN KEY ("habitDefinitionId") REFERENCES "habit_definitions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "habit_check_ins_habitDefinitionId_dateKey_key" ON "habit_check_ins"("habitDefinitionId", "dateKey");
