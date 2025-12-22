/**
 * Helper script to import Dabhadi users JSON data
 * 
 * Usage:
 * 1. Paste your complete JSON array into a file called 'dabhadi-raw-data.json' in this directory
 * 2. Run: node scripts/import-dabhadi-data.js
 * 3. The script will convert and save it to 'dabhadi-users-data.json'
 */

const fs = require('fs')
const path = require('path')

// This script can process both Dabhadi and BMC data
const inputFile = process.argv[2] || path.join(__dirname, 'dabhadi-users-data.json')
const outputFile = process.argv[3] || path.join(__dirname, 'dabhadi-users-data.json')

try {
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.log('❌ File not found: dabhadi-users-data.json')
    console.log('\n📝 Instructions:')
    console.log('1. Create a file called "dabhadi-users-data.json" in the scripts folder')
    console.log('2. Paste your complete JSON array into that file')
    console.log('3. Run this script again: node scripts/import-dabhadi-data.js')
    process.exit(1)
  }
  
  // Check if file is already processed (has transformed format)
  const fileContent = fs.readFileSync(inputFile, 'utf-8')
  const parsed = JSON.parse(fileContent)
  
  // If it's already in the correct format (has only the fields we need), skip transformation
  if (parsed.length > 0 && parsed[0].hasOwnProperty('id') && !parsed[0].hasOwnProperty('number_prefix')) {
    console.log('✅ File is already in the correct format!')
    console.log(`📊 Found ${parsed.length} entries`)
    console.log(`\n🚀 You can now run: npm run seed:dabhadi`)
    process.exit(0)
  }

  const rawData = fs.readFileSync(inputFile, 'utf-8')
  const jsonData = JSON.parse(rawData)

  if (!Array.isArray(jsonData)) {
    console.log('❌ Error: JSON data must be an array')
    process.exit(1)
  }

  // Transform the data to the format needed
  const transformedData = jsonData.map(item => ({
    id: item.id,
    code: item.code || item.number?.toString() || '',
    first_name: item.first_name || '',
    last_name: item.last_name || '',
    name_en: item.name_en || '',
    email: item.email || null,
    mobile: item.mobile || '',
    status: item.status || 0,
  }))

  // Save to output file
  fs.writeFileSync(outputFile, JSON.stringify(transformedData, null, 2), 'utf-8')

  console.log(`✅ Successfully converted ${transformedData.length} entries`)
  console.log(`📁 Saved to: ${outputFile}`)
  console.log(`\n📊 Statistics:`)
  
  const active = transformedData.filter(u => u.status !== 0 && u.status !== 2).length
  const inactive = transformedData.filter(u => u.status === 0 || u.status === 2).length
  
  console.log(`   Active: ${active}`)
  console.log(`   Inactive: ${inactive}`)
  console.log(`\n🚀 Now run: npm run seed:dabhadi`)

} catch (error) {
  console.error('❌ Error:', error.message)
  if (error instanceof SyntaxError) {
    console.error('   Make sure your JSON is valid!')
  }
  process.exit(1)
}

