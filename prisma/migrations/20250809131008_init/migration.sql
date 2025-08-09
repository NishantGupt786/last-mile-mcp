-- CreateTable
CREATE TABLE "public"."run" (
    "id" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."toolCall" (
    "id" SERIAL NOT NULL,
    "runId" TEXT,
    "tool" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."incident" (
    "id" SERIAL NOT NULL,
    "scenarioId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."humanEscalation" (
    "id" SERIAL NOT NULL,
    "scenarioId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "humanEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."packagingFeedback" (
    "id" SERIAL NOT NULL,
    "merchantId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packagingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation" (
    "id" SERIAL NOT NULL,
    "transcript" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);
