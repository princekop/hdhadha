// Migrate all data from SQLite (dev.db) to Postgres using Prisma
// Usage (1st time):
//   # Generate dedicated clients (one for SQLite, one for Postgres)
//   SQLITE_URL="file:./prisma/dev.db" pnpm prisma generate --schema=prisma/schema.sqlite.prisma
//   POSTGRES_URL="postgresql://user:pass@localhost:5432/darkbyte" pnpm prisma generate --schema=prisma/schema.postgres.prisma
//   # Run the migration
//   node scripts/migrate-sqlite-to-postgres.mjs

// IMPORTANT:
// - This script imports Prisma clients from generated outputs:
//     prisma/generated/sqlite and prisma/generated/postgres
// - Ensure you generated them with the commands above before running.

import { PrismaClient as SqliteClient } from '../prisma/generated/sqlite/index.js'
import { PrismaClient as PostgresClient } from '../prisma/generated/postgres/index.js'

const src = new SqliteClient()
const dst = new PostgresClient()

async function copy(modelName, fetchAll, createMany) {
  const rows = await fetchAll()
  if (!rows.length) {
    console.log(`- ${modelName}: 0 rows (skipped)`)    
    return
  }
  // Chunk to avoid exceeding parameter limits
  const chunkSize = 1000
  let inserted = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await createMany(chunk)
    inserted += chunk.length
  }
  console.log(`- ${modelName}: inserted/upserted ${inserted}`)
}

async function main() {
  console.log('Connecting...')
  // Queries run on both clients to ensure connections
  await src.$connect(); await dst.$connect()
  console.log('Source (SQLite): prisma/generated/sqlite (SQLITE_URL used at generate-time)')
  console.log('Target (Postgres): prisma/generated/postgres (POSTGRES_URL used at generate-time)')

  // Order matters due to FKs
  // 1) Users
  await copy(
    'User',
    () => src.user.findMany(),
    (data) => dst.user.createMany({ data, skipDuplicates: true })
  )

  // 2) Accounts, Sessions, VerificationToken
  await copy(
    'Account',
    () => src.account.findMany(),
    (data) => dst.account.createMany({ data, skipDuplicates: true })
  )
  await copy(
    'Session',
    () => src.session.findMany(),
    (data) => dst.session.createMany({ data, skipDuplicates: true })
  )
  await copy(
    'VerificationToken',
    () => src.verificationToken.findMany(),
    (data) => dst.verificationToken.createMany({ data, skipDuplicates: true })
  )

  // 3) Servers
  await copy(
    'Server',
    () => src.server.findMany(),
    (data) => dst.server.createMany({ data, skipDuplicates: true })
  )

  // 4) ServerRole
  await copy(
    'ServerRole',
    () => src.serverRole.findMany(),
    (data) => dst.serverRole.createMany({ data, skipDuplicates: true })
  )

  // 5) Categories
  await copy(
    'Category',
    () => src.category.findMany(),
    (data) => dst.category.createMany({ data, skipDuplicates: true })
  )

  // 6) Channels
  await copy(
    'Channel',
    () => src.channel.findMany(),
    (data) => dst.channel.createMany({ data, skipDuplicates: true })
  )

  // 7) ServerMember
  await copy(
    'ServerMember',
    () => src.serverMember.findMany(),
    (data) => dst.serverMember.createMany({ data, skipDuplicates: true })
  )

  // 8) ChannelPermission
  await copy(
    'ChannelPermission',
    () => src.channelPermission.findMany(),
    (data) => dst.channelPermission.createMany({ data, skipDuplicates: true })
  )

  // 9) Messages
  await copy(
    'Message',
    () => src.message.findMany(),
    (data) => dst.message.createMany({ data, skipDuplicates: true })
  )

  // 10) MessageReaction
  await copy(
    'MessageReaction',
    () => src.messageReaction.findMany(),
    (data) => dst.messageReaction.createMany({ data, skipDuplicates: true })
  )

  // 11) MessageReactionUser
  await copy(
    'MessageReactionUser',
    () => src.messageReactionUser.findMany(),
    (data) => dst.messageReactionUser.createMany({ data, skipDuplicates: true })
  )

  // 12) MessageView
  await copy(
    'MessageView',
    () => src.messageView.findMany(),
    (data) => dst.messageView.createMany({ data, skipDuplicates: true })
  )

  // 13) Invites
  await copy(
    'Invite',
    () => src.invite.findMany(),
    (data) => dst.invite.createMany({ data, skipDuplicates: true })
  )

  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await src.$disconnect(); await dst.$disconnect() })
