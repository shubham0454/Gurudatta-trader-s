import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating all users to active status...\n')

  try {
    // Update all users to active
    const result = await prisma.user.updateMany({
      where: {
        status: 'inactive',
      },
      data: {
        status: 'active',
      },
    })

    console.log(`✅ Updated ${result.count} users to active status`)

    // Get counts
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({ where: { status: 'active' } })
    const inactiveUsers = await prisma.user.count({ where: { status: 'inactive' } })

    console.log(`\n📊 Database Statistics:`)
    console.log(`   Total Users: ${totalUsers}`)
    console.log(`   Active: ${activeUsers}`)
    console.log(`   Inactive: ${inactiveUsers}`)
    console.log('\n✅ Update completed successfully!')
  } catch (error) {
    console.error('❌ Error updating users:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

