PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "PredictionAnswer";
DROP TABLE IF EXISTS "PredictionEntry";
DROP TABLE IF EXISTS "TeamResult";
DROP TABLE IF EXISTS "Team";
DROP TABLE IF EXISTS "Pool";
DROP TABLE IF EXISTS "OfficialResult";
DROP TABLE IF EXISTS "PredictionCategory";
DROP TABLE IF EXISTS "ScoringTier";
DROP TABLE IF EXISTS "Invite";
DROP TABLE IF EXISTS "GameConfig";

PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'World Cup Pick Party',
    "predictionDeadline" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Pool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Team" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fifaCode" TEXT NOT NULL,
    "fifaRank" INTEGER NOT NULL,
    "qualifiedRankOrder" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "finishStage" TEXT,
    "teamSlug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamResult_teamSlug_fkey" FOREIGN KEY ("teamSlug") REFERENCES "Team" ("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PredictionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "displayNameKey" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PredictionEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PredictionAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionKey" TEXT NOT NULL,
    "teamSlug" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PredictionAnswer_teamSlug_fkey" FOREIGN KEY ("teamSlug") REFERENCES "Team" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PredictionAnswer_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PredictionEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Pool_code_key" ON "Pool"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Team_fifaCode_key" ON "Team"("fifaCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_qualifiedRankOrder_idx" ON "Team"("qualifiedRankOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_tier_idx" ON "Team"("tier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamResult_teamSlug_key" ON "TeamResult"("teamSlug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PredictionEntry_poolId_displayNameKey_key" ON "PredictionEntry"("poolId", "displayNameKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PredictionAnswer_entryId_questionKey_key" ON "PredictionAnswer"("entryId", "questionKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PredictionAnswer_teamSlug_idx" ON "PredictionAnswer"("teamSlug");
