'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { LoadingSpinner } from '@/components/Icons'
import { apiRequest } from '@/lib/api'
import { showToast } from '@/components/Toast'

export default function ReportsPage() {
  const router = useRouter()
  const [reportType, setReportType] = useState<'today' | 'monthly' | 'yearly'>('monthly')
  const [userId, setUserId] = useState('')
  const [users, setUsers] = useState<Array<{ id: string; name: string; mobileNo: string; userType?: string }>>([])
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; mobileNo: string; userType?: string }>>([]) // Store all users for search
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all') // 'all', 'BMC', 'Dabhadi'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only fetch once on mount

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await apiRequest('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, true) // Use cache
      
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status)
        setUsers([])
        return
      }
      
      const data = await response.json()
      const usersList = Array.isArray(data.users) ? data.users : []
      // Filter to show only active users
      const activeUsers = usersList.filter((user: any) => !user.status || user.status === 'active')
      setAllUsers(activeUsers)
      setUsers(activeUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      setAllUsers([])
      setUsers([])
    }
  }

  const handleGeneratePDF = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        type: reportType,
      })
      if (userId) {
        params.append('userId', userId)
      }

      const response = await fetch(`/api/reports/pdf?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sales-report-${reportType}-${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast('PDF report generated successfully!', 'success')
      } else {
        showToast('Failed to generate PDF', 'error')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('An error occurred', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Generate sales reports in PDF format</p>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'today' | 'monthly' | 'yearly')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="today">Today</option>
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Filter by User (Optional)
                </label>
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
                {userId && !isUserDropdownOpen && (
                  <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-white">
                    {(() => {
                      const selectedUser = allUsers.find(u => u.id === userId)
                      return selectedUser ? (
                        <div className="flex justify-between items-center">
                          <span>
                            {selectedUser.name} ({selectedUser.mobileNo}) - {selectedUser.userType || 'BMC'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUserId('')
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
                      // Filter users based on search query and user type filter
                      const filteredUsers = allUsers.filter((user) => {
                        const matchesType = userTypeFilter === 'all' || user.userType === userTypeFilter
                        const matchesSearch = 
                          userSearchQuery === '' ||
                          user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          user.mobileNo.includes(userSearchQuery) ||
                          (user.userType || 'BMC').toLowerCase().includes(userSearchQuery.toLowerCase())
                        return matchesType && matchesSearch
                      })

                      if (filteredUsers.length === 0) {
                        return (
                          <div className="px-4 py-3 text-sm text-slate-400 text-center">
                            No users found
                          </div>
                        )
                      }

                      return filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setUserId(user.id)
                            setUserSearchQuery('')
                            setIsUserDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-600 transition-colors ${
                            userId === user.id
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
                            {userId === user.id && (
                              <span className="text-blue-300">✓</span>
                            )}
                          </div>
                        </button>
                      ))
                    })()}
                  </div>
                )}

                {/* Click outside to close dropdown */}
                {isUserDropdownOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserDropdownOpen(false)}
                  />
                )}
              </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  User Type
                </label>
                <select
                  value={userTypeFilter}
                  onChange={(e) => {
                    setUserTypeFilter(e.target.value)
                    setUserId('') // Clear user selection when filter changes
                    setUserSearchQuery('')
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                >
                  <option value="all">All Users</option>
                  <option value="BMC">BMC</option>
                  <option value="Dabhadi">Dabhadi</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading && <LoadingSpinner />}
              <span>{loading ? 'Generating PDF...' : 'Generate PDF Report'}</span>
            </button>
          </div>
        </div>

        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-300 mb-2">Report Information</h3>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Today: Shows all bills created today</li>
            <li>• This Month: Shows all bills created this month</li>
            <li>• This Year: Shows all bills created this year</li>
            <li>• You can filter by a specific user or generate for all users</li>
            <li>• The PDF includes summary statistics and detailed bill information</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}

