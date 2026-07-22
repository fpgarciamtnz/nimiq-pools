DELETE FROM "TeamResult";
DELETE FROM "ApiStanding" WHERE "teamApiId" IS NULL;
DELETE FROM "TournamentGroupTeam"
WHERE "groupId" IN (
  SELECT "id"
  FROM "TournamentGroup"
  WHERE "name" IN ('Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H', 'Group I', 'Group J', 'Group K', 'Group L')
    AND "id" NOT IN (SELECT "groupId" FROM "GroupPositionPick")
);
DELETE FROM "TournamentGroup"
WHERE "name" IN ('Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H', 'Group I', 'Group J', 'Group K', 'Group L')
  AND "id" NOT IN (SELECT "groupId" FROM "GroupPositionPick");
