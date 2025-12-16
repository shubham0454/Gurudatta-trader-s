// Simple API test script using native fetch
const BASE_URL = 'http://localhost:3000'

async function testAPI(name, method, endpoint, body, token) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    
    // Check if response is PDF (binary)
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/pdf')) {
      const blob = await response.blob()
      if (response.ok) {
        console.log(`✅ ${name}: PASSED (PDF generated, size: ${blob.size} bytes)`)
        return { success: true, data: { type: 'pdf', size: blob.size } }
      } else {
        const text = await response.text()
        console.log(`❌ ${name}: FAILED (Status: ${response.status})`)
        return { success: false, data: text }
      }
    }
    
    const data = await response.json()

    if (response.ok) {
      console.log(`✅ ${name}: PASSED`)
      return { success: true, data }
    } else {
      console.log(`❌ ${name}: FAILED (Status: ${response.status})`)
      console.log(`   Error: ${data.error || JSON.stringify(data)}`)
      return { success: false, data }
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`)
    console.log(`   ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🧪 Testing All APIs...\n')
  console.log('='.repeat(50))

  // 1. Test Login
  console.log('\n1. Authentication APIs')
  console.log('-'.repeat(50))
  const loginResult = await testAPI(
    'Login',
    'POST',
    '/api/auth/login',
    {
      mobileNo: '1234567890',
      password: 'admin123',
    }
  )

  if (!loginResult.success || !loginResult.data.token) {
    console.log('\n❌ Cannot proceed without authentication token!')
    console.log('   Make sure server is running: npm run dev')
    return
  }

  const authToken = loginResult.data.token
  console.log(`   Token received: ${authToken.substring(0, 30)}...`)

  // 2. Test Users API
  console.log('\n2. Users APIs')
  console.log('-'.repeat(50))
  
  const usersList = await testAPI('Get All Users', 'GET', '/api/users', null, authToken)
  let testUserId = null
  if (usersList.success && usersList.data.users?.length > 0) {
    testUserId = usersList.data.users[0].id
    await testAPI('Get User by ID', 'GET', `/api/users/${testUserId}`, null, authToken)
  }

  // 3. Test Feeds API
  console.log('\n3. Feeds APIs')
  console.log('-'.repeat(50))
  
  const feedsList = await testAPI('Get All Feeds', 'GET', '/api/feeds', null, authToken)
  let testFeedId = null
  if (feedsList.success && feedsList.data.feeds?.length > 0) {
    testFeedId = feedsList.data.feeds[0].id
    await testAPI('Get Feed by ID', 'GET', `/api/feeds/${testFeedId}`, null, authToken)
  }

  // 4. Test Bills API
  console.log('\n4. Bills APIs')
  console.log('-'.repeat(50))
  
  const billsList = await testAPI('Get All Bills', 'GET', '/api/bills', null, authToken)
  let testBillId = null
  if (billsList.success && billsList.data.bills?.length > 0) {
    testBillId = billsList.data.bills[0].id
    await testAPI('Get Bill by ID', 'GET', `/api/bills/${testBillId}`, null, authToken)
  }

  // 5. Test Payments API
  console.log('\n5. Payments APIs')
  console.log('-'.repeat(50))
  
  if (testBillId && billsList.data.bills[0].pendingAmount > 0) {
    await testAPI(
      'Create Payment',
      'POST',
      '/api/payments',
      {
        billId: testBillId,
        amount: 100,
        description: 'Test payment',
      },
      authToken
    )
  } else {
    console.log('⏭️  Create Payment: SKIPPED (No pending bills)')
  }

  // 6. Test Dashboard API
  console.log('\n6. Dashboard APIs')
  console.log('-'.repeat(50))
  const dashboardResult = await testAPI('Get Dashboard Stats', 'GET', '/api/dashboard/stats', null, authToken)
  
  if (dashboardResult.success) {
    const stats = dashboardResult.data
    console.log(`   Today's Sales: ₹${stats.todaySales.toFixed(2)}`)
    console.log(`   Month Sales: ₹${stats.monthSales.toFixed(2)}`)
    console.log(`   Pending Amount: ₹${stats.pendingAmount.toFixed(2)}`)
    console.log(`   Total Users: ${stats.totalUsers}`)
    console.log(`   Total Feeds: ${stats.totalFeeds}`)
    console.log(`   Total Stock: ${stats.totalStock.toFixed(2)} kg`)
  }

  // 7. Test Reports API
  console.log('\n7. Reports APIs')
  console.log('-'.repeat(50))
  const reportResult = await testAPI('Generate PDF Report', 'GET', '/api/reports/pdf?type=monthly', null, authToken)
  if (reportResult.success) {
    console.log('   PDF generated successfully (binary data)')
  }

  // 8. Test Logout
  console.log('\n8. Logout API')
  console.log('-'.repeat(50))
  await testAPI('Logout', 'POST', '/api/auth/logout', null, authToken)

  console.log('\n' + '='.repeat(50))
  console.log('✅ API Testing Complete!')
  console.log('\n📊 Summary:')
  console.log('   All APIs have been tested')
  console.log('   Check the results above for any failures')
}

// Check if server is running
fetch(`${BASE_URL}/api/auth/login`, { method: 'POST', body: JSON.stringify({}) })
  .then(() => runTests().catch(console.error))
  .catch(() => {
    console.log('❌ Server is not running!')
    console.log('Please start the server first: npm run dev')
    console.log('Then run this test again: npm run test:api')
    process.exit(1)
  })

