const fs = require('fs')
const path = require('path')
const readline = require('readline')

const envPath = path.join(process.cwd(), '.env')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function updateEnv() {
  console.log('🔧 Updating .env file...\n')
  
  // Get MongoDB Atlas credentials
  console.log('MongoDB Atlas Database Configuration:')
  const dbUser = await question('Enter MongoDB username (default: Akshaya_Dairy_Feed_Database): ') || 'Akshaya_Dairy_Feed_Database'
  const dbPassword = await question('Enter MongoDB password: ')
  
  if (!dbPassword) {
    console.log('\n❌ Password is required!')
    rl.close()
    process.exit(1)
  }
  
  const clusterName = await question('Enter cluster name (default: cluster0.qrr3jlj): ') || 'cluster0.qrr3jlj'
  const dbName = await question('Enter database name (default: akshaya_dairy): ') || 'akshaya_dairy'
  const appName = await question('Enter app name (default: Cluster0): ') || 'Cluster0'
  
  // Generate JWT secret
  const jwtSecret = await question('Enter JWT secret (or press Enter to generate): ') || 
    `jwt-secret-${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  const appUrl = await question('Enter app URL (default: http://localhost:3000): ') || 'http://localhost:3000'
  
  // Build DATABASE_URL for MongoDB Atlas (database name must be included)
  const databaseUrl = `mongodb+srv://${dbUser}:${dbPassword}@${clusterName}.mongodb.net/${dbName}?appName=${appName}`
  
  // Create .env content
  const envContent = `DATABASE_URL="${databaseUrl}"
JWT_SECRET="${jwtSecret}"
NEXT_PUBLIC_APP_URL="${appUrl}"
`
  
  // Write to file
  fs.writeFileSync(envPath, envContent)
  
  console.log('\n✅ .env file updated successfully!')
  console.log('\n📝 Configuration saved:')
  console.log(`   Cluster: ${clusterName}.mongodb.net`)
  console.log(`   User: ${dbUser}`)
  console.log(`   JWT Secret: ${jwtSecret.substring(0, 20)}...`)
  console.log(`   App URL: ${appUrl}`)
  
  console.log('\n⚠️  Important:')
  console.log('1. Make sure MongoDB Atlas cluster is running')
  console.log('2. Configure network access in MongoDB Atlas (add your IP)')
  console.log('3. Ensure database user has read/write permissions')
  console.log('4. Then run: npm run db:generate')
  console.log('5. Then run: npm run db:push')
  
  rl.close()
}

updateEnv().catch(err => {
  console.error('Error:', err)
  rl.close()
  process.exit(1)
})

