const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env')

console.log('🔧 Fixing DATABASE_URL in .env file...\n')

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!')
  console.log('Please run: npm run setup:env')
  process.exit(1)
}

// Read .env file
let envContent = fs.readFileSync(envPath, 'utf8')

// Check if DATABASE_URL exists
if (!envContent.includes('DATABASE_URL=')) {
  console.log('❌ DATABASE_URL not found in .env file!')
  process.exit(1)
}

// Extract current DATABASE_URL
const urlMatch = envContent.match(/DATABASE_URL="([^"]+)"/)
if (!urlMatch) {
  console.log('❌ Could not parse DATABASE_URL from .env file')
  process.exit(1)
}

const currentUrl = urlMatch[1]
console.log('Current DATABASE_URL:')
console.log(`  ${currentUrl}\n`)

// Check if database name is already included
if (currentUrl.includes('.mongodb.net/') && !currentUrl.includes('.mongodb.net/?')) {
  // Check if it has a database name
  const dbNameMatch = currentUrl.match(/\.mongodb\.net\/([^?]+)/)
  if (dbNameMatch && dbNameMatch[1]) {
    console.log('✅ DATABASE_URL already includes database name!')
    console.log(`   Database: ${dbNameMatch[1]}\n`)
    process.exit(0)
  }
}

// Fix the URL - convert PostgreSQL to MongoDB or add database name
let fixedUrl = currentUrl

// If it's a PostgreSQL URL, convert to MongoDB
if (fixedUrl.startsWith('postgresql://')) {
  console.log('⚠️  Detected PostgreSQL connection string. Converting to MongoDB...\n')
  // Extract password from PostgreSQL URL if possible, otherwise use placeholder
  const pgMatch = fixedUrl.match(/postgresql:\/\/([^:]+):([^@]+)@/)
  const password = pgMatch ? pgMatch[2] : 'YOUR_PASSWORD'
  
  // Use MongoDB Atlas connection string
  fixedUrl = `mongodb+srv://Akshaya_Dairy_Feed_Database:${password}@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0`
  console.log('⚠️  Using placeholder password. Please update with your actual MongoDB password!\n')
} else if (fixedUrl.includes('.mongodb.net/?')) {
  // Replace .mongodb.net/? with .mongodb.net/akshaya_dairy?
  fixedUrl = fixedUrl.replace('.mongodb.net/?', '.mongodb.net/akshaya_dairy?')
} else if (fixedUrl.includes('.mongodb.net') && !fixedUrl.includes('.mongodb.net/')) {
  // Add database name before query params
  fixedUrl = fixedUrl.replace('.mongodb.net', '.mongodb.net/akshaya_dairy')
} else if (fixedUrl.endsWith('.mongodb.net')) {
  // Add database name at the end
  fixedUrl = fixedUrl + '/akshaya_dairy'
}

console.log('Fixed DATABASE_URL:')
console.log(`  ${fixedUrl}\n`)

// Update .env file
const updatedContent = envContent.replace(
  /DATABASE_URL="[^"]+"/,
  `DATABASE_URL="${fixedUrl}"`
)

fs.writeFileSync(envPath, updatedContent)

console.log('✅ .env file updated successfully!')
console.log('\n📝 Next steps:')
console.log('   1. Verify the DATABASE_URL in .env file')
console.log('   2. Run: npm run db:push')
console.log('   3. Run: npm run seed:admin')

