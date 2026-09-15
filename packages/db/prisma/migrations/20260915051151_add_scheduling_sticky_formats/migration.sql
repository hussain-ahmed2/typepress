-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "is_sticky" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "published_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Content_published_at_idx" ON "Content"("published_at");

-- CreateIndex
CREATE INDEX "Content_is_sticky_idx" ON "Content"("is_sticky");
