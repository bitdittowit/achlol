-- AlterTable
ALTER TABLE "pranks" ADD COLUMN IF NOT EXISTS "witness_user_id" INTEGER;
ALTER TABLE "pranks" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ;

-- AddForeignKey
ALTER TABLE "pranks" ADD CONSTRAINT "pranks_witness_user_id_fkey" FOREIGN KEY ("witness_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
