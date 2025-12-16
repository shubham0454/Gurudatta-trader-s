const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const mobileNo = process.env.ADMIN_MOBILE || '7410537296'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Admin'

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { mobileNo },
  })

  if (existingAdmin) {
    console.log('Admin user already exists with mobile:', mobileNo)
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create admin
  const admin = await prisma.admin.create({
    data: {
      mobileNo,
      password: hashedPassword,
      name,
    },
  })

  console.log('Admin user created successfully!')
  console.log('Mobile:', mobileNo)
  console.log('Password:', password)
  console.log('Please change the password after first login!')
}

main()
  .catch((e) => {
    console.error('Error seeding admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

