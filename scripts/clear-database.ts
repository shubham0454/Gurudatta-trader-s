import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Starting database cleanup...')

  try {
    // Delete in order to respect foreign key constraints
    console.log('Deleting transactions...')
    await prisma.transaction.deleteMany({})
    console.log('✓ Transactions deleted')

    console.log('Deleting bill items...')
    await prisma.billItem.deleteMany({})
    console.log('✓ Bill items deleted')

    console.log('Deleting bills...')
    await prisma.bill.deleteMany({})
    console.log('✓ Bills deleted')

    console.log('Deleting feeds...')
    await prisma.feed.deleteMany({})
    console.log('✓ Feeds deleted')

    console.log('Deleting users...')
    await prisma.user.deleteMany({})
    console.log('✓ Users deleted')

    // Note: Admins are NOT deleted to preserve login access
    console.log('⚠ Admins preserved (not deleted)')

    console.log('\n✅ Database cleanup completed successfully!')
    console.log('All data has been removed except admin users.')
  } catch (error) {
    console.error('❌ Error during database cleanup:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Error clearing database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

