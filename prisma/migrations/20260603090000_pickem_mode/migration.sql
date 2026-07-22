ALTER TABLE "Pool" ADD COLUMN "competitionMode" TEXT NOT NULL DEFAULT 'ballot_only';

ALTER TABLE "PredictionEntry" ADD COLUMN "claimTokenHash" TEXT;
ALTER TABLE "PredictionEntry" ADD COLUMN "claimTokenUsedAt" DATETIME;
ALTER TABLE "PredictionEntry" ADD COLUMN "isLateEntry" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TournamentGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TournamentGroupTeam" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "teamSlug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TournamentGroupTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TournamentGroupTeam_teamSlug_fkey" FOREIGN KEY ("teamSlug") REFERENCES "Team" ("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "GroupPositionPick" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entryId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "teamSlug" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GroupPositionPick_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PredictionEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupPositionPick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupPositionPick_teamSlug_fkey" FOREIGN KEY ("teamSlug") REFERENCES "Team" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnockoutPick" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entryId" TEXT NOT NULL,
  "fixtureId" INTEGER NOT NULL,
  "winnerTeamSlug" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "KnockoutPick_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PredictionEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnockoutPick_winnerTeamSlug_fkey" FOREIGN KEY ("winnerTeamSlug") REFERENCES "Team" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TournamentGroup_name_key" ON "TournamentGroup"("name");
CREATE INDEX "TournamentGroup_sortOrder_idx" ON "TournamentGroup"("sortOrder");
CREATE UNIQUE INDEX "TournamentGroupTeam_groupId_teamSlug_key" ON "TournamentGroupTeam"("groupId", "teamSlug");
CREATE UNIQUE INDEX "TournamentGroupTeam_groupId_sortOrder_key" ON "TournamentGroupTeam"("groupId", "sortOrder");
CREATE INDEX "TournamentGroupTeam_teamSlug_idx" ON "TournamentGroupTeam"("teamSlug");
CREATE UNIQUE INDEX "GroupPositionPick_entryId_groupId_position_key" ON "GroupPositionPick"("entryId", "groupId", "position");
CREATE UNIQUE INDEX "GroupPositionPick_entryId_groupId_teamSlug_key" ON "GroupPositionPick"("entryId", "groupId", "teamSlug");
CREATE INDEX "GroupPositionPick_groupId_idx" ON "GroupPositionPick"("groupId");
CREATE INDEX "GroupPositionPick_teamSlug_idx" ON "GroupPositionPick"("teamSlug");
CREATE UNIQUE INDEX "KnockoutPick_entryId_fixtureId_key" ON "KnockoutPick"("entryId", "fixtureId");
CREATE INDEX "KnockoutPick_fixtureId_idx" ON "KnockoutPick"("fixtureId");
CREATE INDEX "KnockoutPick_winnerTeamSlug_idx" ON "KnockoutPick"("winnerTeamSlug");
CREATE INDEX "PredictionEntry_claimTokenHash_idx" ON "PredictionEntry"("claimTokenHash");
