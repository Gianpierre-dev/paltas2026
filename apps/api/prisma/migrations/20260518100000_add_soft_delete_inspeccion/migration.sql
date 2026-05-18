-- AlterTable
ALTER TABLE "inspecciones" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "inspecciones_deleted_at_idx" ON "inspecciones"("deleted_at");
