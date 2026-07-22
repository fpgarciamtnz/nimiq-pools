ALTER TABLE "Team" ADD COLUMN "footballDataId" INTEGER;
CREATE UNIQUE INDEX "Team_footballDataId_key" ON "Team"("footballDataId");

DELETE FROM "KnockoutPick";
DELETE FROM "ApiSyncMilestone";
DELETE FROM "ApiSyncLog";
DELETE FROM "ApiSyncState";
DELETE FROM "ApiStanding";
DELETE FROM "TournamentGroupTeam";
DELETE FROM "TournamentGroup";
DELETE FROM "ApiFixture";

UPDATE "Team"
SET
  "footballDataId" = NULL,
  "logoUrl" = NULL,
  "sourceUpdatedAt" = NULL,
  "apiFootballId" = NULL;
