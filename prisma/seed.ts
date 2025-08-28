import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userEmail = 'nk8669372@gmail.com'

  console.log('🌱 Starting database seed...')
  console.log(`👤 Creating server for user: ${userEmail}`)

  // Find existing user
  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  })

  if (!user) {
    console.log('❌ User not found. Please create the user first.')
    return
  }

  console.log('✅ User found:', user.displayName)

  // Create the Darkbyte server
  console.log('🏗️ Creating Darkbyte server...')
  
  const server = await prisma.server.create({
    data: {
      name: 'Darkbyte',
      description: 'Darkbyte Discord Server',
      ownerId: user.id
    }
  })

  console.log('✅ Server created:', server.name, '(ID:', server.id, ')')

  // Add user as server member
  await prisma.serverMember.create({
    data: {
      userId: user.id,
      serverId: server.id,
      role: 'owner'
    }
  })

  console.log('✅ User added as server owner')

  // Define categories and their channels
  const categoriesData = [
    {
      name: '𝐒𝐏𝐀𝐖𝐍 𝐀𝐑𝐄𝐀',
      emoji: '┊┊',
      channels: [
        { name: '🔐ᴠᴇʀɪғʏ', type: 'text' },
        { name: '🎀ᴇɴᴛʀʏ', type: 'text' },
        { name: '🧨ᴇxɪᴛ', type: 'text' }
      ]
    },
    {
      name: '𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍',
      emoji: '┊┊',
      channels: [
        { name: '📢ᴀɴɴᴏᴜɴᴄᴇ', type: 'text' },
        { name: '📜ʀᴜʟᴇs', type: 'text' },
        { name: '🔔ᴘᴀᴛɴᴇʀs', type: 'text' }
      ]
    },
    {
      name: '𝐏𝐀𝐈𝐃 𝐒𝐄𝐑𝐕𝐈𝐂𝐄𝐒',
      emoji: '┊┊',
      channels: [
        { name: '💵ᴘᴀɪᴅ sᴇʀᴠᴇʀ', type: 'text' },
        { name: '💰ʜʏᴘᴇʀ sᴇʀᴠᴇʀ', type: 'text' },
        { name: '💵ʙᴏᴛ ʜᴏsᴛ', type: 'text' },
        { name: '💰ᴘᴀɪᴅ ᴠᴘs', type: 'text' },
        { name: '💵ʜᴏsᴛɪɴɢ ᴘʟᴀɴs', type: 'text' },
        { name: '💰ᴅᴇᴠ ᴘʟᴀɴs', type: 'text' }
      ]
    },
    {
      name: '𝐏𝐑𝐄𝐌𝐈𝐔𝐌 𝐀𝐑𝐄𝐀',
      emoji: '┊┊',
      channels: [
        { name: '📢ᴘᴀɪᴅ ᴀʟᴇʀᴛs', type: 'text' },
        { name: '🔔ʀᴇɴᴇᴡ ᴀʟᴇʀᴛs', type: 'text' },
        { name: '💬ᴘᴀɪᴅ ᴄʜᴀᴛ', type: 'text' },
        { name: '🔊ᴘᴀɪᴅ ᴠᴏɪᴄᴇ', type: 'voice' },
        { name: '🔴ʀᴇᴠɪᴇᴡ', type: 'text' }
      ]
    },
    {
      name: '𝐅𝐑𝐄𝐄 𝐆𝐈𝐅𝐓𝐒',
      emoji: '┊┊',
      channels: [
        { name: '🧩ғʀᴇᴇ sᴇʀᴠᴇʀs', type: 'text' },
        { name: '🎁ғʀᴇᴇ ᴅʀᴏᴘs', type: 'text' },
        { name: '🎉ғʀᴇᴇ ᴇᴠᴇɴᴛs', type: 'text' }
      ]
    },
    {
      name: '𝐂𝐇𝐈𝐋𝐋 𝐀𝐑𝐄𝐀',
      emoji: '┊┊',
      channels: [
        { name: '💬ɢʟᴏʙᴀʟ ᴄʜᴀᴛ', type: 'text' },
        { name: '💬ʜɪɴᴅɪ ᴄʜᴀᴛ', type: 'text' },
        { name: '🤖ᴜsᴇ ʙᴏᴛs', type: 'text' },
        { name: '🍁ᴍᴇᴅɪᴀ', type: 'text' },
        { name: '🔢ᴄᴏᴜɴᴛɪɴɢ', type: 'text' },
        { name: '🟩ғᴇᴇᴅʙᴀᴄᴋ', type: 'text' }
      ]
    },
    {
      name: '𝐏𝐀𝐈𝐃 𝐓𝐈𝐂𝐊𝐄𝐓𝐒',
      emoji: '┊┊',
      channels: [
        { name: '📬ᴘᴀɪᴅ ᴛɪᴄᴋᴇᴛs', type: 'text' }
      ]
    },
    {
      name: '𝐒𝐔𝐏𝐏𝐎𝐑𝐓 𝐀𝐑𝐄𝐀',
      emoji: '┊┊',
      channels: [
        { name: '📬ᴀsᴋ sᴜᴘᴘᴏʀᴛ', type: 'text' }
      ]
    },
    {
      name: '𝐕𝐎𝐈𝐂𝐄 𝐀𝐑𝐄𝐀',
      emoji: '┊┊',
      channels: [
        { name: '🔊ᴘʀɪᴠᴀᴛᴇ ᴠᴄ', type: 'voice' },
        { name: '🔊ᴠᴏɪᴄᴇ¹', type: 'voice' },
        { name: '🔊ᴠᴏɪᴄᴇ²', type: 'voice' },
        { name: '🔊ᴠᴏɪᴄᴇ³', type: 'voice' },
        { name: '🔊ᴠᴏɪᴄᴇ⁴', type: 'voice' }
      ]
    },
    {
      name: '𝐇𝐈𝐃𝐃𝐄𝐍 𝐀𝐑𝐄𝐀',
      emoji: '┊┊',
      channels: [
        { name: '📢sᴛᴀғғ ᴀɴᴄʏ', type: 'text' },
        { name: '📜sᴛᴀғғ ʀᴜʟᴇ', type: 'text' },
        { name: '💬sᴛᴀғғ ᴄʜᴀᴛ', type: 'text' },
        { name: '🔊sᴛᴀғғ ᴠᴏɪᴄᴇ', type: 'voice' },
        { name: '📑sᴇʀᴠᴇʀ ʟᴏɢs', type: 'text' },
        { name: '📑ᴛɪᴄᴋᴇᴛ ʟᴏɢs', type: 'text' }
      ]
    }
  ]

  console.log('📁 Creating categories and channels...')

  // Create categories and channels
  for (const categoryData of categoriesData) {
    console.log(`📁 Creating category: ${categoryData.name}`)
    
    const category = await prisma.category.create({
      data: {
        name: categoryData.name,
        emoji: categoryData.emoji,
        serverId: server.id
      }
    })

    console.log(`✅ Category created: ${category.name} (ID: ${category.id})`)

    // Create channels for this category
    for (const channelData of categoryData.channels) {
      console.log(`  📝 Creating channel: ${channelData.name}`)
      
      const channel = await prisma.channel.create({
        data: {
          name: channelData.name,
          type: channelData.type,
          categoryId: category.id,
          serverId: server.id
        }
      })

      console.log(`  ✅ Channel created: ${channel.name} (ID: ${channel.id})`)
    }
  }

  console.log('🎉 Database seeding completed successfully!')
  console.log(`📊 Created ${categoriesData.length} categories with channels`)
  console.log(`🏠 Server URL: http://localhost:3000/server/${server.id}`)
  
  const totalChannels = categoriesData.reduce((sum, cat) => sum + cat.channels.length, 0)
  console.log(`📊 Total channels created: ${totalChannels}`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 