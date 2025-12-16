const fs = require('fs')
const path = require('path')
require('dotenv').config()

const envPath = path.join(process.cwd(), '.env')

console.log('🔍 Checking environment configuration...\n')

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!')
  console.log('\nCreating .env file...')
  
  const defaultEnv = `DATABASE_URL="postgresql://postgres:password@localhost:5432/akshaya_dairy?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production-$(Date.now())"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`
  fs.writeFileSync(envPath, defaultEnv)
  console.log('✅ .env file created!')
  console.log('\n⚠️  Please update DATABASE_URL with your PostgreSQL credentials!')
  process.exit(1)
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8')
console.log('✅ .env file exists\n')

// Check for DATABASE_URL
const hasDatabaseUrl = envContent.includes('DATABASE_URL=')
const databaseUrl = process.env.DATABASE_URL

if (!hasDatabaseUrl || !databaseUrl) {
  console.log('❌ DATABASE_URL not found or empty in .env file!\n')
  
  // Try to add it
  if (!hasDatabaseUrl) {
    console.log('Adding DATABASE_URL to .env file...')
    const updatedContent = envContent + 
      (envContent.endsWith('\n') ? '' : '\n') +
      'DATABASE_URL="postgresql://postgres:password@localhost:5432/akshaya_dairy?schema=public"\n'
    fs.writeFileSync(envPath, updatedContent)
    console.log('✅ DATABASE_URL added!\n')
  }
  
  console.log('⚠️  Please update DATABASE_URL with your actual PostgreSQL credentials!')
  console.log('\nExample format:')
  console.log('DATABASE_URL="postgresql://username:password@localhost:5432/akshaya_dairy?schema=public"')
  console.log('\nSteps:')
  console.log('1. Open .env file')
  console.log('2. Replace username, password, and database name with your PostgreSQL credentials')
  console.log('3. Make sure PostgreSQL is running')
  console.log('4. Create the database: CREATE DATABASE akshaya_dairy;')
  process.exit(1)
}

// Validate DATABASE_URL format
if (!databaseUrl.startsWith('postgresql://')) {
  console.log('❌ DATABASE_URL format is incorrect!')
  console.log('Current value:', databaseUrl.substring(0, 20) + '...')
  console.log('\nExpected format: postgresql://username:password@host:port/database')
  process.exit(1)
}

console.log('✅ DATABASE_URL is set')
console.log('   Format:', databaseUrl.substring(0, 30) + '...' + databaseUrl.substring(databaseUrl.length - 20))

// Check other required variables
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret.includes('change-this')) {
  console.log('\n⚠️  JWT_SECRET should be changed for production!')
}

console.log('\n✅ Environment configuration looks good!')
console.log('\nNext steps:')
console.log('1. Make sure PostgreSQL is running')
console.log('2. Create the database: CREATE DATABASE akshaya_dairy;')
console.log('3. Run: npm run db:push')

