/*
  Create an 'admin' role on the target server if it does not already exist.
  Optionally assigns the role to the server owner.

  Usage (PowerShell):
    node scripts/create-admin-role.js
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const serverId = 'cmdyince50002dl08h97cn2rb'

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { roles: true, members: true },
  })
  if (!server) throw new Error(`Server ${serverId} not found`)

  let adminRole = server.roles.find(r => (r.name || '').toLowerCase() === 'admin')
  if (!adminRole) {
    adminRole = await prisma.serverRole.create({
      data: {
        name: 'admin',
        color: '#ff5555',
        permissions: JSON.stringify(['ALL']),
        serverId,
      },
    })
    console.log('Created admin role:', adminRole.id)
  } else {
    console.log('Admin role already exists:', adminRole.id)
  }

  // Ensure server owner has the admin role membership row if your schema requires it.
  // Many schemas model role membership in a join table (e.g., ServerRoleMember). If your
  // schema lacks that table, skip this section.
  try {
    // Attempt to find a join model by common names; ignore errors if not present.
    if (prisma.serverRoleMember) {
      const ownerId = server.ownerId
      if (ownerId) {
        const existing = await prisma.serverRoleMember.findFirst({
          where: { roleId: adminRole.id, userId: ownerId },
          select: { id: true },
        })
        if (!existing) {
          await prisma.serverRoleMember.create({ data: { roleId: adminRole.id, userId: ownerId } })
          console.log('Assigned admin role to owner', ownerId)
        }
      }
    }
  } catch (_) {
    // join model not present; ignore
  }

  console.log('Done.')
}

main()
  .catch(err => { console.error(err); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
