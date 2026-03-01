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
  shopStock?: number
  godownStock?: number
}

interface BillItem {
  feedId: string
  quantity: number
  unitPrice: number
  storageLocation?: string
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
  const [isSubmitting, setIsSubmitting] = useState(false) // Prevent duplicate bill submissions
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
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all') // 'all', 'BMC', 'Dabhadi', 'Customer'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [userSearchQuery, setUserSearchQuery] = useState('') // For user search in bill creation
  const [userTypeFilterForSelect, setUserTypeFilterForSelect] = useState<string>('all') // For user type filter in bill creation
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)

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
      // Filter to show only active users, sorted by name
      const activeUsers = usersArray.filter((user: User) => !user.status || user.status === 'active')
      const sortedUsers = [...activeUsers].sort((a, b) => {
        // Sort by name alphabetically
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
      setUsers(sortedUsers)
      setFeeds(feedsArray)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      if (error.name === 'NetworkError' || error.message?.includes('Network Error')) {
        showToast('Network Error: No internet connection. Please check your connection and try again.', 'error')
      } else {
        showToast('Failed to load data. Please try again.', 'error')
      }
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
    setBillItems([...billItems, { feedId: '', quantity: 0, unitPrice: 0, storageLocation: 'godown' }])
  }

  const updateBillItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updated = [...billItems]
    updated[index] = { ...updated[index], [field]: value }
    
      // If feed changed, update unit price to default price and validate stock
    if (field === 'feedId') {
      const feed = feeds.find(f => f.id === value)
      if (feed) {
        updated[index].unitPrice = feed.defaultPrice
          // Keep existing storage location or default to godown
          const storageLocation = updated[index].storageLocation || 'godown'
          
          // Check if selected location has stock
          let availableStock = 0
          if (storageLocation === 'shop') {
            availableStock = feed.shopStock || 0
          } else if (storageLocation === 'godown') {
            availableStock = feed.godownStock || 0
          }
          
          // Fallback to old stock field if location stocks are 0
          if (availableStock === 0 && feed.stock > 0 && !feed.shopStock && !feed.godownStock) {
            availableStock = feed.stock
          }
          
          // If no stock in selected location, show warning and reset quantity
          if (availableStock === 0) {
            showToast(`No stock available for ${feed.name} in ${storageLocation}. Please select a different location or feed.`, 'warning')
            updated[index].quantity = 0
          } else {
            // Auto-set quantity to available stock if current quantity exceeds it
            if (updated[index].quantity > availableStock) {
              updated[index].quantity = availableStock
              showToast(`Quantity adjusted to available stock in ${storageLocation}: ${availableStock.toFixed(0)}`, 'info')
            }
          }
        }
      }
      
      // If storage location changed, validate stock for selected feed (if any)
      if (field === 'storageLocation') {
        const feed = feeds.find(f => f.id === updated[index].feedId)
        if (feed) {
          const newLocation = value as 'shop' | 'godown'
          let availableStock = 0
          
          if (newLocation === 'shop') {
            availableStock = feed.shopStock || 0
          } else if (newLocation === 'godown') {
            availableStock = feed.godownStock || 0
          }
          
          // Fallback to old stock field if location stocks are 0
          if (availableStock === 0 && feed.stock > 0 && !feed.shopStock && !feed.godownStock) {
            availableStock = feed.stock
          }
          
          // If no stock in new location, show warning and reset quantity
          if (availableStock === 0) {
            showToast(`No stock available for ${feed.name} in ${newLocation}. Please select a different location or feed.`, 'warning')
            updated[index].quantity = 0
          } else {
            // Auto-adjust quantity if it exceeds available stock
            if (updated[index].quantity > availableStock) {
              updated[index].quantity = availableStock
              showToast(`Quantity adjusted to available stock in ${newLocation}: ${availableStock.toFixed(0)}`, 'info')
            }
          }
        }
        // If no feed is selected, location can still be changed - this is allowed
    }
    
    // Validate quantity against stock based on item storage location
    if (field === 'quantity') {
      const feed = feeds.find(f => f.id === updated[index].feedId)
      if (feed) {
        const storageLocation = updated[index].storageLocation || 'godown'
        let availableStock = 0
        
        if (storageLocation === 'shop') {
          availableStock = feed.shopStock || 0
        } else if (storageLocation === 'godown') {
          availableStock = feed.godownStock || 0
        }
        
        // Fallback to old stock field if location stocks are 0
        if (availableStock === 0 && feed.stock > 0) {
          availableStock = feed.stock
        }
        
        if (parseFloat(value as string) > availableStock) {
          showToast(`Insufficient stock in ${storageLocation}. Available: ${availableStock.toFixed(0)}`, 'error')
          updated[index].quantity = availableStock
        }
      }
    }
    
    setBillItems(updated)
  }

  const removeBillItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index))
  }

  const handleCreateBill = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      showToast('Please wait, bill is being created...', 'warning')
      return
    }

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
      
      // Check stock availability based on item storage location
      const feed = feeds.find(f => f.id === item.feedId)
      if (feed) {
        const storageLocation = item.storageLocation || 'godown'
        let availableStock = 0
        
        if (storageLocation === 'shop') {
          availableStock = feed.shopStock || 0
        } else if (storageLocation === 'godown') {
          availableStock = feed.godownStock || 0
        }
        
        // Fallback to old stock field if location stocks are 0
        if (availableStock === 0 && feed.stock > 0) {
          availableStock = feed.stock
        }
        
        if (item.quantity > availableStock) {
          showToast(`Insufficient stock for ${feed.name} in ${storageLocation}. Available: ${availableStock.toFixed(0)}, Requested: ${item.quantity}`, 'error')
        return
        }
      }
    }

    try {
      setIsSubmitting(true) // Set submitting state
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
        } catch (error: any) {
          console.error('Error processing one-time customer:', error)
          if (error.name === 'NetworkError' || error.message?.includes('Network Error')) {
            showToast('Network Error: No internet connection. Please check your connection and try again.', 'error')
          } else {
          showToast('Failed to process one-time customer. Please try again.', 'error')
          }
          return
        }
      }
      
      const total = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const paidAmt = billStatus === 'paid' ? total : (billStatus === 'partial' ? parseFloat(billPaidAmount) || 0 : 0)
      
      // Use storageLocation from each item (already set in the form)
      const itemsWithLocation = billItems.map(item => ({
        ...item,
        storageLocation: item.storageLocation || 'godown', // Default to godown if not set
      }))
      
      const response = await apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          items: itemsWithLocation,
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
        // Handle duplicate bill error specifically
        if (response.status === 409 && error.duplicateBillNumber) {
          showToast(
            `Duplicate bill detected! A similar bill (${error.duplicateBillNumber}) was created recently. Please check the bills list.`,
            'error'
          )
        } else {
        showToast(error.error || 'Failed to create bill', 'error')
      }
      }
    } catch (error: any) {
      console.error('Error creating bill:', error)
      if (error.name === 'NetworkError' || error.message?.includes('Network Error')) {
        showToast('Network Error: No internet connection. Please check your connection and try again.', 'error')
      } else {
        showToast('An error occurred while creating the bill. Please try again.', 'error')
      }
    } finally {
      setIsSubmitting(false) // Reset submitting state
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
                setIsOneTimeCustomer(false)
                setNewUserDetails({ name: '', mobileNo: '', address: '', userType: 'BMC' })
                setOneTimeCustomerDetails({ name: '', mobileNo: '', address: '' })
                setBillItems([])
                setBillStatus('paid')
                setBillPaidAmount('0')
                setUserSearchQuery('')
                setUserTypeFilterForSelect('all')
                setIsUserDropdownOpen(false)
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
              <option value="Customer">Customer</option>
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
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Quantity</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Total</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">Pending</th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white font-medium">
                        {bill.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(0)}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-white">₹{bill.totalAmount.toFixed(2)}</td>
                      <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-amber-400">₹{bill.pendingAmount.toFixed(2)}</td>
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
            setUserSearchQuery('')
            setUserTypeFilterForSelect('all')
            setIsUserDropdownOpen(false)
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
                    setUserSearchQuery('')
                    setUserTypeFilterForSelect('all')
                    setIsUserDropdownOpen(false)
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
                    setUserSearchQuery('')
                    setUserTypeFilterForSelect('all')
                    setIsUserDropdownOpen(false)
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
                  
                  {/* User Type Filter */}
                  <div className="mb-2">
                    <select
                      value={userTypeFilterForSelect}
                      onChange={(e) => {
                        setUserTypeFilterForSelect(e.target.value)
                        setIsUserDropdownOpen(true)
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="BMC">BMC</option>
                      <option value="Dabhadi">Dabhadi</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </div>

                  {/* Searchable User Dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name or mobile number..."
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value)
                        setIsUserDropdownOpen(true)
                      }}
                      onFocus={() => setIsUserDropdownOpen(true)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
                    />
                    
                    {/* Selected User Display */}
                    {selectedUserId && !isUserDropdownOpen && (
                      <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-white">
                        {(() => {
                          const selectedUser = users.find(u => u.id === selectedUserId)
                          return selectedUser ? (
                            <div className="flex justify-between items-center">
                              <span>
                                {selectedUser.name} ({selectedUser.mobileNo}) - {selectedUser.userType || 'BMC'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserId('')
                                  setUserSearchQuery('')
                                }}
                                className="text-red-400 hover:text-red-300 text-xs ml-2"
                              >
                                ✕
                              </button>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}

                    {/* Dropdown List */}
                    {isUserDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {(() => {
                          // Filter users based on search query and type filter
                          const filteredUsers = users.filter((user) => {
                            const matchesType = userTypeFilterForSelect === 'all' || user.userType === userTypeFilterForSelect
                            const matchesSearch = 
                              userSearchQuery === '' ||
                              user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              user.mobileNo.includes(userSearchQuery) ||
                              (user.userType || 'BMC').toLowerCase().includes(userSearchQuery.toLowerCase())
                            return matchesType && matchesSearch
                          })

                          // Sort filtered users: active first, then inactive, both sorted by name
                          const sortedFilteredUsers = [...filteredUsers].sort((a, b) => {
                            const aStatus = a.status || 'active'
                            const bStatus = b.status || 'active'
                            
                            if (aStatus === 'active' && bStatus === 'inactive') {
                              return -1 // active comes first
                            }
                            if (aStatus === 'inactive' && bStatus === 'active') {
                              return 1 // active comes first
                            }
                            
                            // If same status, sort by name alphabetically
                            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                          })

                          if (sortedFilteredUsers.length === 0) {
                            return (
                              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                                No users found
                              </div>
                            )
                          }

                          return sortedFilteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUserId(user.id)
                                setUserSearchQuery('')
                                setIsUserDropdownOpen(false)
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-600 transition-colors ${
                                selectedUserId === user.id
                                  ? 'bg-blue-600 text-white'
                                  : 'text-white'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-slate-300">
                                    {user.mobileNo} - {user.userType || 'BMC'}
                                  </div>
                                </div>
                                {selectedUserId === user.id && (
                                  <span className="text-blue-300">✓</span>
                                )}
                              </div>
                            </button>
                          ))
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Click outside to close dropdown */}
                  {isUserDropdownOpen && (
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                  )}
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
                      <option value="Customer">Customer</option>
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

            <div className="w-full">
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
                      <div key={index} className="border border-slate-600 rounded-lg p-3 space-y-2 bg-slate-700/50 w-full">
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                          <div className="md:col-span-2">
                            <label className="block text-xs text-slate-400 mb-1">Select Feed *</label>
                      <select
                        value={item.feedId}
                        onChange={(e) => updateBillItem(index, 'feedId', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                      >
                        <option value="">Select Feed</option>
                              {feeds
                                .map((feed) => {
                                  const storageLocation = item.storageLocation || 'godown'
                                  const shopStock = feed.shopStock || 0
                                  const godownStock = feed.godownStock || 0
                                  const legacyStock = (feed.stock > 0 && !feed.shopStock && !feed.godownStock) ? feed.stock : 0
                                  
                                  // Show available stock for item's storage location
                                  let availableStock = 0
                                  if (storageLocation === 'shop') {
                                    availableStock = shopStock || (legacyStock > 0 && !feed.shopStock && !feed.godownStock ? legacyStock : 0)
                                  } else {
                                    availableStock = godownStock || (legacyStock > 0 && !feed.shopStock && !feed.godownStock ? legacyStock : 0)
                                  }
                                  
                                  // Show stock availability with warning if insufficient
                                  const stockText = availableStock > 0 
                                    ? `${storageLocation === 'shop' ? 'Shop' : 'Godown'} Stock: ${availableStock.toFixed(0)}`
                                    : `No stock in ${storageLocation === 'shop' ? 'Shop' : 'Godown'}`
                                  
                                  return (
                                    <option 
                                      key={feed.id} 
                                      value={feed.id}
                                      disabled={availableStock === 0 && legacyStock === 0}
                                    >
                                      {feed.name} {feed.brand ? `(${feed.brand})` : ''} - {feed.weight}kg | {stockText} | ₹{feed.defaultPrice.toFixed(2)} per bag
                          </option>
                                  )
                                })}
                      </select>
                          </div>
                          <div className="w-full">
                            <label className="block text-xs text-slate-400 mb-1">Stock Location *</label>
                            <select
                              value={item.storageLocation || 'godown'}
                              onChange={(e) => {
                                const newLocation = e.target.value as 'shop' | 'godown'
                                updateBillItem(index, 'storageLocation', newLocation)
                                // Clear feed selection when location changes (feeds will be filtered differently)
                                updateBillItem(index, 'feedId', '')
                                updateBillItem(index, 'quantity', 0)
                                updateBillItem(index, 'unitPrice', 0)
                              }}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm cursor-pointer"
                              style={{ appearance: 'auto' }}
                            >
                              <option value="shop">Shop</option>
                              <option value="godown">Godown</option>
                            </select>
                          </div>
                        </div>
                      {selectedFeed && (
                        <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-xs">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-slate-400">Weight:</span>
                              <span className="font-semibold ml-1 text-white">{selectedFeed.weight} kg</span>
                            </div>
                              <div>
                                <span className="text-slate-400">Price:</span>
                                <span className="font-semibold ml-1 text-white">₹{selectedFeed.defaultPrice.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Available:</span>
                              <span className={`font-semibold ml-1 ${selectedFeed.stock < 100 ? 'text-red-400' : 'text-green-400'}`}>
                                {selectedFeed.stock.toFixed(0)}
                              </span>
                            </div>
                            </div>
                            {((selectedFeed.shopStock || 0) > 0 || (selectedFeed.godownStock || 0) > 0) && (
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-800">
                                {(selectedFeed.shopStock || 0) > 0 && (
                            <div>
                                    <span className="text-slate-400">Shop Stock:</span>
                                    <span className={`font-semibold ml-1 ${(selectedFeed.shopStock || 0) < 50 ? 'text-red-400' : 'text-green-400'}`}>
                                      {(selectedFeed.shopStock || 0).toFixed(0)}
                                    </span>
                            </div>
                                )}
                                {(selectedFeed.godownStock || 0) > 0 && (
                                  <div>
                                    <span className="text-slate-400">Godown Stock:</span>
                                    <span className={`font-semibold ml-1 ${(selectedFeed.godownStock || 0) < 50 ? 'text-red-400' : 'text-green-400'}`}>
                                      {(selectedFeed.godownStock || 0).toFixed(0)}
                                    </span>
                          </div>
                                )}
                              </div>
                            )}
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
                                const storageLocation = item.storageLocation || 'godown'
                                const availableStock = selectedFeed 
                                  ? (storageLocation === 'shop' 
                                      ? (selectedFeed.shopStock || (selectedFeed.stock > 0 && !selectedFeed.shopStock && !selectedFeed.godownStock ? selectedFeed.stock : 0))
                                      : (selectedFeed.godownStock || (selectedFeed.stock > 0 && !selectedFeed.shopStock && !selectedFeed.godownStock ? selectedFeed.stock : 0)))
                                  : 0
                                if (selectedFeed && value > availableStock) {
                                  showToast(`Cannot add more than available stock in ${storageLocation}. Available: ${availableStock.toFixed(0)}`, 'error')
                                  updateBillItem(index, 'quantity', availableStock)
                              } else {
                                updateBillItem(index, 'quantity', value)
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0
                                const storageLocation = item.storageLocation || 'godown'
                                const availableStock = selectedFeed 
                                  ? (storageLocation === 'shop' 
                                      ? (selectedFeed.shopStock || (selectedFeed.stock > 0 && !selectedFeed.shopStock && !selectedFeed.godownStock ? selectedFeed.stock : 0))
                                      : (selectedFeed.godownStock || (selectedFeed.stock > 0 && !selectedFeed.shopStock && !selectedFeed.godownStock ? selectedFeed.stock : 0)))
                                  : 0
                                if (selectedFeed && value > availableStock) {
                                  showToast(`Quantity adjusted to available stock in ${storageLocation}: ${availableStock.toFixed(0)}`, 'warning')
                                  updateBillItem(index, 'quantity', availableStock)
                              }
                            }}
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm ${
                                selectedFeed && item.quantity > ((item.storageLocation || 'godown') === 'shop' ? (selectedFeed.shopStock || 0) : (selectedFeed.godownStock || 0)) ? 'border-red-500' : 'border-slate-600'
                            }`}
                            step="0.01"
                            min="0"
                              max={selectedFeed 
                                ? ((item.storageLocation || 'godown') === 'shop' 
                                    ? (selectedFeed.shopStock || (selectedFeed.stock > 0 && !selectedFeed.shopStock && !selectedFeed.godownStock ? selectedFeed.stock : 0))
                                    : (selectedFeed.godownStock || (selectedFeed.stock > 0 && !selectedFeed.shopStock && !selectedFeed.godownStock ? selectedFeed.stock : 0)))
                                : 0}
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

              {billItems.length > 0 && (
                <div className="mt-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <p className="text-sm font-medium text-white">
                    Grand Total: ₹{billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                  </p>
                </div>
              )}
              </div>
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
                  setUserSearchQuery('')
                  setUserTypeFilterForSelect('all')
                  setIsUserDropdownOpen(false)
                }}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBill}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Bill'}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                          <div className="md:col-span-2">
                            <label className="block text-xs text-slate-400 mb-1">Select Feed *</label>
                      <select
                        value={item.feedId}
                        onChange={(e) => updateBillItem(index, 'feedId', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm"
                      >
                        <option value="">Select Feed</option>
                              {feeds
                                .map((feed) => {
                                  const storageLocation = item.storageLocation || 'godown'
                                  const shopStock = feed.shopStock || 0
                                  const godownStock = feed.godownStock || 0
                                  const legacyStock = (feed.stock > 0 && !feed.shopStock && !feed.godownStock) ? feed.stock : 0
                                  
                                  // Show available stock for item's storage location
                                  let availableStock = 0
                                  if (storageLocation === 'shop') {
                                    availableStock = shopStock || (legacyStock > 0 && !feed.shopStock && !feed.godownStock ? legacyStock : 0)
                                  } else {
                                    availableStock = godownStock || (legacyStock > 0 && !feed.shopStock && !feed.godownStock ? legacyStock : 0)
                                  }
                                  
                                  // Show stock availability with warning if insufficient
                                  const stockText = availableStock > 0 
                                    ? `${storageLocation === 'shop' ? 'Shop' : 'Godown'} Stock: ${availableStock.toFixed(0)}`
                                    : `No stock in ${storageLocation === 'shop' ? 'Shop' : 'Godown'}`
                                  
                                  return (
                                    <option 
                                      key={feed.id} 
                                      value={feed.id}
                                      disabled={availableStock === 0 && legacyStock === 0}
                                    >
                                      {feed.name} {feed.brand ? `(${feed.brand})` : ''} - {feed.weight}kg | {stockText} | ₹{feed.defaultPrice.toFixed(2)} per bag
                          </option>
                                  )
                                })}
                      </select>
                          </div>
                          <div className="w-full">
                            <label className="block text-xs text-slate-400 mb-1">Stock Location *</label>
                            <select
                              value={item.storageLocation || 'godown'}
                              onChange={(e) => {
                                const newLocation = e.target.value as 'shop' | 'godown'
                                updateBillItem(index, 'storageLocation', newLocation)
                                // Clear feed selection when location changes (feeds will be filtered differently)
                                updateBillItem(index, 'feedId', '')
                                updateBillItem(index, 'quantity', 0)
                                updateBillItem(index, 'unitPrice', 0)
                              }}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white text-sm cursor-pointer"
                              style={{ appearance: 'auto' }}
                            >
                              <option value="shop">Shop</option>
                              <option value="godown">Godown</option>
                            </select>
                          </div>
                        </div>
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
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-800">
                            <div>
                              <span className="text-slate-400">Shop Stock:</span>
                              <span className={`font-semibold ml-1 ${(selectedFeed.shopStock || 0) < 50 ? 'text-red-400' : 'text-green-400'}`}>
                                {(selectedFeed.shopStock || 0).toFixed(0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Godown Stock:</span>
                              <span className={`font-semibold ml-1 ${(selectedFeed.godownStock || 0) < 50 ? 'text-red-400' : 'text-green-400'}`}>
                                {(selectedFeed.godownStock || 0).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedFeed && (
                        <p className="text-xs text-slate-400 mt-1">
                          Available in {item.storageLocation || 'godown'}: {
                            item.storageLocation === 'shop' 
                              ? (selectedFeed.shopStock || 0).toFixed(0)
                              : (selectedFeed.godownStock || 0).toFixed(0)
                          }
                        </p>
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
                            max={(() => {
                              if (!selectedFeed) return 0
                              const location = item.storageLocation || 'godown'
                              if (location === 'shop') return selectedFeed.shopStock || 0
                              if (location === 'godown') return selectedFeed.godownStock || 0
                              return selectedFeed.stock || 0
                            })()}
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

