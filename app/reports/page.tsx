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
  const [users, setUsers] = useState<Array<{ id: string; name: string; mobileNo: string }>>([])
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
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error('Error fetching users:', error)
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Filter by User (Optional)
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="">All Users</option>
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.mobileNo})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading users...</option>
                )}
              </select>
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

