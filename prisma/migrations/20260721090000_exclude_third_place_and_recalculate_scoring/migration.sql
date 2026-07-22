DELETE FROM "KnockoutPick"
WHERE "fixtureId" IN (
  SELECT "fixtureId"
  FROM "ApiFixture"
  WHERE "leagueRound" = 'Third Place'
);

DELETE FROM "ApiSyncMilestone"
WHERE "fixtureId" IN (
  SELECT "fixtureId"
  FROM "ApiFixture"
  WHERE "leagueRound" = 'Third Place'
);

DELETE FROM "ApiFixture"
WHERE "leagueRound" = 'Third Place';

UPDATE "ApiFixture"
SET
  "homeGoals" = CASE
    WHEN "statusShort" = 'PEN' AND "homeGoals" IS NOT NULL AND "penaltyHome" IS NOT NULL
      THEN MAX(0, "homeGoals" - "penaltyHome")
    ELSE "homeGoals"
  END,
  "awayGoals" = CASE
    WHEN "statusShort" = 'PEN' AND "awayGoals" IS NOT NULL AND "penaltyAway" IS NOT NULL
      THEN MAX(0, "awayGoals" - "penaltyAway")
    ELSE "awayGoals"
  END;
