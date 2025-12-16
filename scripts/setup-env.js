const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env')
const envExamplePath = path.join(process.cwd(), '.env.example')

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file from .env.example...')
  
  if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8')
    fs.writeFileSync(envPath, exampleContent)
    console.log('✅ .env file created!')
  } else {
    // Create a basic .env file
    const defaultEnv = `DATABASE_URL="mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0"
JWT_SECRET="your-secret-key-change-this-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`
    fs.writeFileSync(envPath, defaultEnv)
    console.log('✅ .env file created with default values!')
  }
  
  console.log('\n⚠️  Please update the DATABASE_URL in .env file with your MongoDB Atlas credentials!')
  console.log('   Format: mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0')
} else {
  // Check if DATABASE_URL exists
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  if (!envContent.includes('DATABASE_URL=')) {
    console.log('⚠️  DATABASE_URL not found in .env file!')
    console.log('\nAdding DATABASE_URL to .env file...')
    
    const updatedContent = envContent + 
      (envContent.endsWith('\n') ? '' : '\n') +
      'DATABASE_URL="mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0"\n'
    
    fs.writeFileSync(envPath, updatedContent)
    console.log('✅ DATABASE_URL added to .env file!')
    console.log('\n⚠️  Please update the DATABASE_URL with your actual MongoDB Atlas credentials!')
  } else {
    console.log('✅ .env file exists and contains DATABASE_URL')
    console.log('\nIf you\'re still getting errors, please check:')
    console.log('1. DATABASE_URL format is correct')
    console.log('2. MongoDB Atlas cluster is accessible')
    console.log('3. Network access is configured in MongoDB Atlas')
    console.log('4. Database user has proper permissions')
  }
}

  console.log('\nExample DATABASE_URL:')
  console.log('DATABASE_URL="mongodb+srv://Akshaya_Dairy_Feed_Database:YOUR_PASSWORD@cluster0.qrr3jlj.mongodb.net/akshaya_dairy?appName=Cluster0"')

