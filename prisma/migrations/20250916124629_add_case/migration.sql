-- CreateEnum
CREATE TYPE "public"."CaseType" AS ENUM ('BUY', 'SELL', 'REMORTGAGE', 'BUY_SELL');

-- CreateEnum
CREATE TYPE "public"."CaseStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."Case" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientDisplayName" TEXT NOT NULL,
    "caseType" "public"."CaseType" NOT NULL,
    "status" "public"."CaseStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "public"."Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
