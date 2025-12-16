'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { LoadingSpinner } from '@/components/Icons'
import { apiRequest } from '@/lib/api'

interface DashboardStats {
  todaySales: number
  monthSales: number
  pendingAmount: number
  totalUsers: number
  totalFeeds: number
  totalStock: number
  creditors: Array<{ id: string; name: string; mobileNo: string; totalPending: number }>
  debtors: number
  chartData: Array<{ date: string; sales: number }>
  feedSalesData: Array<{ name: string; value: number; totalPrice: number }>
}

type Period = 'today' | 'month' | 'year'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [period, setPeriod] = useState<Period>('month') // Default to month

  const fetchInitialStats = async () => {
    try {
      setInitialLoading(true)
      const token = localStorage.getItem('token')
      const response = await apiRequest(`/api/dashboard/stats?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, false)

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchChartData = async () => {
    try {
      setChartsLoading(true)
      const token = localStorage.getItem('token')
      const response = await apiRequest(`/api/dashboard/stats?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, false) // Don't use cache when period changes

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      // Only update chart-related data, keep other stats
      setStats(prevStats => {
        if (!prevStats) return data
        return {
          ...prevStats,
          chartData: data.chartData,
          feedSalesData: data.feedSalesData,
        }
      })
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setChartsLoading(false)
    }
  }

  // Initial load - fetch stats without period (will use default month)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchInitialStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only fetch once on mount

  // When period changes, only update chart data (skip on initial load)
  useEffect(() => {
    if (stats && !initialLoading) {
      // Only fetch if stats already loaded (not initial load)
      fetchChartData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

  if (initialLoading) {
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

  if (!stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">Failed to load dashboard data</div>
        </div>
      </Layout>
    )
  }

  const statCards = [
    {
      title: "Today's Sales",
      value: `₹${stats.todaySales.toFixed(2)}`,
      color: 'bg-blue-500',
      icon: '💰',
    },
    {
      title: 'This Month Sales',
      value: `₹${stats.monthSales.toFixed(2)}`,
      color: 'bg-green-500',
      icon: '📊',
    },
    {
      title: 'Pending Amount',
      value: `₹${stats.pendingAmount.toFixed(2)}`,
      color: 'bg-amber-500',
      icon: '⏳',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      color: 'bg-purple-500',
      icon: '👥',
    },
    {
      title: 'Total Feed Types',
      value: stats.totalFeeds.toString(),
      color: 'bg-indigo-500',
      icon: '🌾',
    },
    {
      title: 'Total Stock of Feed',
      value: stats.totalStock.toFixed(0),
      color: 'bg-teal-500',
      icon: '📦',
    },
  ]

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-slate-400 mb-1 truncate">{card.title}</p>
                  <p className="text-xl sm:text-2xl font-bold text-white truncate">{card.value}</p>
                </div>
                <div className={`${card.color} w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-lg sm:text-2xl flex-shrink-0 ml-2`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Sales Chart */}
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">Sales Chart</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod('today')}
                  disabled={chartsLoading}
                  className={`px-3 py-1 text-xs sm:text-sm rounded transition-opacity ${
                    period === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${chartsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  disabled={chartsLoading}
                  className={`px-3 py-1 text-xs sm:text-sm rounded transition-opacity ${
                    period === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${chartsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setPeriod('year')}
                  disabled={chartsLoading}
                  className={`px-3 py-1 text-xs sm:text-sm rounded transition-opacity ${
                    period === 'year'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${chartsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Year
                </button>
              </div>
            </div>
            {chartsLoading ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="flex items-center space-x-3 text-slate-300">
                  <LoadingSpinner />
                  <span className="text-sm">Updating chart...</span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ color: '#f1f5f9' }} />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Feed Sales Pie Chart */}
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">Top Selling Feeds</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod('today')}
                  disabled={chartsLoading}
                  className={`px-3 py-1 text-xs sm:text-sm rounded transition-opacity ${
                    period === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${chartsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  disabled={chartsLoading}
                  className={`px-3 py-1 text-xs sm:text-sm rounded transition-opacity ${
                    period === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${chartsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setPeriod('year')}
                  disabled={chartsLoading}
                  className={`px-3 py-1 text-xs sm:text-sm rounded transition-opacity ${
                    period === 'year'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${chartsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Year
                </button>
              </div>
            </div>
            {chartsLoading ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="flex items-center space-x-3 text-slate-300">
                  <LoadingSpinner />
                  <span className="text-sm">Updating chart...</span>
                </div>
              </div>
            ) : stats.feedSalesData && stats.feedSalesData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.feedSalesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.feedSalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} units (₹${props.payload.totalPrice.toFixed(2)})`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-1 max-h-32 overflow-y-auto">
                  {stats.feedSalesData.slice(0, 5).map((feed, index) => (
                    <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-slate-300 truncate">{feed.name}</span>
                      </div>
                      <span className="text-slate-400 ml-2">{feed.value} units</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                No feed sales data available
              </div>
            )}
          </div>

          {/* Sales Bar Chart - Commented Out */}
          {/* <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Sales (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ color: '#f1f5f9' }} />
                <Bar dataKey="sales" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div> */}
        </div>

        {/* Creditors */}
        {stats.creditors.length > 0 && (
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 border border-slate-700">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Creditors (Pending Payments)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300">Name</th>
                    <th className="text-left py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300">Mobile</th>
                    <th className="text-right py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-300">Pending Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.creditors.map((creditor) => (
                    <tr key={creditor.id} className="border-b border-slate-700">
                      <td className="py-2 px-2 sm:px-4 text-sm text-white">{creditor.name}</td>
                      <td className="py-2 px-2 sm:px-4 text-sm text-slate-400">{creditor.mobileNo}</td>
                      <td className="py-2 px-2 sm:px-4 text-right text-sm text-amber-400 font-semibold">
                        ₹{creditor.totalPending.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

