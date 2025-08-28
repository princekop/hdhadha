-- CreateTable
CREATE TABLE "public"."AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New AI Chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "codeHtml" TEXT,
    "codeCss" TEXT,
    "codeJs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiAsset" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT,
    "content" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConversation_userId_createdAt_idx" ON "public"."AiConversation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "public"."AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAsset_conversationId_createdAt_idx" ON "public"."AiAsset"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiAsset" ADD CONSTRAINT "AiAsset_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
