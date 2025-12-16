const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding dummy data...\n')

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('Clearing existing data...')
  await prisma.transaction.deleteMany()
  await prisma.billItem.deleteMany()
  await prisma.bill.deleteMany()
  await prisma.feed.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Existing data cleared\n')

  // Create Feeds
  console.log('Creating feeds...')
  const feeds = await Promise.all([
    prisma.feed.create({
      data: {
        name: 'Tiwana',
        brand: 'Premium',
        weight: 25,
        defaultPrice: 850,
        stock: 500,
      },
    }),
    prisma.feed.create({
      data: {
        name: 'Tiwana',
        brand: 'Premium',
        weight: 50,
        defaultPrice: 1650,
        stock: 300,
      },
    }),
    prisma.feed.create({
      data: {
        name: 'Tiwana',
        brand: 'Standard',
        weight: 25,
        defaultPrice: 750,
        stock: 200,
      },
    }),
    prisma.feed.create({
      data: {
        name: 'Tiwana',
        brand: 'Standard',
        weight: 50,
        defaultPrice: 1450,
        stock: 150,
      },
    }),
    prisma.feed.create({
      data: {
        name: 'Cattle Feed',
        brand: 'Premium',
        weight: 25,
        defaultPrice: 900,
        stock: 400,
      },
    }),
    prisma.feed.create({
      data: {
        name: 'Cattle Feed',
        brand: 'Premium',
        weight: 50,
        defaultPrice: 1750,
        stock: 250,
      },
    }),
  ])
  console.log(`✅ Created ${feeds.length} feeds\n`)

  // Create Users
  console.log('Creating users...')
  const users = await Promise.all([
    prisma.user.create({
      data: {
        userCode: 'BMC-0001',
        name: 'Rajesh Kumar',
        mobileNo: '9876543210',
        address: '123 Main Street, Village A',
        email: 'rajesh@example.com',
        userType: 'BMC',
        status: 'active',
      },
    }),
    prisma.user.create({
      data: {
        userCode: 'BMC-0002',
        name: 'Priya Sharma',
        mobileNo: '9876543211',
        address: '456 Farm Road, Village B',
        email: 'priya@example.com',
        userType: 'BMC',
        status: 'active',
      },
    }),
    prisma.user.create({
      data: {
        userCode: 'BMC-0003',
        name: 'Amit Patel',
        mobileNo: '9876543212',
        address: '789 Dairy Lane, Village C',
        userType: 'BMC',
        status: 'active',
      },
    }),
    prisma.user.create({
      data: {
        userCode: 'DAB-0001',
        name: 'Sunita Devi',
        mobileNo: '9876543213',
        address: '321 Cow Street, Village D',
        email: 'sunita@example.com',
        userType: 'Dabhadi',
        status: 'active',
      },
    }),
    prisma.user.create({
      data: {
        userCode: 'BMC-0004',
        name: 'Vikram Singh',
        mobileNo: '9876543214',
        address: '654 Milk Road, Village E',
        userType: 'BMC',
        status: 'active',
      },
    }),
  ])
  console.log(`✅ Created ${users.length} users\n`)

  // Create Bills with different statuses
  console.log('Creating bills...')
  const bills = []

  // Bill 1: Fully paid
  const bill1 = await prisma.bill.create({
    data: {
      billNumber: 'BILL-000001',
      userId: users[0].id,
      totalAmount: 2550,
      paidAmount: 2550,
      pendingAmount: 0,
      status: 'paid',
      items: {
        create: [
          {
            feedId: feeds[0].id, // Tiwana 25kg Premium
            quantity: 3,
            unitPrice: 850,
            totalPrice: 2550,
          },
        ],
      },
    },
  })
  bills.push(bill1)

  // Update stock
  await prisma.feed.update({
    where: { id: feeds[0].id },
    data: { stock: { decrement: 3 } },
  })

  // Transaction for bill1
  await prisma.transaction.create({
    data: {
      userId: users[0].id,
      billId: bill1.id,
      amount: 2550,
      type: 'payment',
      description: 'Payment for BILL-000001',
    },
  })

  // Bill 2: Partially paid
  const bill2 = await prisma.bill.create({
    data: {
      billNumber: 'BILL-000002',
      userId: users[1].id,
      totalAmount: 5000,
      paidAmount: 3000,
      pendingAmount: 2000,
      status: 'partial',
      items: {
        create: [
          {
            feedId: feeds[1].id, // Tiwana 50kg Premium
            quantity: 2,
            unitPrice: 1650,
            totalPrice: 3300,
          },
          {
            feedId: feeds[2].id, // Tiwana 25kg Standard
            quantity: 2,
            unitPrice: 750,
            totalPrice: 1500,
          },
        ],
      },
    },
  })
  bills.push(bill2)

  await prisma.feed.update({
    where: { id: feeds[1].id },
    data: { stock: { decrement: 2 } },
  })
  await prisma.feed.update({
    where: { id: feeds[2].id },
    data: { stock: { decrement: 2 } },
  })

  // Transactions for bill2
  await prisma.transaction.create({
    data: {
      userId: users[1].id,
      billId: bill2.id,
      amount: 2000,
      type: 'payment',
      description: 'Partial payment for BILL-000002',
    },
  })
  await prisma.transaction.create({
    data: {
      userId: users[1].id,
      billId: bill2.id,
      amount: 1000,
      type: 'payment',
      description: 'Second payment for BILL-000002',
    },
  })

  // Bill 3: Pending
  const bill3 = await prisma.bill.create({
    data: {
      billNumber: 'BILL-000003',
      userId: users[2].id,
      totalAmount: 3600,
      paidAmount: 0,
      pendingAmount: 3600,
      status: 'pending',
      items: {
        create: [
          {
            feedId: feeds[3].id, // Tiwana 50kg Standard
            quantity: 2,
            unitPrice: 1450,
            totalPrice: 2900,
          },
          {
            feedId: feeds[4].id, // Cattle Feed 25kg Premium
            quantity: 1,
            unitPrice: 900,
            totalPrice: 900,
          },
        ],
      },
    },
  })
  bills.push(bill3)

  await prisma.feed.update({
    where: { id: feeds[3].id },
    data: { stock: { decrement: 2 } },
  })
  await prisma.feed.update({
    where: { id: feeds[4].id },
    data: { stock: { decrement: 1 } },
  })

  // Bill 4: Fully paid (today)
  const bill4 = await prisma.bill.create({
    data: {
      billNumber: 'BILL-000004',
      userId: users[3].id,
      totalAmount: 1750,
      paidAmount: 1750,
      pendingAmount: 0,
      status: 'paid',
      items: {
        create: [
          {
            feedId: feeds[5].id, // Cattle Feed 50kg Premium
            quantity: 1,
            unitPrice: 1750,
            totalPrice: 1750,
          },
        ],
      },
    },
  })
  bills.push(bill4)

  await prisma.feed.update({
    where: { id: feeds[5].id },
    data: { stock: { decrement: 1 } },
  })

  await prisma.transaction.create({
    data: {
      userId: users[3].id,
      billId: bill4.id,
      amount: 1750,
      type: 'payment',
      description: 'Payment for BILL-000004',
    },
  })

  // Bill 5: Partially paid
  const bill5 = await prisma.bill.create({
    data: {
      billNumber: 'BILL-000005',
      userId: users[4].id,
      totalAmount: 4200,
      paidAmount: 2000,
      pendingAmount: 2200,
      status: 'partial',
      items: {
        create: [
          {
            feedId: feeds[0].id, // Tiwana 25kg Premium
            quantity: 2,
            unitPrice: 850,
            totalPrice: 1700,
          },
          {
            feedId: feeds[1].id, // Tiwana 50kg Premium
            quantity: 1,
            unitPrice: 1650,
            totalPrice: 1650,
          },
          {
            feedId: feeds[2].id, // Tiwana 25kg Standard
            quantity: 1,
            unitPrice: 750,
            totalPrice: 750,
          },
        ],
      },
    },
  })
  bills.push(bill5)

  await prisma.feed.update({
    where: { id: feeds[0].id },
    data: { stock: { decrement: 2 } },
  })
  await prisma.feed.update({
    where: { id: feeds[1].id },
    data: { stock: { decrement: 1 } },
  })
  await prisma.feed.update({
    where: { id: feeds[2].id },
    data: { stock: { decrement: 1 } },
  })

  await prisma.transaction.create({
    data: {
      userId: users[4].id,
      billId: bill5.id,
      amount: 2000,
      type: 'payment',
      description: 'Partial payment for BILL-000005',
    },
  })

  console.log(`✅ Created ${bills.length} bills\n`)

  console.log('📊 Summary:')
  console.log(`   Feeds: ${feeds.length}`)
  console.log(`   Users: ${users.length}`)
  console.log(`   Bills: ${bills.length}`)
  console.log(`   Total Transactions: ${await prisma.transaction.count()}`)
  console.log('\n✅ Dummy data seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

