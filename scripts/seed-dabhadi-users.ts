import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load Dabhadi users data from JSON file or use embedded data
let dabhadiUsersData: any[] = []

// Try to load from JSON file first
const jsonFilePath = path.join(__dirname, 'dabhadi-users-data.json')
if (fs.existsSync(jsonFilePath)) {
  try {
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8')
    dabhadiUsersData = JSON.parse(fileContent)
    console.log(`📁 Loaded ${dabhadiUsersData.length} users from JSON file`)
  } catch (error) {
    console.log('⚠ Could not load JSON file, using embedded data')
  }
}

// Embedded data (fallback if JSON file doesn't exist or is empty)
if (dabhadiUsersData.length === 0) {
  dabhadiUsersData = [
  { id: 797020, code: "532", first_name: "श्री विशाल पाटील", last_name: "( सोयगाव )", name_en: "", email: null, mobile: "", status: 0 },
  { id: 1202481, code: "3105", first_name: "Akash", last_name: "Kshirsagar", name_en: "Akash Kshirsagar", email: null, mobile: "8806855088", status: 0 },
  { id: 759171, code: "26", first_name: "श्री राजू", last_name: "देवरे", name_en: "", email: null, mobile: "9588646195", status: 0 },
  { id: 736364, code: "27", first_name: "श्री सुभाष", last_name: "कदम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403259, code: "185", first_name: "दिशु", last_name: "पवार", name_en: "", email: null, mobile: "7768909073", status: 0 },
  { id: 403248, code: "174", first_name: "संभाजी", last_name: "निकम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 899166, code: "51", first_name: "श्री दिपक", last_name: "हिरे", name_en: "", email: null, mobile: "9766991855", status: 0 },
  { id: 1085235, code: "200", first_name: ".शेकर", last_name: ".निकम", name_en: "", email: null, mobile: "9588476290", status: 0 },
  { id: 441482, code: "4", first_name: "मनोज", last_name: "निकम", name_en: "", email: null, mobile: "9096370617", status: 0 },
  { id: 443793, code: "1035", first_name: "रविंद्र", last_name: "तोरवणे", name_en: "", email: null, mobile: "8830571118", status: 0 },
  { id: 403239, code: "2", first_name: "श्री धिरज", last_name: "पवार", name_en: "", email: "", mobile: "7378448775", status: 0 },
  { id: 426340, code: "520", first_name: "श्री रविराज प्रभाकर धाबळे", last_name: "( मुंजवाड 2)", name_en: "", email: null, mobile: "9503731192", status: 0 },
  { id: 442754, code: "1038", first_name: "अनिल", last_name: "याधव", name_en: "", email: null, mobile: "9960905639", status: 0 },
  { id: 442755, code: "1502", first_name: "लोकेश", last_name: "देवरे", name_en: "", email: null, mobile: "7721837334", status: 0 },
  { id: 442759, code: "1506", first_name: "रातिरकर", last_name: "", name_en: "", email: null, mobile: "7387302982", status: 0 },
  { id: 442767, code: "79", first_name: "साई", last_name: "निकम", name_en: "", email: null, mobile: "9096494016", status: 2 },
  { id: 442768, code: "1054", first_name: "परिमन", last_name: "तोरवणे", name_en: "", email: null, mobile: "7758911043", status: 0 },
  { id: 442770, code: "1520", first_name: "अमृत", last_name: "पवार", name_en: "", email: null, mobile: "", status: 0 },
  { id: 442771, code: "1050", first_name: "दिपक", last_name: "तोरवणे", name_en: "", email: null, mobile: "9767485791", status: 0 },
  { id: 442772, code: "1519", first_name: "प्रशांत", last_name: "पवार", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403258, code: "35", first_name: "ज्ञानेश्वर", last_name: "जाधव", name_en: "", email: null, mobile: "9595959272", status: 0 },
  { id: 403228, code: "1528", first_name: "दोधा", last_name: "आहिरे", name_en: "", email: null, mobile: "8446242484", status: 2 },
  { id: 403214, code: "83", first_name: "अशोक", last_name: "बोरसे", name_en: "", email: null, mobile: "9309917824", status: 0 },
  { id: 403246, code: "248", first_name: "साहेबराव", last_name: "निकम", name_en: "", email: null, mobile: "9665498617", status: 0 },
  { id: 403262, code: "141", first_name: "जगन्नाथ", last_name: "मानकर", name_en: "", email: null, mobile: "8459447586", status: 0 },
  { id: 403243, code: "69", first_name: "हिरामन", last_name: "निकम", name_en: "", email: null, mobile: "8806814049", status: 0 },
  { id: 403250, code: "1607", first_name: "संदीप शांताराम भामरे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403268, code: "183", first_name: "प्रकाश", last_name: "निकम", name_en: "", email: null, mobile: "", status: 2 },
  { id: 403237, code: "237", first_name: "काळु", last_name: "निकम", name_en: "", email: "", mobile: "8459173820", status: 0 },
  { id: 403247, code: "145", first_name: "नितिन", last_name: "निकम", name_en: "", email: null, mobile: "9225102419", status: 0 },
  { id: 403240, code: "1509", first_name: "भाऊसाहेब", last_name: "पवार", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403244, code: "57", first_name: "सुरेश निकम", last_name: "", name_en: "", email: null, mobile: "8856845119", status: 0 },
  { id: 403271, code: "1604", first_name: "शुभम", last_name: "शेवाळे", name_en: "", email: null, mobile: "", status: 2 },
  { id: 403242, code: "208", first_name: "सोनल", last_name: "निकम", name_en: "", email: null, mobile: "8999856719", status: 0 },
  { id: 403282, code: "1048", first_name: "भाऊसाहेब", last_name: "हि तोरवणे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403304, code: "191", first_name: "शरद", last_name: "पवार", name_en: "", email: null, mobile: "8788558446", status: 0 },
  { id: 403293, code: "53", first_name: "श्री भारत ज", last_name: "देवरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403301, code: "1601", first_name: "हिम्मत शेवाळे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403286, code: "177", first_name: "गणेश", last_name: "निकम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403289, code: "225", first_name: "सुनिल", last_name: "निकम", name_en: "", email: null, mobile: "9370988646", status: 0 },
  { id: 403300, code: "189", first_name: "दिलिप", last_name: "निकम", name_en: "", email: null, mobile: "9325252011", status: 2 },
  { id: 403311, code: "65", first_name: "श्री शिवाजी निकम", last_name: "", name_en: "", email: null, mobile: "9921514291", status: 0 },
  { id: 403319, code: "88", first_name: "शिवाजी दशरत", last_name: "देवरे", name_en: "", email: "", mobile: "8698334080", status: 0 },
  { id: 403295, code: "1524", first_name: "धोंडु", last_name: "सकाराम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403287, code: "155", first_name: "वसंत निकम", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403278, code: "181", first_name: "दिलिप", last_name: "देवरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403317, code: "184", first_name: "रुशिकेश .", last_name: "पवार", name_en: "", email: null, mobile: "7888183200", status: 0 },
  { id: 403331, code: "67", first_name: "दिपक", last_name: "गांगुरडे", name_en: "", email: null, mobile: "8626068285", status: 0 },
  { id: 403325, code: "124", first_name: "रविंद्र", last_name: "निकम", name_en: "", email: null, mobile: "9763289017", status: 0 },
  { id: 403321, code: "165", first_name: "खुशाल", last_name: "हिरे", name_en: "", email: null, mobile: "9922946052", status: 0 },
  { id: 403329, code: "1525", first_name: "कैलास", last_name: "जाधव", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403330, code: "193", first_name: "जितेंद्र", last_name: "निकम", name_en: "", email: null, mobile: "9823598856", status: 0 },
  { id: 403335, code: "1522", first_name: "विलास", last_name: "सुर्यवंशी", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403337, code: "112", first_name: "रोहित", last_name: "निकम", name_en: "", email: null, mobile: "9372546236", status: 0 },
  { id: 403332, code: "235", first_name: "संजय", last_name: "माळी", name_en: "", email: null, mobile: "9890152770", status: 0 },
  { id: 403540, code: "1500", first_name: "श्री गुरुदत्त दुध संकलन", last_name: "( दिघावे )", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403323, code: "1507", first_name: "रघूनाथ भामरे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403535, code: "80", first_name: "बारकु", last_name: "निकम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403553, code: "1037", first_name: "अशोक", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403586, code: "72", first_name: "दिलीप", last_name: "निकम", name_en: "", email: null, mobile: "8485892855", status: 0 },
  { id: 403555, code: "30", first_name: "साहेबराव", last_name: "निकम", name_en: "", email: null, mobile: "8999861454", status: 0 },
  { id: 403594, code: "1608", first_name: "मयूर महाले", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403583, code: "149", first_name: "विक्रम", last_name: "निकम", name_en: "", email: null, mobile: "7588095956", status: 0 },
  { id: 403558, code: "1606", first_name: "कैलास शांताराम", last_name: "भामरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403564, code: "92", first_name: "समाधान", last_name: "निकम", name_en: "", email: null, mobile: "9765024699", status: 0 },
  { id: 403625, code: "1527", first_name: "प्रदिप", last_name: "बच्छाव", name_en: "", email: null, mobile: "", status: 2 },
  { id: 403615, code: "106", first_name: "दगा चव्हाण", last_name: "", name_en: "", email: null, mobile: "9604427761", status: 2 },
  { id: 403636, code: "1602", first_name: "अक्षय आहिरे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403628, code: "1526", first_name: "ज्ञानेश्वर", last_name: "शेवाळे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403635, code: "68", first_name: "खुशाल मुठेकर", last_name: "", name_en: "", email: null, mobile: "9921897480", status: 0 },
  { id: 403619, code: "239", first_name: "माधू निकम", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403633, code: "17", first_name: "संदीप", last_name: "मानकर", name_en: "", email: null, mobile: "9850068502", status: 0 },
  { id: 403630, code: "62", first_name: "अंताजी", last_name: "भामरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403600, code: "71", first_name: "राजेंद्र", last_name: "निकम", name_en: "", email: null, mobile: "9011434304", status: 0 },
  { id: 403652, code: "1514", first_name: "नानु", last_name: "आहिरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403786, code: "19", first_name: "सुनिल", last_name: "बच्छाव", name_en: "", email: null, mobile: "7823095203", status: 0 },
  { id: 403814, code: "29", first_name: "गुलाब", last_name: "निकम", name_en: "", email: null, mobile: "9657049285", status: 0 },
  { id: 404183, code: "1521", first_name: "योगेश", last_name: "आहिरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403581, code: "1540", first_name: "रविंद्र", last_name: "आहिरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 404422, code: "60", first_name: "डिंगबर", last_name: "निकम", name_en: "", email: null, mobile: "7066272999", status: 0 },
  { id: 404486, code: "16", first_name: "गुलाब", last_name: "बाबा", name_en: "", email: null, mobile: "", status: 0 },
  { id: 404824, code: "52", first_name: "सागर", last_name: "निकम", name_en: "", email: null, mobile: "9049118533", status: 0 },
  { id: 404974, code: "41", first_name: "आनिल", last_name: "मोहिते", name_en: "", email: null, mobile: "9518977408", status: 0 },
  { id: 405091, code: "250", first_name: "मोठाभाऊ", last_name: "निकम", name_en: "", email: null, mobile: "", status: 2 },
  { id: 1084018, code: "115", first_name: "उमेश", last_name: "निकम", name_en: "", email: null, mobile: "8766913441", status: 0 },
  { id: 405622, code: "33", first_name: "शेखर", last_name: "निकम", name_en: "", email: null, mobile: "9370438564", status: 0 },
  { id: 405660, code: "1523", first_name: "भिकन", last_name: "पवार", name_en: "", email: null, mobile: "", status: 0 },
  { id: 406899, code: "3", first_name: "भावराव", last_name: "बाबा", name_en: "", email: null, mobile: "9860897876", status: 2 },
  { id: 409438, code: "236", first_name: "सुनिल", last_name: "निकम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 403648, code: "195", first_name: "श्री किशोर", last_name: "देवबा निकम", name_en: "", email: null, mobile: "9075806090", status: 0 },
  { id: 742488, code: "15", first_name: "जितु", last_name: "निकम", name_en: "", email: null, mobile: "", status: 0 },
  { id: 424447, code: "50", first_name: "प्रदिप पवार", last_name: "", name_en: "", email: null, mobile: "7745099532", status: 2 },
  { id: 428194, code: "18", first_name: "स्वप्निल", last_name: "पवार", name_en: "", email: null, mobile: "9699635476", status: 2 },
  { id: 450329, code: "28", first_name: "योगेश मोरे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435371, code: "1614", first_name: "श्री विनायक शेवाळे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435373, code: "1616", first_name: "श्रीसंतोष शेवाळे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435372, code: "1615", first_name: "श्री अनिल सोनवणे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435374, code: "1056", first_name: "भरत", last_name: "खैरनार", name_en: "", email: null, mobile: "7028732442", status: 0 },
  { id: 435375, code: "1060", first_name: "मधुकर", last_name: "तोरवणे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435382, code: "1620", first_name: "श्री पंकज", last_name: "अहिरे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435415, code: "1034", first_name: "इनुस", last_name: "मन्सुरी", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435379, code: "94", first_name: "समाधान र", last_name: "चव्हाण", name_en: "", email: null, mobile: "7083433495", status: 0 },
  { id: 435413, code: "1033", first_name: "लक्ष्मण", last_name: "तोरवणे", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435370, code: "1529", first_name: "श्री शंकर पानपाटील", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435401, code: "1022", first_name: "सोनु", last_name: "तोरवणे", name_en: "", email: null, mobile: "9870015052", status: 0 },
  { id: 435409, code: "1030", first_name: "विलास", last_name: "बच्छाव", name_en: "", email: null, mobile: "9503634905", status: 0 },
  { id: 435406, code: "1027", first_name: "महेश", last_name: "तोरवणे", name_en: "", email: null, mobile: "9766749415", status: 0 },
  { id: 435412, code: "1612", first_name: "देवबा शेवाळे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435405, code: "1026", first_name: "भाऊसाहेब", last_name: "तोरवणे", name_en: "", email: null, mobile: "7620700904", status: 0 },
  { id: 435390, code: "1624", first_name: "श्री गंगाधार शेवाळे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435404, code: "1025", first_name: "अशोक", last_name: "सोनवणे", name_en: "", email: null, mobile: "9511967961", status: 0 },
  { id: 435403, code: "1024", first_name: "दादा", last_name: "बेडते", name_en: "", email: null, mobile: "8459880803", status: 0 },
  { id: 435394, code: "1621", first_name: "श्री धनराज आहिरे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435377, code: "1617", first_name: "श्री शांताराम ठाकरे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435399, code: "1542", first_name: "राजेंद्र सोनवणे", last_name: "", name_en: "", email: null, mobile: "", status: 0 },
  { id: 435402, code: "1059", first_name: "रावसाहेब", last_name: "मोरे", name_en: "", email: null, mobile: "", status: 0 },
  ]
}

async function main() {
  console.log('🌱 Seeding Dabhadi users...\n')

  try {
    // Clear existing data
    console.log('Clearing existing data...')
    await prisma.transaction.deleteMany()
    await prisma.billItem.deleteMany()
    await prisma.bill.deleteMany()
    await prisma.feed.deleteMany()
    await prisma.user.deleteMany()
    console.log('✅ Existing data cleared\n')

    // Create users
    console.log(`Creating ${dabhadiUsersData.length} Dabhadi users...`)
    let created = 0
    let skipped = 0
    let activeCount = 0
    let inactiveCount = 0

    for (const userData of dabhadiUsersData) {
      try {
        // Build name from first_name and last_name
        const name = [userData.first_name, userData.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || userData.name_en || `User ${userData.code}`

        // Generate userCode: DAB-{code}
        const userCode = `DAB-${userData.code}`

        // Map status: All Dabhadi users should be active
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
            userType: 'Dabhadi',
            status,
          },
        })
        created++
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠ Skipped duplicate user code: DAB-${userData.code}`)
          skipped++
        } else {
          console.error(`❌ Error creating user DAB-${userData.code}:`, error.message)
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
    console.error('❌ Error seeding Dabhadi users:', error)
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

