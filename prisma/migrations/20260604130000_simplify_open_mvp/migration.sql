DROP INDEX IF EXISTS "PredictionEntry_claimTokenHash_idx";

ALTER TABLE "Pool" DROP COLUMN "creatorTokenHash";
ALTER TABLE "PredictionEntry" DROP COLUMN "claimTokenHash";
ALTER TABLE "PredictionEntry" DROP COLUMN "claimTokenUsedAt";
ALTER TABLE "PredictionEntry" DROP COLUMN "isLateEntry";
