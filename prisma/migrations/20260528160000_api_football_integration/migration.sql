-- Add API-Football source metadata to existing teams and results.
ALTER TABLE "Team" ADD COLUMN "apiFootballId" INTEGER;
ALTER TABLE "Team" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Team" ADD COLUMN "sourceUpdatedAt" DATETIME;

ALTER TABLE "TeamResult" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "TeamResult" ADD COLUMN "manualOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeamResult" ADD COLUMN "sourceUpdatedAt" DATETIME;
UPDATE "TeamResult" SET "manualOverride" = true WHERE "finishStage" IS NOT NULL;

CREATE UNIQUE INDEX "Team_apiFootballId_key" ON "Team"("apiFootballId");

CREATE TABLE "ApiFixture" (
    "fixtureId" INTEGER NOT NULL PRIMARY KEY,
    "leagueRound" TEXT,
    "statusShort" TEXT NOT NULL,
    "statusLong" TEXT NOT NULL,
    "elapsed" INTEGER,
    "kickoffAt" DATETIME NOT NULL,
    "venueName" TEXT,
    "venueCity" TEXT,
    "homeTeamApiId" INTEGER,
    "awayTeamApiId" INTEGER,
    "homeTeamSlug" TEXT,
    "awayTeamSlug" TEXT,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "penaltyHome" INTEGER,
    "penaltyAway" INTEGER,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ApiFixture_kickoffAt_idx" ON "ApiFixture"("kickoffAt");
CREATE INDEX "ApiFixture_isLive_idx" ON "ApiFixture"("isLive");
CREATE INDEX "ApiFixture_statusShort_idx" ON "ApiFixture"("statusShort");

CREATE TABLE "ApiStanding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupName" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamApiId" INTEGER,
    "teamSlug" TEXT,
    "teamName" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "goalsDiff" INTEGER NOT NULL,
    "description" TEXT,
    "form" TEXT,
    "played" INTEGER NOT NULL,
    "win" INTEGER NOT NULL,
    "draw" INTEGER NOT NULL,
    "lose" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "sourceUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ApiStanding_groupName_teamName_key" ON "ApiStanding"("groupName", "teamName");
CREATE INDEX "ApiStanding_teamSlug_idx" ON "ApiStanding"("teamSlug");

CREATE TABLE "ApiSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "dailyRemaining" TEXT,
    "minuteLimit" TEXT,
    "minuteRemaining" TEXT,
    "message" TEXT,
    "error" TEXT
);

CREATE TABLE "ApiSyncState" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "lastStartedAt" DATETIME,
    "lastFinishedAt" DATETIME,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "error" TEXT,
    "updatedAt" DATETIME NOT NULL
);
