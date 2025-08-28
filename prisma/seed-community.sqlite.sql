-- Seed Community Server and Entry Channel (SQLite)
-- Run with:
--   sqlite3 darkbyte/prisma/dev.db < darkbyte/prisma/seed-community.sqlite.sql
-- Matches code in src/lib/auth.ts
-- COMMUNITY_SERVER_ID = 'cmdyince50002dl08h97cn2rb'
-- ENTRY_CHANNEL_ID    = 'cmdyiobxt0005dlr8mzn946cb'

BEGIN TRANSACTION;

-- 1) Ensure Owner User exists (placeholder owner)
INSERT OR IGNORE INTO User (
  id, email, username, displayName, password, avatar, avatarDecoration, banner, status, description, isAdmin, createdAt, updatedAt
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
  1,
  datetime('now'),
  datetime('now')
);

-- 2) Community Server
INSERT OR IGNORE INTO Server (
  id, name, description, icon, banner, tag, byteeLevel, ownerId, createdAt, updatedAt
) VALUES (
  'cmdyince50002dl08h97cn2rb',
  'Darkbyte Community',
  'Official Darkbyte community server',
  NULL,
  NULL,
  'community',
  0,
  'cmdy_owner_000000000000000001',
  datetime('now'),
  datetime('now')
);

-- 3) Default Category
INSERT OR IGNORE INTO Category (
  id, name, emoji, font, serverId, createdAt, updatedAt
) VALUES (
  'cmdy_category_welcome',
  'Welcome',
  '👋',
  NULL,
  'cmdyince50002dl08h97cn2rb',
  datetime('now'),
  datetime('now')
);

-- 4) Entry Channel (must match ENTRY_CHANNEL_ID)
INSERT OR IGNORE INTO Channel (
  id, name, type, categoryId, serverId, isPrivate, createdAt, updatedAt, backgroundType, backgroundUrl, backgroundColor
) VALUES (
  'cmdyiobxt0005dlr8mzn946cb',
  'entry',
  'text',
  'cmdy_category_welcome',
  'cmdyince50002dl08h97cn2rb',
  0,
  datetime('now'),
  datetime('now'),
  NULL,
  NULL,
  NULL
);

COMMIT;
