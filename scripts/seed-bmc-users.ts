import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load BMC users data from JSON file
let bmcUsersData: any[] = []

// Try to load from JSON file
const jsonFilePath = path.join(__dirname, 'bmc-users-data.json')
if (fs.existsSync(jsonFilePath)) {
  try {
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8')
    bmcUsersData = JSON.parse(fileContent)
    console.log(`📁 Loaded ${bmcUsersData.length} users from JSON file`)
  } catch (error) {
    console.log('⚠ Could not load JSON file')
  }
}

async function main() {
  console.log('🌱 Seeding BMC users...\n')

  try {
    if (bmcUsersData.length === 0) {
      console.log('❌ No BMC users data found in bmc-users-data.json')
      console.log('Please add your BMC users JSON data to scripts/bmc-users-data.json')
      process.exit(1)
    }

    // Create users (don't clear existing data - we want to keep Dabhadi users)
    console.log(`Creating ${bmcUsersData.length} BMC users...`)
    let created = 0
    let skipped = 0
    let activeCount = 0
    let inactiveCount = 0

    for (const userData of bmcUsersData) {
      try {
        // Build name from first_name and last_name
        const name = [userData.first_name, userData.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || userData.name_en || `User ${userData.code}`

        // Generate userCode: BMC-{code}
        const userCode = `BMC-${userData.code}`

        // Map status: All BMC users should be active
        const status = 'active'
        
        if (status === 'active') {
          activeCount++
        } else {
          inactiveCount++
        }

        // Use mobile number or generate a placeholder if empty
        const mobileNo = userData.mobile || `0000000000`

        // Create user
        await prisma.user.create({
          data: {
            userCode,
            name,
            mobileNo,
            email: userData.email || null,
            userType: 'BMC',
            status,
          },
        })
        created++
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠ Skipped duplicate user code: BMC-${userData.code}`)
          skipped++
        } else {
          console.error(`❌ Error creating user BMC-${userData.code}:`, error.message)
          skipped++
        }
      }
    }

    console.log(`\n✅ Created ${created} users`)
    console.log(`   📊 Active: ${activeCount}`)
    console.log(`   📊 Inactive: ${inactiveCount}`)
    if (skipped > 0) {
      console.log(`⚠ Skipped ${skipped} users`)
    }
    console.log('\n✅ Seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding BMC users:', error)
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

