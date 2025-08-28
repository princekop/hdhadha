const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeAdmin() {
  try {
    // Replace 'your-username' with the actual username you want to make admin
    const username = 'your-username'
    
    const user = await prisma.user.update({
      where: { username },
      data: { isAdmin: true }
    })
    
    console.log(`User ${user.username} is now an admin!`)
  } catch (error) {
    console.error('Error making user admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdmin() 