// Use native fetch (Node.js 18+)
// @ts-ignore
const fetch = globalThis.fetch

const BASE_URL = 'http://localhost:3000'
let authToken = ''

// Test data
let testUserId = ''
let testFeedId = ''
let testBillId = ''

async function testAPI(name: string, method: string, endpoint: string, body?: any, token?: string) {
  try {
    const options: any = {
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
    const data = await response.json()

    if (response.ok) {
      console.log(`✅ ${name}: PASSED`)
      return { success: true, data }
    } else {
      console.log(`❌ ${name}: FAILED`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`)
      return { success: false, data }
    }
  } catch (error: any) {
    console.log(`❌ ${name}: ERROR`)
    console.log(`   ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🧪 Testing All APIs...\n')
  console.log('=' .repeat(50))

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

  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token
    console.log(`   Token received: ${authToken.substring(0, 20)}...`)
  } else {
    console.log('\n❌ Cannot proceed without authentication token!')
    return
  }

  // 2. Test Users API
  console.log('\n2. Users APIs')
  console.log('-'.repeat(50))
  
  const usersList = await testAPI('Get All Users', 'GET', '/api/users', undefined, authToken)
  if (usersList.success && usersList.data.users?.length > 0) {
    testUserId = usersList.data.users[0].id
  }

  const createUser = await testAPI(
    'Create User',
    'POST',
    '/api/users',
    {
      name: 'Test User',
      mobileNo: '9999999999',
      address: 'Test Address',
      email: 'test@example.com',
    },
    authToken
  )

  if (createUser.success) {
    testUserId = createUser.data.user.id
  }

  if (testUserId) {
    await testAPI('Get User by ID', 'GET', `/api/users/${testUserId}`, undefined, authToken)
    await testAPI(
      'Update User',
      'PUT',
      `/api/users/${testUserId}`,
      {
        name: 'Updated Test User',
        mobileNo: '9999999999',
        address: 'Updated Address',
      },
      authToken
    )
  }

  // 3. Test Feeds API
  console.log('\n3. Feeds APIs')
  console.log('-'.repeat(50))
  
  const feedsList = await testAPI('Get All Feeds', 'GET', '/api/feeds', undefined, authToken)
  if (feedsList.success && feedsList.data.feeds?.length > 0) {
    testFeedId = feedsList.data.feeds[0].id
  }

  const createFeed = await testAPI(
    'Create Feed',
    'POST',
    '/api/feeds',
    {
      name: 'Test Feed',
      brand: 'Test Brand',
      weight: 25,
      defaultPrice: 1000,
      stock: 100,
    },
    authToken
  )

  if (createFeed.success) {
    testFeedId = createFeed.data.feed.id
  }

  if (testFeedId) {
    await testAPI('Get Feed by ID', 'GET', `/api/feeds/${testFeedId}`, undefined, authToken)
    await testAPI(
      'Update Feed',
      'PUT',
      `/api/feeds/${testFeedId}`,
      {
        name: 'Updated Test Feed',
        brand: 'Updated Brand',
        weight: 25,
        defaultPrice: 1100,
        stock: 150,
      },
      authToken
    )
  }

  // 4. Test Bills API
  console.log('\n4. Bills APIs')
  console.log('-'.repeat(50))
  
  const billsList = await testAPI('Get All Bills', 'GET', '/api/bills', undefined, authToken)
  if (billsList.success && billsList.data.bills?.length > 0) {
    testBillId = billsList.data.bills[0].id
  }

  // Get a user and feed for creating bill
  const users = await testAPI('Get Users for Bill', 'GET', '/api/users', undefined, authToken)
  const feeds = await testAPI('Get Feeds for Bill', 'GET', '/api/feeds', undefined, authToken)

  if (users.success && feeds.success && users.data.users?.length > 0 && feeds.data.feeds?.length > 0) {
    const createBill = await testAPI(
      'Create Bill',
      'POST',
      '/api/bills',
      {
        userId: users.data.users[0].id,
        items: [
          {
            feedId: feeds.data.feeds[0].id,
            quantity: 1,
            unitPrice: feeds.data.feeds[0].defaultPrice,
          },
        ],
      },
      authToken
    )

    if (createBill.success) {
      testBillId = createBill.data.bill.id
    }
  }

  if (testBillId) {
    await testAPI('Get Bill by ID', 'GET', `/api/bills/${testBillId}`, undefined, authToken)
  }

  // 5. Test Payments API
  console.log('\n5. Payments APIs')
  console.log('-'.repeat(50))
  
  if (testBillId) {
    await testAPI(
      'Create Payment',
      'POST',
      '/api/payments',
      {
        billId: testBillId,
        amount: 500,
        description: 'Test payment',
      },
      authToken
    )
  }

  // 6. Test Dashboard API
  console.log('\n6. Dashboard APIs')
  console.log('-'.repeat(50))
  await testAPI('Get Dashboard Stats', 'GET', '/api/dashboard/stats', undefined, authToken)

  // 7. Test Reports API
  console.log('\n7. Reports APIs')
  console.log('-'.repeat(50))
  await testAPI('Generate PDF Report (Today)', 'GET', '/api/reports/pdf?type=today', undefined, authToken)

  // 8. Test Logout
  console.log('\n8. Logout API')
  console.log('-'.repeat(50))
  await testAPI('Logout', 'POST', '/api/auth/logout', undefined, authToken)

  console.log('\n' + '='.repeat(50))
  console.log('✅ API Testing Complete!')
}

// Check if server is running
fetch(`${BASE_URL}/api/auth/login`, { method: 'POST' })
  .then(() => {
    runTests().catch(console.error)
  })
  .catch(() => {
    console.log('❌ Server is not running!')
    console.log('Please start the server first: npm run dev')
    process.exit(1)
  })

