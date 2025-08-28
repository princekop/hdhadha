-- Seed Community Server and Entry Channel (PostgreSQL)
-- Run with:
--   psql "postgresql://USER:PASS@HOST:5432/darkbyte" -f prisma/seed-community.postgres.sql
-- Matches code in src/lib/auth.ts
-- COMMUNITY_SERVER_ID = 'cmdyince50002dl08h97cn2rb'
-- ENTRY_CHANNEL_ID    = 'cmdyiobxt0005dlr8mzn946cb'

-- 1) Owner User (placeholder)
INSERT INTO "User" (
  id, email, username, "displayName", password, avatar, "avatarDecoration", banner, status, description, "isAdmin", "createdAt", "updatedAt"
) VALUES (
  'cmdy_owner_000000000000000001',
  'owner@darkbyte.local',
  'darkbyte_owner',
  'Darkbyte Owner',
  'PLACEHOLDER_PASSWORD_DO_NOT_LOGIN',
  NULL,
  NULL,
  NULL,
  'online',
  NULL,
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2) Community Server
INSERT INTO "Server" (
  id, name, description, icon, banner, tag, "byteeLevel", "ownerId", "createdAt", "updatedAt"
) VALUES (
  'cmdyince50002dl08h97cn2rb',
  'Darkbyte Community',
  'Official Darkbyte community server',
  NULL,
  NULL,
  'community',
  0,
  'cmdy_owner_000000000000000001',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3) Default Category
INSERT INTO "Category" (
  id, name, emoji, font, "serverId", "createdAt", "updatedAt"
) VALUES (
  'cmdy_category_welcome',
  'Welcome',
  '👋',
  NULL,
  'cmdyince50002dl08h97cn2rb',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4) Entry Channel
INSERT INTO "Channel" (
  id, name, type, "categoryId", "serverId", "isPrivate", "createdAt", "updatedAt", "backgroundType", "backgroundUrl", "backgroundColor"
) VALUES (
  'cmdyiobxt0005dlr8mzn946cb',
  'entry',
  'text',
  'cmdy_category_welcome',
  'cmdyince50002dl08h97cn2rb',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;
