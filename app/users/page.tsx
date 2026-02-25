'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema, type UserInput } from '@/lib/validation'
import { apiRequest } from '@/lib/api'
import { LoadingSpinner, EditIcon, DeleteIcon, ViewIcon, AddIcon, PaymentIcon } from '@/components/Icons'
import { showToast } from '@/components/Toast'

interface User {
  id: string
  userCode: string
  name: string
  mobileNo: string
  address: string | null
  email: string | null
  userType: string
  status: string
  bills: Array<{
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }>
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([]) // Store all users for search
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false) // Prevent duplicate calls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all') // 'all', 'BMC', 'Dabhadi', 'Customer'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTypeFilter]) // Only refetch when filter changes

  const fetchUsers = async () => {
    if (isFetching) return // Prevent duplicate calls
    try {
      setIsFetching(true)
      const token = localStorage.getItem('token')
      const url = userTypeFilter !== 'all' ? `/api/users?userType=${userTypeFilter}` : '/api/users'
      const response = await apiRequest(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, true) // Use cache
      const data = await response.json()
      setAllUsers(data.users)
      setUsers(data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  // Search and filter functionality
  useEffect(() => {
    let filtered = allUsers

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.mobileNo.includes(searchQuery) ||
          (user.address && user.address.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setUsers(filtered)
    setCurrentPage(1)
  }, [searchQuery, allUsers])

  // Pagination
  const totalPages = Math.max(1, Math.ceil((users?.length || 0) / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = (users || []).slice(startIndex, endIndex)

  const handlePayment = async () => {
    if (!selectedUser || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      showToast('Please enter a valid payment amount', 'warning')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const totalPending = selectedUser.bills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
      const amount = parseFloat(paymentAmount)

      if (amount > totalPending) {
        showToast(`Payment amount cannot exceed pending amount of ₹${totalPending.toFixed(2)}`, 'error')
        return
      }

      // Get user's bills to find the bill ID
      const billsResponse = await apiRequest(`/api/bills?userId=${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const billsData = await billsResponse.json()
      const userBill = billsData.bills.find(
        (bill: any) => bill.pendingAmount > 0
      )

      if (!userBill) {
        showToast('No pending bills found for this user', 'warning')
        return
      }

      const paymentResponse = await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          billId: userBill.id,
          amount: amount,
          description: paymentDescription || `Payment for ${selectedUser.name}`,
        }),
        headers: { Authorization: `Bearer ${token}` },
      })

      if (paymentResponse.ok) {
        setPaymentModalOpen(false)
        setSelectedUser(null)
        setPaymentAmount('')
        setPaymentDescription('')
        await fetchUsers()
        showToast('Payment recorded successfully!', 'success')
      } else {
        const error = await paymentResponse.json()
        showToast(error.error || 'Failed to record payment', 'error')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      showToast('An error occurred', 'error')
    }
  }

  const onSubmit = async (data: UserInput) => {
    try {
      const token = localStorage.getItem('token')
      const isEditing = !!editingUser
      const url = isEditing ? `/api/users/${editingUser.id}` : '/api/users'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setIsModalOpen(false)
        reset()
        setEditingUser(null)
        fetchUsers()
        showToast(isEditing ? 'User updated successfully!' : 'User created successfully!', 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to save user', 'error')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      showToast('An error occurred', 'error')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    reset({
      name: user.name,
      mobileNo: user.mobileNo,
      address: user.address || '',
      email: user.email || '',
      userCode: user.userCode || '',
      userType: (user.userType as 'BMC' | 'Dabhadi' | 'Customer') || 'BMC',
      status: (user.status as 'active' | 'inactive') || 'active',
    })
    setIsModalOpen(true)
  }

  // Delete function commented out
  /*
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchUsers()
      } else {
        showToast('Failed to delete user', 'error')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }
  */

  const handleViewProfile = (userId: string) => {
    router.push(`/users/${userId}`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-slate-300">
            <LoadingSpinner />
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Users</h1>
          <button
            onClick={() => {
              setEditingUser(null)
              reset()
              setIsModalOpen(true)
            }}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <AddIcon />
            <span>Add User</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name, mobile, or address..."
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
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">
                    Code
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">
                    Name
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">
                    Mobile
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase hidden sm:table-cell">
                    Address
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">
                    Type
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">
                    Status
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-200 uppercase">
                    Pending
                  </th>
                  <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-200 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      {searchQuery || userTypeFilter !== 'all' ? 'No users found matching your filters' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const totalPending = user.bills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
                    return (
                      <tr key={user.id} className="hover:bg-slate-750">
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm font-medium text-blue-400">
                          {user.userCode || '-'}
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm font-medium text-white">
                          {user.name}
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-300">
                          {user.mobileNo}
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm text-slate-400 hidden sm:table-cell">
                          {user.address || '-'}
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.userType === 'BMC' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-purple-600 text-white'
                          }`}>
                            {user.userType || 'BMC'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token')
                                const newStatus = user.status === 'active' ? 'inactive' : 'active'
                                const response = await apiRequest(`/api/users/${user.id}`, {
                                  method: 'PUT',
                                  body: JSON.stringify({
                                    ...user,
                                    status: newStatus,
                                  }),
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                })
                                if (response.ok) {
                                  fetchUsers()
                                  showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success')
                                }
                              } catch (error) {
                                showToast('Failed to update status', 'error')
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.status === 'active'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm">
                          <span className={totalPending > 0 ? 'text-amber-400 font-semibold' : 'text-green-400'}>
                            ₹{totalPending.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-sm font-medium space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleViewProfile(user.id)}
                            className="p-1.5 sm:px-2 sm:py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="View"
                          >
                            <ViewIcon />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 sm:px-2 sm:py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          {totalPending > 0 && (
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setPaymentAmount(totalPending.toFixed(2))
                                setPaymentModalOpen(true)
                              }}
                              className="p-1.5 sm:px-2 sm:py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Pay Pending"
                            >
                              <PaymentIcon />
                            </button>
                          )}
                          {/* Delete button commented out */}
                          {/*
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1.5 sm:px-2 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <DeleteIcon />
                          </button>
                          */}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingUser(null)
            reset()
          }}
          title={editingUser ? 'Edit User' : 'Add User'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Mobile Number *
              </label>
              <input
                {...register('mobileNo')}
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
              {errors.mobileNo && (
                <p className="mt-1 text-sm text-red-400">{errors.mobileNo.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Address
              </label>
              <textarea
                {...register('address')}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-400">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {editingUser && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  User Code
                </label>
                <input
                  {...register('userCode')}
                  type="text"
                  readOnly
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                User Type *
              </label>
              <select
                {...register('userType')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="BMC">BMC</option>
                <option value="Dabhadi">Dabhadi</option>
                <option value="Customer">Customer</option>
              </select>
              {errors.userType && (
                <p className="mt-1 text-sm text-red-400">{errors.userType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Status *
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-400">{errors.status.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingUser(null)
                  reset()
                }}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Payment Modal */}
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedUser(null)
            setPaymentAmount('')
            setPaymentDescription('')
          }}
          title="Setup Payment"
        >
          <div className="space-y-4">
            {selectedUser && (
              <div className="bg-slate-700 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-300">
                  <strong>User:</strong> {selectedUser.name}
                </p>
                <p className="text-sm text-slate-300">
                  <strong>Mobile:</strong> {selectedUser.mobileNo}
                </p>
                <p className="text-sm text-amber-400 mt-2">
                  <strong>Total Pending:</strong> ₹
                  {selectedUser.bills.reduce((sum, bill) => sum + bill.pendingAmount, 0).toFixed(2)}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                placeholder="Payment description (optional)"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false)
                  setSelectedUser(null)
                  setPaymentAmount('')
                  setPaymentDescription('')
                }}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </Modal>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-4">
            <div className="text-sm text-slate-400">
              Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
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

