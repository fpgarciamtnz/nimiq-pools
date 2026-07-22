ALTER TABLE "TeamResult" ADD COLUMN "guaranteedStage" TEXT;

UPDATE "TeamResult"
SET "guaranteedStage" = "finishStage"
WHERE "finishStage" IS NOT NULL;
