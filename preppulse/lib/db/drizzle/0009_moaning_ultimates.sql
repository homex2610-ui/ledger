ALTER TABLE "cohorts" ALTER COLUMN "capacity" SET DEFAULT 25;
UPDATE "cohorts" SET "capacity" = 25;