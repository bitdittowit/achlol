-- Add participants column (nullable for backfill)
ALTER TABLE "pranks" ADD COLUMN IF NOT EXISTS "participants" TEXT;

-- Backfill from from_field and to_field
UPDATE "pranks" SET "participants" = COALESCE("from_field", '') || ', ' || COALESCE("to_field", '') WHERE "participants" IS NULL;

-- Default for any remaining nulls
UPDATE "pranks" SET "participants" = '' WHERE "participants" IS NULL;

-- Make participants required
ALTER TABLE "pranks" ALTER COLUMN "participants" SET NOT NULL;

-- Drop old columns
ALTER TABLE "pranks" DROP COLUMN IF EXISTS "from_field";
ALTER TABLE "pranks" DROP COLUMN IF EXISTS "to_field";
