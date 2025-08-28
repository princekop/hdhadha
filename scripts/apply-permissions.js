/*
  Apply channel permission configuration for server cmdyince50002dl08h97cn2rb

  Usage:
    $env:ALLOW_USER_ID="<userId>"; node scripts/apply-permissions.js

  Notes:
  - Requires an existing server role named 'admin' on the target server.
  - Creates/updates ChannelPermission rows to enforce:
    * Admin-only chat in listed text channels
    * Only a specific user (and admins) can chat in specified channels
    * Only admins can see/join the specified voice channel (canRead)
*/

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function upsertPermission(channelId, roleId, userId, key, value) {
  const allowPerm = `allow:${key}`
  const denyPerm = `deny:${key}`
  if (value === true) {
    const exists = await prisma.channelPermission.findFirst({
      where: { channelId, roleId: roleId || null, userId: userId || null, permission: allowPerm },
      select: { id: true },
    })
    if (!exists) {
      await prisma.channelPermission.create({ data: { channelId, roleId: roleId || null, userId: userId || null, permission: allowPerm } })
    }
    await prisma.channelPermission.deleteMany({ where: { channelId, roleId: roleId || null, userId: userId || null, permission: denyPerm } })
  } else if (value === false) {
    const exists = await prisma.channelPermission.findFirst({
      where: { channelId, roleId: roleId || null, userId: userId || null, permission: denyPerm },
      select: { id: true },
    })
    if (!exists) {
      await prisma.channelPermission.create({ data: { channelId, roleId: roleId || null, userId: userId || null, permission: denyPerm } })
    }
    await prisma.channelPermission.deleteMany({ where: { channelId, roleId: roleId || null, userId: userId || null, permission: allowPerm } })
  } else {
    await prisma.channelPermission.deleteMany({ where: { channelId, roleId: roleId || null, userId: userId || null, permission: { in: [allowPerm, denyPerm] } } })
  }
}

async function main() {
  const serverId = 'cmdyince50002dl08h97cn2rb'

  // Channels where only admins can chat (text)
  const adminOnlyText = [
    'cmdyiobxt0005dlr8mzn946cb',
    'cmdyioc0p000bdlr8hf6vxxvr',
    'cmdyioc1o000ddlr8874u8ns0',
    'cmdyioc2s000fdlr8fqyocipl',
    'cmdyioc4w000jdlr8kvkgkfio',
    'cmdyioc87000pdlr8ozzkhoqu',
    'cmdyioc9b000rdlr80fvzsji0',
  ]

  // Channels where a single user (and admins) can chat
  const singleUserText = [
    'cmdyiocn3001hdlr8ly2zllzi',
    'cmdyiocp1001ldlr8vb9w63pg', // bot use
  ]

  // Voice channel visible/joinable by admins only
  const adminOnlyVoice = 'cmdyiocy20023dlr89e23uo0f'

  const ALLOW_USER_ID = process.env.ALLOW_USER_ID
  if (!ALLOW_USER_ID) {
    throw new Error('Set ALLOW_USER_ID env var to the userId allowed to chat in the designated channels')
  }

  // Fetch server & admin role
  const server = await prisma.server.findUnique({ where: { id: serverId }, include: { roles: true } }).catch(() => null)
  if (!server) throw new Error(`Server ${serverId} not found`)

  const adminRole = server.roles.find(r => (r.name || '').toLowerCase() === 'admin')
  if (!adminRole) {
    throw new Error("Admin role not found on server. Please create a role named 'admin' and rerun.")
  }

  // Validate channels exist and belong to server
  const allIds = [...adminOnlyText, ...singleUserText, adminOnlyVoice]
  const channels = await prisma.channel.findMany({ where: { id: { in: allIds } }, select: { id: true, serverId: true, type: true, name: true } })
  const missing = allIds.filter(id => !channels.find(c => c.id === id))
  if (missing.length) {
    console.warn('Warning: some channel IDs not found:', missing)
  }
  const wrongServer = channels.filter(c => c.serverId !== serverId)
  if (wrongServer.length) {
    throw new Error('Some channels do not belong to target server: ' + wrongServer.map(c => `${c.id}(${c.name})`).join(', '))
  }

  // Apply admin-only chat rules
  for (const chId of adminOnlyText) {
    // Everyone can read
    await upsertPermission(chId, null, null, 'canRead', true)
    // @everyone: deny send & gifs
    await upsertPermission(chId, null, null, 'canSend', false)
    await upsertPermission(chId, null, null, 'canSendGifs', false)
    // admin role: allow send & gifs
    await upsertPermission(chId, adminRole.id, null, 'canSend', true)
    await upsertPermission(chId, adminRole.id, null, 'canSendGifs', true)
  }

  // Apply single-user chat rules
  for (const chId of singleUserText) {
    // Everyone can read
    await upsertPermission(chId, null, null, 'canRead', true)
    // @everyone: deny send & gifs
    await upsertPermission(chId, null, null, 'canSend', false)
    await upsertPermission(chId, null, null, 'canSendGifs', false)
    // admin role: allow
    await upsertPermission(chId, adminRole.id, null, 'canSend', true)
    await upsertPermission(chId, adminRole.id, null, 'canSendGifs', true)
    // specific user: allow
    await upsertPermission(chId, null, ALLOW_USER_ID, 'canSend', true)
    await upsertPermission(chId, null, ALLOW_USER_ID, 'canSendGifs', true)
  }

  // Voice visibility: admins only
  await upsertPermission(adminOnlyVoice, null, null, 'canRead', false)
  await upsertPermission(adminOnlyVoice, adminRole.id, null, 'canRead', true)

  console.log('Permission updates completed.')
}

main()
  .catch(err => { console.error(err); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
