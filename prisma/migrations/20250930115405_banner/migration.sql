-- CreateTable
CREATE TABLE "public"."Banner" (
    "id" UUID NOT NULL,
    "image" TEXT,
    "text" TEXT,
    "link" TEXT,
    "data" JSONB,
    "type" TEXT,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
