CREATE TABLE "ApiSyncMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" INTEGER NOT NULL,
    "milestone" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" DATETIME,
    "completedAt" DATETIME,
    "message" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ApiSyncMilestone_fixtureId_milestone_key" ON "ApiSyncMilestone"("fixtureId", "milestone");
CREATE INDEX "ApiSyncMilestone_dueAt_idx" ON "ApiSyncMilestone"("dueAt");
CREATE INDEX "ApiSyncMilestone_status_idx" ON "ApiSyncMilestone"("status");
