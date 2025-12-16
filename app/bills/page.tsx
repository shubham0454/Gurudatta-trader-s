'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { apiRequest } from '@/lib/api'
import { showToast } from '@/components/Toast'

interface User {
  id: string
  name: string
  mobileNo: string
  userType?: string
  status?: string
}

interface Feed {
  id: string
  name: string
  brand: string | null
  weight: number
  defaultPrice: number
  stock: number
}

interface BillItem {
  feedId: string
  quantity: number
  unitPrice: number
}

interface Bill {
  id: string
  billNumber: string
  user: User
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  status: string
  createdAt: string
  items: Array<{
    feed: Feed
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export default function BillsPage() {
  const router = useRouter()

  const [bills, setBills] = useState<Bill[]>([])
  const [allBills, setAllBills] = useState<Bill[]>([]) // Store all bills for search
  const [users, setUsers] = useState<User[]>([])
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false) // Prevent duplicate calls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuickBillOpen, setIsQuickBillOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isNewUser, setIsNewUser] = useState(false) // Toggle between existing user and new user
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(false) // One-time customer (no user creation)
  const [newUserDetails, setNewUserDetails] = useState({ name: '', mobileNo: '', address: '', userType: 'BMC' })
  const [oneTimeCustomerDetails, setOneTimeCustomerDetails] = useState({ name: '', mobileNo: '', address: '' })
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [billStatus, setBillStatus] = useState<string>('paid') // pending, partial, paid - default to paid
  const [billPaidAmount, setBillPaidAmount] = useState<string>('0') // Amount paid if status is partial or paid
  const [quickBillCustomer, setQuickBillCustomer] = useState({ name: '', mobileNo: '', address: '' })
  const [quickBillStatus, setQuickBillStatus] = useState<string>('pending')
  const [quickBillPaidAmount, setQuickBillPaidAmount] = useState<string>('0')
  const [searchQuery, setSearchQuery] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all') // 'all', 'BMC', 'Dabhadi'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only fetch once on mount

  const fetchData = async () => {
    if (isFetching) return // Prevent duplicate calls
    try {
      setIsFetching(true)
      const token = localStorage.getItem('token')
      const [billsRes, usersRes, feedsRes] = await Promise.all([
        apiRequest('/api/bills', {
          headers: { Authorization: `Bearer ${token}` },
        }, true), // Use cache
        apiRequest('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        }, true), // Use cache
        apiRequest('/api/feeds', {
          headers: { Authorization: `Bearer ${token}` },
        }, true), // Use cache
      ])

      const billsData = await billsRes.json()
      const usersData = await usersRes.json()
      const feedsData = await feedsRes.json()

      const billsArray = Array.isArray(billsData?.bills) ? billsData.bills : []
      const usersArray = Array.isArray(usersData?.users) ? usersData.users : []
      const feedsArray = Array.isArray(feedsData?.feeds) ? feedsData.feeds : []

      setAllBills(billsArray)
      setBills(billsArray)
      // Filter to show only active users
      setUsers(usersArray.filter((user: User) => !user.status || user.status === 'active'))
      setFeeds(feedsArray)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  // Search and filter functionality
  useEffect(() => {
    let filtered = allBills

    // Filter by user type
    if (userTypeFilter !== 'all') {
      filtered = filtered.filter((bill) => bill.user.userType === userTypeFilter)
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.user.mobileNo.includes(searchQuery)
      )
    }

    setBills(filtered)
    setCurrentPage(1)
  }, [searchQuery, userTypeFilter, allBills])

  // Pagination
  const totalPages = Math.max(1, Math.ceil((bills?.length || 0) / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBills = (bills || []).slice(startIndex, endIndex)

  // Auto-update paidAmount when items change and status is 'paid'
  useEffect(() => {
    if (billStatus === 'paid' && billItems.length > 0) {
      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      setBillPaidAmount(total.toFixed(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billItems, billStatus])

  const addBillItem = () => {
    setBillItems([...billItems, { feedId: '', quantity: 0, unitPrice: 0 }])
  }

  const updateBillItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updated = [...billItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // If feed changed, update unit price to default price
    if (field === 'feedId') {
      const feed = feeds.find(f => f.id === value)
      if (feed) {
        updated[index].unitPrice = feed.defaultPrice
      }
    }
    
    // Validate quantity against stock
    if (field === 'quantity') {
      const feed = feeds.find(f => f.id === updated[index].feedId)
      if (feed && parseFloat(value as string) > feed.stock) {
        showToast(`You cannot add more quantity than available stock. Available: ${feed.stock.toFixed(0)}`, 'error')
        updated[index].quantity = feed.stock
      }
    }
    
    setBillItems(updated)
  }

  const removeBillItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index))
  }

  const handleCreateBill = async () => {
    // Validate user selection
    if (!isNewUser && !isOneTimeCustomer && !selectedUserId) {
      showToast('Please select a user, create a new user, or enter one-time customer details', 'warning')
      return
    }
    
    if (isNewUser && (!newUserDetails.name || !newUserDetails.mobileNo)) {
      showToast('Please fill in customer name and mobile number', 'warning')
      return
    }
    
    if (isOneTimeCustomer && (!oneTimeCustomerDetails.name || !oneTimeCustomerDetails.mobileNo)) {
      showToast('Please fill in customer name and mobile number for one-time customer', 'warning')
      return
    }

    if (billItems.length === 0) {
      showToast('Please add at least one item', 'warning')
      return
    }

    // Validate items and stock
    for (const item of billItems) {
      if (!item.feedId || item.quantity <= 0 || item.unitPrice < 0) {
        showToast('Please fill all item fields correctly', 'warning')
        return
      }
      
      // Check stock availability
      const feed = feeds.find(f => f.id === item.feedId)
      if (feed && item.quantity > feed.stock) {
        showToast(`Insufficient stock for ${feed.name}. Available: ${feed.stock.toFixed(0)}, Requested: ${item.quantity}`, 'error')
        return
      }
    }

    try {
      const token = localStorage.getItem('token')
      let userId = selectedUserId
      
      // If new user, create user first
      if (isNewUser) {
        try {
          const userRes = await apiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify({
              name: newUserDetails.name,
              mobileNo: newUserDetails.mobileNo,
              address: newUserDetails.address || undefined,
              userType: newUserDetails.userType,
            }),
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!userRes.ok) {
            const error = await userRes.json()
            showToast(error.error || 'Failed to create customer', 'error')
            return
          }

          const userData = await userRes.json()
          userId = userData.user.id
          showToast('Customer created successfully!', 'success')
        } catch (error) {
          console.error('Error creating user:', error)
          showToast('Failed to create customer. Please try again.', 'error')
          return
        }
      }
      
      // If one-time customer, create a temporary user (will be used only for this bill)
      if (isOneTimeCustomer) {
        try {
          const userRes = await apiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify({
              name: oneTimeCustomerDetails.name,
              mobileNo: oneTimeCustomerDetails.mobileNo,
              address: oneTimeCustomerDetails.address || undefined,
              userType: 'BMC', // Default for one-time customers
            }),
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!userRes.ok) {
            const error = await userRes.json()
            showToast(error.error || 'Failed to process one-time customer', 'error')
            return
          }

          const userData = await userRes.json()
          userId = userData.user.id
        } catch (error) {
          console.error('Error processing one-time customer:', error)
          showToast('Failed to process one-time customer. Please try again.', 'error')
          return
        }
      }
      
      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const paidAmt = billStatus === 'paid' ? total : (billStatus === 'partial' ? parseFloat(billPaidAmount) || 0 : 0)
      
      const response = await apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          items: billItems,
          status: billStatus,
          paidAmount: paidAmt,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setIsModalOpen(false)
        setSelectedUserId('')
        setIsNewUser(false)
        setIsOneTimeCustomer(false)
        setNewUserDetails({ name: '', mobileNo: '', address: '', userType: 'BMC' })
        setOneTimeCustomerDetails({ name: '', mobileNo: '', address: '' })
        setBillItems([])
        setBillStatus('paid')
        setBillPaidAmount('0')
        // Refresh all data to show updated stock
        await fetchData()
        showToast('Bill created successfully! Stock has been updated.', 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to create bill', 'error')
      }
    } catch (error) {
      console.error('Error creating bill:', error)
      showToast('An error occurred while creating the bill', 'error')
    }
  }

  const handleViewBill = (billId: string) => {
    router.push(`/bills/${billId}`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-slate-300">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Bills</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setSelectedUserId('')
                setIsNewUser(false)
                setNewUserDetails({ name: '', mobileNo: '', address: '', userType: 'BMC' })
                setBillItems([])
                setBillStatus('paid')
                setBillPaidAmount('0')
                setIsModalOpen(true)
              }}
              className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto"
            >
              + Create Bill
            </button>
            {/* Quick Bill: Create a bill for a walk-in customer without adding them to the system first. */}
            {/* <button
              onClick={() => {
                setSelectedUserId('')
                setBillItems([])
                setQuickBillStatus('pending')
                setQuickBillPaidAmount('0')
                setIsQuickBillOpen(true)
              }}
              className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 text-sm sm:text-base w-full sm:w-auto"
            >
              ⚡ Quick Bill
            </button> */}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by bill number, customer name, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
            />
            <select
              value={userTypeFilter}
              onChange={(e) => {
                setUserTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            >
              <option value="all">All Users</option>
              <option value="BMC">BMC</option>
              <option value="Dabhadi">Dabhadi</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Bill #</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">User</th>
                  {/* <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Type</th> */}
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden sm:table-cell">Date</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Total</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden lg:table-cell">Paid</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Pending</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Status</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      {searchQuery || userTypeFilter !== 'all' ? 'No bills found matching your filters' : 'No bills found'}
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-750">
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm font-medium text-white">{bill.billNumber}</td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white">
                        {bill.user.name}
                        <span className="block text-xs text-slate-400 sm:hidden">{bill.user.mobileNo}</span>
                      </td>
                      {/* <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (bill.user.userType || 'BMC') === 'BMC' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-purple-600 text-white'
                        }`}>
                          {bill.user.userType || 'BMC'}
                        </span>
                      </td> */}
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300 hidden sm:table-cell">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white">₹{bill.totalAmount.toFixed(2)}</td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-green-400 hidden lg:table-cell">₹{bill.paidAmount.toFixed(2)}</td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-amber-400">₹{bill.pendingAmount.toFixed(2)}</td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bill.status === 'paid'
                              ? 'bg-green-900/50 text-green-300'
                              : bill.status === 'partial'
                              ? 'bg-amber-900/50 text-amber-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-sm">
                        <button
                          onClick={() => handleViewBill(bill.id)}
                          className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
                          title="View"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedUserId('')
            setBillItems([])
          }}
          title="Create Bill"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUser(false)
                    setIsOneTimeCustomer(false)
                    setSelectedUserId('')
                    setNewUserDetails({ name: '', mobileNo: '', address: '', userType: 'BMC' })
                    setOneTimeCustomerDetails({ name: '', mobileNo: '', address: '' })
                  }}
                  className={`px-3 py-1 rounded text-sm ${!isNewUser && !isOneTimeCustomer ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  Existing User
                </button>
                {/* <button
                  type="button"
                  onClick={() => {
                    setIsNewUser(true)
                    setIsOneTimeCustomer(false)
                    setSelectedUserId('')
                    setOneTimeCustomerDetails({ name: '', mobileNo: '', address: '' })
                  }}
                  className={`px-3 py-1 rounded text-sm ${isNewUser && !isOneTimeCustomer ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  New User
                </button> */}
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUser(false)
                    setIsOneTimeCustomer(true)
                    setSelectedUserId('')
                    setNewUserDetails({ name: '', mobileNo: '', address: '', userType: 'BMC' })
                  }}
                  className={`px-3 py-1 rounded text-sm ${isOneTimeCustomer ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  One-Time Customer
                </button>
              </div>
              
              {!isNewUser && !isOneTimeCustomer ? (
                <>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Select User *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.mobileNo}) - {user.userType || 'BMC'}
                      </option>
                    ))}
                  </select>
                </>
              ) : isNewUser ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={newUserDetails.name}
                      onChange={(e) => setNewUserDetails({ ...newUserDetails, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={newUserDetails.mobileNo}
                      onChange={(e) => setNewUserDetails({ ...newUserDetails, mobileNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Address (Optional)
                    </label>
                    <textarea
                      value={newUserDetails.address}
                      onChange={(e) => setNewUserDetails({ ...newUserDetails, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                      placeholder="Enter address (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      User Type *
                    </label>
                    <select
                      value={newUserDetails.userType}
                      onChange={(e) => setNewUserDetails({ ...newUserDetails, userType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    >
                      <option value="BMC">BMC</option>
                      <option value="Dabhadi">Dabhadi</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                    <p className="text-sm text-green-300">
                      💡 <strong>One-Time Customer:</strong> Enter customer details for this bill only. Customer will not be saved to the system.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={oneTimeCustomerDetails.name}
                      onChange={(e) => setOneTimeCustomerDetails({ ...oneTimeCustomerDetails, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-slate-400"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={oneTimeCustomerDetails.mobileNo}
                      onChange={(e) => setOneTimeCustomerDetails({ ...oneTimeCustomerDetails, mobileNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-slate-400"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Address (Optional)
                    </label>
                    <textarea
                      value={oneTimeCustomerDetails.address}
                      onChange={(e) => setOneTimeCustomerDetails({ ...oneTimeCustomerDetails, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-slate-400"
                      placeholder="Enter address (optional)"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Bill Items *
                </label>
                <button
                  type="button"
                  onClick={addBillItem}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3">
                {billItems.map((item, index) => {
                  const selectedFeed = feeds.find(f => f.id === item.feedId)
                  return (
                    <div key={index} className="border border-slate-600 rounded-lg p-3 space-y-2 bg-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Item {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeBillItem(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <select
                        value={item.feedId}
                        onChange={(e) => updateBillItem(index, 'feedId', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                      >
                        <option value="">Select Feed</option>
                        {feeds.map((feed) => (
                          <option key={feed.id} value={feed.id}>
                            {feed.name} {feed.brand ? `(${feed.brand})` : ''} - {feed.weight}kg | Stock: {feed.stock.toFixed(0)} | ₹{feed.defaultPrice.toFixed(2)} per bag
                          </option>
                        ))}
                      </select>
                      {selectedFeed && (
                        <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-xs">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-slate-400">Weight:</span>
                              <span className="font-semibold ml-1 text-white">{selectedFeed.weight} kg</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Available:</span>
                              <span className={`font-semibold ml-1 ${selectedFeed.stock < 100 ? 'text-red-400' : 'text-green-400'}`}>
                                {selectedFeed.stock.toFixed(0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Price:</span>
                              <span className="font-semibold ml-1 text-white">₹{selectedFeed.defaultPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              if (selectedFeed && value > selectedFeed.stock) {
                                showToast(`Cannot add more than available stock. Available: ${selectedFeed.stock.toFixed(0)}`, 'error')
                                updateBillItem(index, 'quantity', selectedFeed.stock)
                              } else {
                                updateBillItem(index, 'quantity', value)
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              if (selectedFeed && value > selectedFeed.stock) {
                                showToast(`Quantity adjusted to available stock: ${selectedFeed.stock.toFixed(0)}`, 'warning')
                                updateBillItem(index, 'quantity', selectedFeed.stock)
                              }
                            }}
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm ${
                              selectedFeed && item.quantity > selectedFeed.stock ? 'border-red-500' : 'border-slate-600'
                            }`}
                            step="0.01"
                            min="0"
                            max={selectedFeed?.stock || 0}
                          />
                          {selectedFeed && item.quantity > selectedFeed.stock && (
                            <p className="text-xs text-red-400 mt-1">
                              ⚠️ Available: {selectedFeed.stock.toFixed(0)}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Unit Price (₹)</label>
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateBillItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                            step="0.01"
                            min="0"
                          />
                          {selectedFeed && (
                            <p className="text-xs text-slate-400 mt-1">
                              Default: ₹{selectedFeed.defaultPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.quantity > 0 && item.unitPrice > 0 && (
                        <p className="text-sm text-slate-300">
                          Total: ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {billItems.length > 0 && (
                <div className="mt-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <p className="text-sm font-medium text-white">
                    Grand Total: ₹{billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Bill Status and Payment */}
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Bill Status *
                </label>
                <select
                  value={billStatus}
                  onChange={(e) => {
                    setBillStatus(e.target.value)
                    if (e.target.value === 'pending') {
                      setBillPaidAmount('0')
                    } else if (e.target.value === 'paid') {
                      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                      setBillPaidAmount(total.toFixed(2))
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {(billStatus === 'partial' || billStatus === 'paid') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Paid Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={billPaidAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      setBillPaidAmount(value)
                      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                      if (parseFloat(value) >= total) {
                        setBillStatus('paid')
                      } else if (parseFloat(value) > 0) {
                        setBillStatus('partial')
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    step="0.01"
                    min="0"
                    max={billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)}
                  />
                  {billItems.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Total: ₹{billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedUserId('')
                  setIsNewUser(false)
                  setIsOneTimeCustomer(false)
                  setNewUserDetails({ name: '', mobileNo: '', address: '', userType: 'BMC' })
                  setOneTimeCustomerDetails({ name: '', mobileNo: '', address: '' })
                  setBillItems([])
                  setBillStatus('paid')
                  setBillPaidAmount('0')
                }}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Bill
              </button>
            </div>
          </div>
        </Modal>

        {/* Quick Bill: Create a bill for a walk-in customer without adding them to the system first. */}
        {false && (
        <Modal
          isOpen={isQuickBillOpen}
          onClose={() => {
            setIsQuickBillOpen(false)
            setQuickBillCustomer({ name: '', mobileNo: '', address: '' })
            setBillItems([])
          }}
          title="⚡ Quick Bill - Direct Sale"
        >
          <div className="space-y-4">
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
              <p className="text-sm text-amber-300">
                💡 <strong>Quick Bill:</strong> Create a bill for a walk-in customer without adding them to the system first.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                value={quickBillCustomer.name}
                onChange={(e) => setQuickBillCustomer({ ...quickBillCustomer, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                value={quickBillCustomer.mobileNo}
                onChange={(e) => setQuickBillCustomer({ ...quickBillCustomer, mobileNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                placeholder="Enter mobile number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Address (Optional)
              </label>
              <textarea
                value={quickBillCustomer.address}
                onChange={(e) => setQuickBillCustomer({ ...quickBillCustomer, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                placeholder="Enter address (optional)"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Bill Items *
                </label>
                <button
                  type="button"
                  onClick={addBillItem}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3">
                {billItems.map((item, index) => {
                  const selectedFeed = feeds.find(f => f.id === item.feedId)
                  return (
                    <div key={index} className="border border-slate-600 rounded-lg p-3 space-y-2 bg-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">Item {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeBillItem(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <select
                        value={item.feedId}
                        onChange={(e) => updateBillItem(index, 'feedId', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                      >
                        <option value="">Select Feed</option>
                        {feeds.map((feed) => (
                          <option key={feed.id} value={feed.id}>
                            {feed.name} {feed.brand ? `(${feed.brand})` : ''} - {feed.weight}kg | Stock: {feed.stock.toFixed(0)} | ₹{feed.defaultPrice.toFixed(2)} per bag
                          </option>
                        ))}
                      </select>
                      {selectedFeed && (
                        <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-xs">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-slate-400">Weight:</span>
                              <span className="font-semibold ml-1 text-white">{selectedFeed.weight} kg</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Available:</span>
                              <span className={`font-semibold ml-1 ${selectedFeed.stock < 100 ? 'text-red-400' : 'text-green-400'}`}>
                                {selectedFeed.stock.toFixed(0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Price:</span>
                              <span className="font-semibold ml-1 text-white">₹{selectedFeed.defaultPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateBillItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                            step="0.01"
                            min="0"
                            max={selectedFeed?.stock || 0}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Unit Price (₹)</label>
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateBillItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                            step="0.01"
                            min="0"
                          />
                          {selectedFeed && (
                            <p className="text-xs text-slate-400 mt-1">
                              Default: ₹{selectedFeed.defaultPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.quantity > 0 && item.unitPrice > 0 && (
                        <p className="text-sm text-slate-300">
                          Total: ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {billItems.length > 0 && (
                <div className="mt-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <p className="text-sm font-medium text-white">
                    Grand Total: ₹{billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Bill Status *
                </label>
                <select
                  value={quickBillStatus}
                  onChange={(e) => {
                    setQuickBillStatus(e.target.value)
                    if (e.target.value === 'pending') {
                      setQuickBillPaidAmount('0')
                    } else if (e.target.value === 'paid') {
                      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                      setQuickBillPaidAmount(total.toFixed(2))
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {(quickBillStatus === 'partial' || quickBillStatus === 'paid') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Paid Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={quickBillPaidAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      setQuickBillPaidAmount(value)
                      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                      if (parseFloat(value) >= total) {
                        setQuickBillStatus('paid')
                      } else if (parseFloat(value) > 0) {
                        setQuickBillStatus('partial')
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    step="0.01"
                    min="0"
                    max={billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)}
                  />
                  {billItems.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Total: ₹{billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsQuickBillOpen(false)
                  setQuickBillCustomer({ name: '', mobileNo: '', address: '' })
                  setBillItems([])
                  setQuickBillStatus('pending')
                  setQuickBillPaidAmount('0')
                }}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!quickBillCustomer.name || !quickBillCustomer.mobileNo || billItems.length === 0) {
                    showToast('Please fill customer details and add at least one item', 'warning')
                    return
                  }

                  // Validate items
                  for (const item of billItems) {
                    if (!item.feedId || item.quantity <= 0 || item.unitPrice < 0) {
                      showToast('Please fill all item fields correctly', 'warning')
                      return
                    }
                  }

                  try {
                    const token = localStorage.getItem('token')
                    
                    // First create user
                    const userRes = await apiRequest('/api/users', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: quickBillCustomer.name,
                        mobileNo: quickBillCustomer.mobileNo,
                        address: quickBillCustomer.address || undefined,
                      }),
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    })

                    if (!userRes.ok) {
                      const error = await userRes.json()
                      showToast(error.error || 'Failed to create customer', 'error')
                      return
                    }

                    const userData = await userRes.json()

                    // Then create bill
                    const paidAmt = parseFloat(quickBillPaidAmount) || 0
                    const billRes = await apiRequest('/api/bills', {
                      method: 'POST',
                      body: JSON.stringify({
                        userId: userData.user.id,
                        items: billItems,
                        status: quickBillStatus,
                        paidAmount: paidAmt,
                      }),
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    })

                    if (billRes.ok) {
                      setIsQuickBillOpen(false)
                      setQuickBillCustomer({ name: '', mobileNo: '', address: '' })
                      setBillItems([])
                      setQuickBillStatus('pending')
                      setQuickBillPaidAmount('0')
                      // Refresh all data to show updated stock
                      await fetchData()
                      showToast('Quick bill created successfully! Stock has been updated.', 'success')
                    } else {
                      const error = await billRes.json()
                      showToast(error.error || 'Failed to create bill', 'error')
                    }
                  } catch (error) {
                    console.error('Error creating quick bill:', error)
                    showToast('An error occurred', 'error')
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Quick Bill
              </button>
            </div>
          </div>
        </Modal>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
            <div className="text-sm text-slate-400">
              Showing {startIndex + 1} to {Math.min(endIndex, bills.length)} of {bills.length} bills
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

